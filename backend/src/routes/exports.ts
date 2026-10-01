import { createRouter } from "../lib/router.js";
import { z } from "zod";
import { authenticate, requireUser } from "../middleware/auth.js";
import { parseBody } from "../middleware/validate.js";
import { AppError } from "../lib/errors.js";
import { requireDb } from "../lib/supabase.js";
import { generateExport, SUPPORTED_EXPORTS } from "../services/exports/index.js";
import { MATRIX_COLUMNS } from "./matrix.js";
import { fromRow, type SourceRow } from "../services/sources/sourcesStore.js";
import { formatCitation } from "../services/citation/formatter.js";
import type { ExportFormat } from "../types/index.js";
import type { RankedSource } from "../services/research/orchestrator.js";
import type { LibraryExportItem } from "../services/exports/csv.js";

export const exportsRouter = createRouter();

exportsRouter.use(authenticate);

const requestSchema = z.object({
  kind: z.enum(["research", "library", "matrix", "citations"]),
  format: z.enum(["docx", "pdf", "csv", "bibtex", "ris"]),
  /** Pesquisa: id do job; Biblioteca/Matriz: ids correspondentes. */
  jobId: z.string().uuid().nullish(),
  matrixId: z.string().uuid().nullish(),
  savedSourceIds: z.array(z.string().uuid()).max(500).optional(),
  projectId: z.string().uuid().nullish(),
  title: z.string().trim().min(1).max(300).default("Exportação AcadBot"),
  citationStyle: z.enum(["apa7", "abnt"]).default("apa7"),
});

/** Pesquisa: resultados a partir do job em memória (ou da base de dados). */
async function loadResearchResults(userId: string, jobId: string): Promise<RankedSource[]> {
  const { jobManager } = await import("../services/research/jobManager.js");
  const record = jobManager.get(jobId);
  if (record && record.userId === userId) return record.results;

  const db = requireDb();
  const { data, error } = await db
    .from("research_results")
    .select("rank,relevance_score,relevance,source:sources(*)")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .order("rank", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as Array<{ relevance: RankedSource["relevance"]; source: SourceRow }>)
    .filter((row) => row.source !== null)
    .map((row) => ({
      source: fromRow(row.source),
      relevance: row.relevance,
    }));
}

/** Biblioteca/citações: fontes guardadas, com estado, notas e tags. */
async function loadLibraryItems(userId: string, filters: { savedSourceIds?: string[]; projectId?: string | null }): Promise<LibraryExportItem[]> {
  const db = requireDb();
  let builder = db
    .from("saved_sources")
    .select("id,status,notes,project_id,source:sources(*)")
    .eq("user_id", userId);
  if (filters.savedSourceIds?.length) builder = builder.in("id", filters.savedSourceIds);
  if (filters.projectId) builder = builder.eq("project_id", filters.projectId);

  const { data, error } = await builder;
  if (error) throw AppError.internal("Não foi possível carregar as fontes para exportação.");

  const rows = (data ?? []) as unknown as Array<{
    id: string;
    status: string | null;
    notes: string | null;
    project_id: string | null;
    source: SourceRow | null;
  }>;
  const projectIds = [...new Set(rows.map((r) => r.project_id).filter((id): id is string => Boolean(id)))];
  const projectTitles = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data: projects } = await db.from("projects").select("id,title").in("id", projectIds);
    for (const project of projects ?? []) projectTitles.set(project.id as string, project.title as string);
  }

  return rows
    .filter((row) => row.source !== null)
    .map((row) => ({
      source: fromRow(row.source as SourceRow),
      status: row.status,
      notes: row.notes,
      projectTitle: row.project_id ? (projectTitles.get(row.project_id) ?? null) : null,
    }));
}

/** Matriz: linhas prontas para exportação (dataset). */
async function loadMatrix(userId: string, matrixId: string): Promise<{
  title: string;
  rows: Array<Record<string, string | number | null>>;
}> {
  const db = requireDb();
  const { data: matrix, error } = await db
    .from("literature_matrices")
    .select("title")
    .eq("id", matrixId)
    .eq("user_id", userId)
    .single();
  if (error || !matrix) throw AppError.notFound("Matriz não encontrada.");

  const { data: entries } = await db
    .from("literature_entries")
    .select("author,year,title,theme,objective,methodology,sample,variables,results,limitations")
    .eq("matrix_id", matrixId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  return {
    title: (matrix.title as string) ?? "Matriz de literatura",
    rows: (entries ?? []).map((entry) => {
      const row: Record<string, string | number | null> = {};
      for (const column of MATRIX_COLUMNS) {
        const value = (entry as Record<string, unknown>)[column.key];
        row[column.key] = typeof value === "number" ? value : ((value as string | null) ?? null);
      }
      return row;
    }),
  };
}

/** POST /api/exports — gera e devolve o ficheiro (DOCX, PDF, CSV, BibTeX, RIS). */
exportsRouter.post("/", async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(requestSchema, req.body);

  let title = input.title;
  let results: RankedSource[] | undefined;
  let libraryItems: LibraryExportItem[] | undefined;
  let matrixRows: Array<Record<string, string | number | null>> | undefined;
  let matrixColumns = MATRIX_COLUMNS;
  const meta: string[] = [`Gerado em ${new Date().toLocaleString("pt-PT")}`];
  let rowCount = 0;

  if (input.kind === "research") {
    if (!input.jobId) throw AppError.badRequest("Indica a pesquisa (jobId) a exportar.");
    results = await loadResearchResults(user.id, input.jobId);
    if (results.length === 0) {
      throw AppError.notFound(
        "Não há resultados disponíveis para esta pesquisa. Reabre a pesquisa e tenta novamente.",
      );
    }
    rowCount = results.length;
    const topic = results[0]?.source ? title : title;
    title = topic;
    meta.push(`Fontes: ${results.length}`, "Relevância apresentada como estimativa heurística (não é métrica científica).");
  } else if (input.kind === "library" || input.kind === "citations") {
    libraryItems = await loadLibraryItems(user.id, {
      savedSourceIds: input.savedSourceIds,
      projectId: input.projectId ?? null,
    });
    if (libraryItems.length === 0) throw AppError.notFound("Não há fontes na biblioteca para exportar.");
    rowCount = libraryItems.length;
    meta.push(`Fontes: ${libraryItems.length}`);
    if (input.kind === "citations") {
      // Exportação de citações: acrescenta a referência formatada no estilo escolhido.
      for (const item of libraryItems) {
        const citation = formatCitation(item.source, input.citationStyle);
        item.notes = [item.notes, citation.full].filter(Boolean).join(" | ");
      }
      meta.push(`Estilo de citação: ${input.citationStyle === "apa7" ? "APA 7" : "ABNT"}`);
    }
  } else {
    if (!input.matrixId) throw AppError.badRequest("Indica a matriz (matrixId) a exportar.");
    const matrix = await loadMatrix(user.id, input.matrixId);
    title = matrix.title;
    matrixRows = matrix.rows;
    matrixColumns = MATRIX_COLUMNS;
    rowCount = matrix.rows.length;
    if (rowCount === 0) throw AppError.notFound("A matriz ainda não tem fontes para exportar.");
    meta.push(`Fontes: ${rowCount}`);
  }

  const file = await generateExport({
    kind: input.kind,
    format: input.format as ExportFormat,
    title,
    ...(results ? { results } : {}),
    ...(libraryItems ? { libraryItems } : {}),
    ...(matrixRows ? { matrixRows, matrixColumns } : {}),
    meta,
  });

  // Registo da exportação (best-effort) e do uso.
  const db = requireDb();
  await db.from("exports").insert({
    user_id: user.id,
    kind: input.kind,
    format: input.format,
    file_name: file.fileName,
    row_count: rowCount,
    filters: { jobId: input.jobId ?? null, matrixId: input.matrixId ?? null, projectId: input.projectId ?? null },
  });

  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
  res.setHeader("Content-Length", String(file.content.byteLength));
  res.send(file.content);
});

/** GET /api/exports — formatos suportados e histórico de exportações. */
exportsRouter.get("/", async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  const { data } = await db
    .from("exports")
    .select("id,kind,format,file_name,row_count,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  res.json({ supportedFormats: SUPPORTED_EXPORTS, exports: data ?? [] });
});

