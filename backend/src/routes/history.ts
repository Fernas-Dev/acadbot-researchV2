import { createRouter } from "../lib/router.js";
import { z } from "zod";
import { authenticate, requireUser } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";
import { serviceClient } from "../lib/supabase.js";
import { jobManager } from "../services/research/jobManager.js";
import { validationStore } from "../services/validation/validationStore.js";

export const historyRouter = createRouter();

historyRouter.use(authenticate);

export interface HistoryEntry {
  id: string;
  type: "research" | "validation" | "export";
  title: string;
  status: string;
  createdAt: string;
  projectId: string | null;
  resultCount: number | null;
  confidence: number | null;
  detail?: string | null;
}

/**
 * Histórico (§31): pesquisas, validações e exportações.
 * Usa a base de dados quando disponível e complementa com o estado em memória.
 */
historyRouter.get("/", async (req, res) => {
  const user = requireUser(req);
  const query = z
    .object({
      type: z.enum(["all", "research", "validation", "export"]).default("all"),
      limit: z.coerce.number().int().min(1).max(200).default(50),
      projectId: z.string().uuid().optional(),
    })
    .parse(req.query);

  const entries: HistoryEntry[] = [];

  if (query.type === "all" || query.type === "research") {
    if (serviceClient) {
      let builder = serviceClient
        .from("research_jobs")
        .select("id,topic,status,project_id,results_count,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(query.limit);
      if (query.projectId) builder = builder.eq("project_id", query.projectId);
      const { data, error } = await builder;
      if (error) throw AppError.internal("Não foi possível carregar o histórico de pesquisas.");
      for (const row of data ?? []) {
        entries.push({
          id: row.id as string,
          type: "research",
          title: (row.topic as string) ?? "Pesquisa",
          status: (row.status as string) ?? "pending",
          createdAt: row.created_at as string,
          projectId: (row.project_id as string | null) ?? null,
          resultCount: (row.results_count as number | null) ?? null,
          confidence: null,
        });
      }
    } else {
      for (const job of jobManager.listByUser(user.id, query.limit)) {
        entries.push({
          id: job.id,
          type: "research",
          title: job.params.topic,
          status: job.status,
          createdAt: job.createdAt,
          projectId: job.projectId,
          resultCount: job.results.length,
          confidence: null,
        });
      }
    }
  }

  if (query.type === "all" || query.type === "validation") {
    for (const item of validationStore.listByUser(user.id, query.limit)) {
      entries.push({
        id: item.id,
        type: "validation",
        title: item.reference.slice(0, 200),
        status: item.detail.status,
        createdAt: item.createdAt,
        projectId: null,
        resultCount: item.detail.matches.length,
        confidence: item.detail.confidence,
        detail: item.detail.outcome.message,
      });
    }
  }

  if ((query.type === "all" || query.type === "export") && serviceClient) {
    const { data } = await serviceClient
      .from("exports")
      .select("id,kind,format,file_name,row_count,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(query.limit);
    for (const row of data ?? []) {
      entries.push({
        id: row.id as string,
        type: "export",
        title: `${row.file_name as string} (${String(row.kind)}/${String(row.format)})`,
        status: "completed",
        createdAt: row.created_at as string,
        projectId: null,
        resultCount: (row.row_count as number | null) ?? null,
        confidence: null,
      });
    }
  }

  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  res.json({ entries: entries.slice(0, query.limit) });
});
