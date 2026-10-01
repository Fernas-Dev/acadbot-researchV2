import { createRouter } from "../lib/router.js";
import { z } from "zod";
import { authenticate, requireUser } from "../middleware/auth.js";
import { researchLimiter } from "../middleware/rateLimit.js";
import { parseBody } from "../middleware/validate.js";
import { AppError } from "../lib/errors.js";
import { newId } from "../lib/http.js";
import { jobManager } from "../services/research/jobManager.js";
import { runResearch } from "../services/research/orchestrator.js";
import { analyzeTopicLocally } from "../services/research/topicAnalyzer.js";
import { generateQueries } from "../services/research/queryGenerator.js";
import { logSystem } from "../lib/systemLogs.js";
import { quotas } from "../config/index.js";
import type { ProgressStep, ResearchParams, WorkType } from "../types/index.js";

export const researchRouter = createRouter();

const yearField = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().int().min(1500).max(2100).nullable(),
);

const researchSchema = z.object({
  topic: z.string().trim().min(5, "Tema demasiado curto").max(500),
  area: z.string().trim().max(200).nullish(),
  workType: z
    .enum(["monografia", "projeto", "artigo", "dissertacao", "tese", "trabalho_academico", "pesquisa_geral"])
    .default("pesquisa_geral"),
  countryRegion: z.string().trim().max(120).nullish(),
  yearFrom: yearField,
  yearTo: yearField,
  languages: z.array(z.enum(["pt", "en", "es", "fr", "all"])).min(1).default(["all"]),
  sourceTypes: z
    .array(z.enum(["article", "book", "thesis", "dissertation", "report", "conference", "working_paper", "all"]))
    .min(1)
    .default(["all"]),
  maxResults: z.union([z.literal(10), z.literal(20), z.literal(50), z.literal(100)]).default(20),
  projectId: z.string().uuid().nullish(),
});

/** Vista pública do job (sem resultados pesados — ficam em /results). */
function jobSummary(record: ReturnType<typeof jobManager.get> | undefined) {
  if (!record) return null;
  return {
    id: record.id,
    projectId: record.projectId,
    status: record.status,
    params: record.params,
    progress: record.progress,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    completedAt: record.completedAt,
    error: record.error,
    warnings: record.warnings,
    providerStats: record.providerStats,
    resultCount: record.results.length,
    durationMs: record.durationMs,
  };
}

/** Pré-visualização da análise do tema (sem pesquisa) — para feedback rápido. */
researchRouter.post("/topic-preview", authenticate, async (req, res) => {
  const { topic, area, countryRegion, yearFrom, yearTo } = researchSchema
    .pick({ topic: true, area: true, countryRegion: true, yearFrom: true, yearTo: true })
    .parse(req.body ?? {});
  const analysis = analyzeTopicLocally({
    topic,
    area: area ?? null,
    countryRegion: countryRegion ?? null,
    yearFrom: yearFrom ?? null,
    yearTo: yearTo ?? null,
  });
  const queries = generateQueries(analysis, 8);
  res.json({ analysis, queries });
});

/** Cria pesquisa assíncrona (§33) — devolve imediatamente o job criado. */
researchRouter.post("/", authenticate, researchLimiter, async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(researchSchema, req.body);
  const params: ResearchParams = {
    topic: input.topic,
    area: input.area ?? null,
    workType: input.workType as WorkType,
    countryRegion: input.countryRegion ?? null,
    yearFrom: input.yearFrom ?? null,
    yearTo: input.yearTo ?? null,
    languages: input.languages,
    sourceTypes: input.sourceTypes,
    maxResults: input.maxResults,
  };

  // Quota diária (§39) — configuração central, não espalhada.
  const today = new Date().toISOString().slice(0, 10);
  const usedToday = jobManager
    .listByUser(user.id, 500)
    .filter((j) => j.createdAt.startsWith(today)).length;
  if (usedToday >= quotas.researchPerDay) {
    throw AppError.tooMany(
      `Limite diário de ${quotas.researchPerDay} pesquisas atingido no plano gratuito. Tente novamente amanhã.`,
    );
  }

  const id = newId();
  const job = jobManager.create({
    id,
    userId: user.id,
    projectId: input.projectId ?? null,
    params,
  });

  // Execução assíncrona — a resposta não espera pela pesquisa.
  void (async (): Promise<void> => {
    let lastSteps: ProgressStep[] = [];
    try {
      jobManager.update(id, { status: "processing" });
      const output = await runResearch(params, (steps, percent) => {
        lastSteps = steps;
        void percent;
        jobManager.update(id, { progress: { steps, percent } });
      });
      const current = jobManager.get(id);
      if (current?.status === "cancelled") return;
      jobManager.update(id, {
        status: "completed",
        completedAt: new Date().toISOString(),
        analysis: output.analysis,
        queries: output.queries,
        results: output.ranked,
        warnings: output.warnings,
        providerStats: output.providerStats,
        durationMs: output.durationMs,
        progress: { steps: lastSteps, percent: 100 },
      });
      const updated = jobManager.get(id);
      if (updated) {
        await jobManager.persistQueries(updated);
        await jobManager.persistResults(updated);
      }
      await logSystem({
        level: "info",
        message: "Pesquisa concluída",
        userId: req.user?.id,
        durationMs: output.durationMs,
        context: { jobId: id, results: output.ranked.length, topic: params.topic.slice(0, 100) },
      });
    } catch (error) {
      jobManager.update(id, {
        status: "failed",
        error: "Não foi possível concluir a pesquisa. Tente novamente.",
      });
      await logSystem({
        level: "error",
        message: error instanceof Error ? error.message : String(error),
        userId: req.user?.id ?? null,
        context: { jobId: id },
      });
    }
  })();

  res.status(201).json({ job: jobSummary(job) });
});

/** Histórico de pesquisas do utilizador. */
researchRouter.get("/", authenticate, async (req, res) => {
  const jobs = jobManager.listByUser(requireUser(req).id, 100).map((j) => jobSummary(j));
  res.json({ jobs });
});

/** Estado do job (polling do frontend). */
researchRouter.get("/:id", authenticate, async (req, res) => {
  const record = jobManager.get(req.params.id);
  if (!record || !jobManager.isOwner(req.params.id, requireUser(req).id)) {
    throw AppError.notFound("Pesquisa não encontrada.");
  }
  res.json({ job: jobSummary(record) });
});

/** Resultados completos da pesquisa. */
researchRouter.get("/:id/results", authenticate, async (req, res) => {
  const record = jobManager.get(req.params.id);
  if (!record || !jobManager.isOwner(req.params.id, requireUser(req).id)) {
    throw AppError.notFound("Pesquisa não encontrada.");
  }
  res.json({
    job: jobSummary(record),
    analysis: record.analysis,
    queries: record.queries,
    results: record.results,
  });
});

/** Cancela uma pesquisa em curso. */
researchRouter.post("/:id/cancel", authenticate, async (req, res) => {
  const record = jobManager.cancel(req.params.id);
  if (!record || !jobManager.isOwner(req.params.id, requireUser(req).id)) {
    throw AppError.notFound("Pesquisa não encontrada.");
  }
  res.json({ job: jobSummary(record) });
});


