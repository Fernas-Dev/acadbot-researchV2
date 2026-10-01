import { createRouter } from "../lib/router.js";
import { z } from "zod";
import { authenticate, requireUser } from "../middleware/auth.js";
import { parseBody } from "../middleware/validate.js";
import { AppError } from "../lib/errors.js";
import { requireDb } from "../lib/supabase.js";
import { getSourceById } from "../services/sources/sourcesStore.js";
import { completeJson } from "../services/ai/client.js";
import { MATRIX_FILL_INSTRUCTION, LITERATURE_ANALYSIS_INSTRUCTION } from "../services/ai/prompts.js";
import { logSystem } from "../lib/systemLogs.js";
import type { AcademicSource } from "../types/index.js";

export const matrixRouter = createRouter();

matrixRouter.use(authenticate);

/** Colunas fixas da matriz de revisão da literatura (§29). */
export const MATRIX_COLUMNS: Array<{ key: string; label: string }> = [
  { key: "author", label: "Autor" },
  { key: "year", label: "Ano" },
  { key: "title", label: "Título" },
  { key: "theme", label: "Tema" },
  { key: "objective", label: "Objetivo" },
  { key: "methodology", label: "Metodologia" },
  { key: "sample", label: "Amostra" },
  { key: "variables", label: "Variáveis" },
  { key: "results", label: "Resultados" },
  { key: "limitations", label: "Limitações" },
];

export const NOT_IDENTIFIED = "Não identificado na fonte";

const matrixSchema = z.object({
  title: z.string().trim().min(3).max(300),
  description: z.string().trim().max(2000).nullish(),
  projectId: z.string().uuid().nullish(),
});

const entrySchema = z.object({
  sourceId: z.string().uuid().nullish(),
  source: z.record(z.unknown()).nullish(),
  useAi: z.boolean().default(true),
});

const entryUpdateSchema = z.object({
  theme: z.string().max(2000).nullish(),
  objective: z.string().max(2000).nullish(),
  methodology: z.string().max(2000).nullish(),
  sample: z.string().max(2000).nullish(),
  variables: z.string().max(2000).nullish(),
  results: z.string().max(4000).nullish(),
  limitations: z.string().max(2000).nullish(),
});

/** Resposta estruturada esperada da IA para a análise comparativa de literatura (§30, §57). */
const analysisSchema = z.object({
  approaches: z.array(z.string()).max(10),
  methodologies: z.array(z.string()).max(10),
  variables: z.array(z.string()).max(10),
  convergences: z.array(z.string()).max(10),
  divergences: z.array(z.string()).max(10),
  gaps: z.array(z.string()).max(10),
  summary: z.string().max(2000),
  basedOnSources: z.number().int().min(0),
});

/** Resposta estruturada esperada da IA para preenchimento da matriz (§57). */
const aiFillSchema = z.object({
  theme: z.string().nullable(),
  objective: z.string().nullable(),
  methodology: z.string().nullable(),
  sample: z.string().nullable(),
  variables: z.string().nullable(),
  results: z.string().nullable(),
  limitations: z.string().nullable(),
  confidence: z.number().min(0).max(100),
});

/** Preenche campos da matriz a partir da fonte. Sem IA, deixa "Não identificado na fonte". */
async function buildEntryFields(
  source: AcademicSource,
  useAi: boolean,
): Promise<{ fields: Record<string, string>; aiFilled: boolean; confidence: number }> {
  const base: Record<string, string> = {
    theme: NOT_IDENTIFIED,
    objective: NOT_IDENTIFIED,
    methodology: NOT_IDENTIFIED,
    sample: NOT_IDENTIFIED,
    variables: NOT_IDENTIFIED,
    results: NOT_IDENTIFIED,
    limitations: NOT_IDENTIFIED,
  };

  if (!useAi) return { fields: base, aiFilled: false, confidence: 0 };

  const context = [
    `T�?TULO: ${source.title}`,
    source.year ? `ANO: ${source.year}` : "",
    source.authors.length ? `AUTORES: ${source.authors.map((a) => a.name).join("; ")}` : "",
    source.journal ? `VE�?CULO: ${source.journal}` : "",
    source.abstract ? `RESUMO: ${source.abstract.slice(0, 4000)}` : "RESUMO: (não disponível)",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await completeJson({ schema: aiFillSchema, instruction: MATRIX_FILL_INSTRUCTION, context });
  if (!result) return { fields: base, aiFilled: false, confidence: 0 };

  const fields: Record<string, string> = {};
  for (const key of Object.keys(base)) {
    const value = result[key as keyof typeof result];
    fields[key] = typeof value === "string" && value.trim() ? value.trim() : NOT_IDENTIFIED;
  }
  return { fields, aiFilled: true, confidence: Math.round(result.confidence) };
}

/** Lista matrizes do utilizador. */
matrixRouter.get("/", async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  const { data, error } = await db
    .from("literature_matrices")
    .select("id,title,description,project_id,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw AppError.internal("Não foi possível carregar as matrizes.");

  const ids = (data ?? []).map((m) => m.id as string);
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: entries } = await db
      .from("literature_entries")
      .select("matrix_id")
      .eq("user_id", user.id)
      .in("matrix_id", ids);
    for (const entry of entries ?? []) {
      const key = entry.matrix_id as string;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  res.json({
    matrices: (data ?? []).map((m) => ({ ...m, entriesCount: counts.get(m.id as string) ?? 0 })),
    columns: MATRIX_COLUMNS,
  });
});

/** Cria uma matriz de revisão da literatura. */
matrixRouter.post("/", async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(matrixSchema, req.body);
  const db = requireDb();
  const { data, error } = await db
    .from("literature_matrices")
    .insert({
      user_id: user.id,
      project_id: input.projectId ?? null,
      title: input.title,
      description: input.description ?? null,
    })
    .select()
    .single();
  if (error || !data) throw AppError.internal("Não foi possível criar a matriz.");
  res.status(201).json({ matrix: data, columns: MATRIX_COLUMNS });
});

/** Detalhe da matriz com as entradas. */
matrixRouter.get("/:id", async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  const { data: matrix, error } = await db
    .from("literature_matrices")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .single();
  if (error || !matrix) throw AppError.notFound("Matriz não encontrada.");

  const { data: entries, error: entriesError } = await db
    .from("literature_entries")
    .select("*, source:sources(id,title,authors,year,doi,url,type,journal,publisher)")
    .eq("matrix_id", req.params.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (entriesError) throw AppError.internal("Não foi possível carregar as entradas da matriz.");

  res.json({ matrix, entries: entries ?? [], columns: MATRIX_COLUMNS });
});

/** Atualiza título/descrição da matriz. */
matrixRouter.put("/:id", async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(matrixSchema.partial(), req.body);
  const db = requireDb();
  const { data, error } = await db
    .from("literature_matrices")
    .update({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.projectId !== undefined ? { project_id: input.projectId ?? null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error || !data) throw AppError.notFound("Matriz não encontrada.");
  res.json({ matrix: data });
});

/** Remove a matriz e as suas entradas. */
matrixRouter.delete("/:id", async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  await db.from("literature_entries").delete().eq("matrix_id", req.params.id).eq("user_id", user.id);
  const { error, count } = await db
    .from("literature_matrices")
    .delete({ count: "exact" })
    .eq("id", req.params.id)
    .eq("user_id", user.id);
  if (error) throw AppError.internal("Não foi possível remover a matriz.");
  if (!count) throw AppError.notFound("Matriz não encontrada.");
  res.status(204).send();
});

/** Adiciona uma fonte à matriz (§29) — com preenchimento IA quando disponível. */
matrixRouter.post("/:id/entries", async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(entrySchema, req.body);
  const db = requireDb();

  const { data: matrix } = await db
    .from("literature_matrices")
    .select("id")
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .single();
  if (!matrix) throw AppError.notFound("Matriz não encontrada.");

  let source: (AcademicSource & { id: string }) | null = null;
  if (input.sourceId) source = await getSourceById(input.sourceId);
  if (!source && input.source) {
    const { upsertSources } = await import("../services/sources/sourcesStore.js");
    const { computeFingerprint } = await import("../services/research/normalize.js");
    const candidate = input.source as unknown as AcademicSource;
    const fingerprint = candidate.fingerprint ?? computeFingerprint(candidate);
    const map = await upsertSources([{ ...candidate, fingerprint }]);
    const id = map.get(fingerprint);
    if (id) source = await getSourceById(id);
  }
  if (!source) throw AppError.badRequest("Fonte não encontrada para adicionar à matriz.");

  const author = source.authors[0]?.name ?? NOT_IDENTIFIED;
  const { fields, aiFilled, confidence } = await buildEntryFields(source, input.useAi);

  const { data, error } = await db
    .from("literature_entries")
    .upsert(
      {
        matrix_id: req.params.id,
        user_id: user.id,
        source_id: source.id,
        author,
        year: source.year ?? null,
        title: source.title,
        theme: fields.theme,
        objective: fields.objective,
        methodology: fields.methodology,
        sample: fields.sample,
        variables: fields.variables,
        results: fields.results,
        limitations: fields.limitations,
        ai_filled: aiFilled,
        confidence,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "matrix_id,source_id" },
    )
    .select()
    .single();

  if (error || !data) throw AppError.internal("Não foi possível adicionar a fonte à matriz.");
  await db
    .from("literature_matrices")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .eq("user_id", user.id);

  res.status(201).json({
    entry: data,
    aiFilled,
    note: aiFilled
      ? 'Campos preenchidos a partir do conteúdo da fonte. Sem informação explícita, o campo fica como "Não identificado na fonte".'
      : 'A IA não está configurada (ou foi desativada): preenche os campos manualmente. Campos vazios ficam como "Não identificado na fonte".',
  });
});
/** Edição manual de uma entrada. */
matrixRouter.put("/:id/entries/:entryId", async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(entryUpdateSchema, req.body);
  const db = requireDb();
  const { data, error } = await db
    .from("literature_entries")
    .update({
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
      ...(input.objective !== undefined ? { objective: input.objective } : {}),
      ...(input.methodology !== undefined ? { methodology: input.methodology } : {}),
      ...(input.sample !== undefined ? { sample: input.sample } : {}),
      ...(input.variables !== undefined ? { variables: input.variables } : {}),
      ...(input.results !== undefined ? { results: input.results } : {}),
      ...(input.limitations !== undefined ? { limitations: input.limitations } : {}),
      ai_filled: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.entryId)
    .eq("matrix_id", req.params.id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error || !data) throw AppError.notFound("Entrada não encontrada.");
  res.json({ entry: data });
});

/** Remove uma entrada da matriz. */
matrixRouter.delete("/:id/entries/:entryId", async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  const { error, count } = await db
    .from("literature_entries")
    .delete({ count: "exact" })
    .eq("id", req.params.entryId)
    .eq("matrix_id", req.params.id)
    .eq("user_id", user.id);
  if (error) throw AppError.internal("Não foi possível remover a entrada.");
  if (!count) throw AppError.notFound("Entrada não encontrada.");
  res.status(204).send();
});



/** Análise de literatura (§30) — experimental, sempre baseada nas fontes da matriz. */
matrixRouter.post("/:id/analyze", async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  const { data: entries, error } = await db
    .from("literature_entries")
    .select("author,year,title,theme,objective,methodology,sample,variables,results,limitations")
    .eq("matrix_id", req.params.id)
    .eq("user_id", user.id);
  if (error) throw AppError.internal("Não foi possível analisar a matriz.");
  if (!entries || entries.length < 2) {
    res.json({
      available: false,
      message: "Adiciona pelo menos duas fontes à matriz para gerar uma análise comparativa.",
      analysis: null,
    });
    return;
  }

  const context = entries
    .map(
      (e, index) =>
        `FONTE ${index + 1}: ${e.title} (${e.year ?? "ano não informado"}) — ${e.author}\n` +
        `Tema: ${e.theme ?? NOT_IDENTIFIED}\nObjetivo: ${e.objective ?? NOT_IDENTIFIED}\n` +
        `Metodologia: ${e.methodology ?? NOT_IDENTIFIED}\nAmostra: ${e.sample ?? NOT_IDENTIFIED}\n` +
        `Variáveis: ${e.variables ?? NOT_IDENTIFIED}\nResultados: ${e.results ?? NOT_IDENTIFIED}\n` +
        `Limitações: ${e.limitations ?? NOT_IDENTIFIED}`,
    )
    .join("\n\n");

  const analysis = await completeJson({
    schema: analysisSchema,
    instruction: LITERATURE_ANALYSIS_INSTRUCTION,
    context,
    maxTokens: 1500,
  });

  await logSystem({
    level: "info",
    message: "Análise de literatura",
    userId: user.id,
    provider: "ai",
    context: { matrixId: req.params.id, sources: entries.length, ok: analysis !== null },
  });

  if (!analysis) {
    res.json({
      available: false,
      message:
        "A análise por IA não está disponível (IA não configurada ou resposta inválida). Não são apresentadas conclusões para evitar informação não verificada.",
      analysis: null,
      sourcesUsed: entries.length,
    });
    return;
  }

  res.json({
    available: true,
    analysis,
    sourcesUsed: entries.length,
    disclaimer:
      "Resultados gerados exclusivamente a partir das fontes desta matriz. Confirma sempre no texto original.",
  });
});
