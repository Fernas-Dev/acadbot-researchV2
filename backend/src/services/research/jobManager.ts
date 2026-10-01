import { serviceClient } from "../../lib/supabase.js";
import { logger } from "../../lib/logger.js";
import type {
  GeneratedQuery,
  JobStatus,
  ProgressStep,
  ResearchParams,
  TopicAnalysis,
} from "../../types/index.js";
import type { ProviderRunStat, RankedSource } from "./orchestrator.js";

export interface ResearchJobRecord {
  id: string;
  userId: string;
  projectId: string | null;
  params: ResearchParams;
  status: JobStatus;
  progress: { steps: ProgressStep[]; percent: number };
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  error: string | null;
  analysis: TopicAnalysis | null;
  queries: GeneratedQuery[];
  results: RankedSource[];
  warnings: string[];
  providerStats: ProviderRunStat[];
  durationMs: number | null;
}

export interface CreateJobInput {
  id: string;
  userId: string;
  projectId: string | null;
  params: ResearchParams;
}

/**
 * Gestor de research jobs (§33): pesquisa assíncrona que não bloqueia a
 * interface. Estado em memória + persistência best-effort em research_jobs /
 * research_queries / sources / research_results (quando o Supabase está
 * configurado). A app funciona sem DB — mas não persiste histórico.
 */
class JobManager {
  private jobs = new Map<string, ResearchJobRecord>();

  create(input: CreateJobInput): ResearchJobRecord {
    const now = new Date().toISOString();
    const record: ResearchJobRecord = {
      id: input.id,
      userId: input.userId,
      projectId: input.projectId,
      params: input.params,
      status: "pending",
      progress: { steps: [], percent: 0 },
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      error: null,
      analysis: null,
      queries: [],
      results: [],
      warnings: [],
      providerStats: [],
      durationMs: null,
    };
    this.jobs.set(input.id, record);
    void this.persistJob(record);
    return record;
  }

  get(id: string): ResearchJobRecord | undefined {
    return this.jobs.get(id);
  }

  listByUser(userId: string, limit = 50): ResearchJobRecord[] {
    return [...this.jobs.values()]
      .filter((j) => j.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  update(id: string, patch: Partial<ResearchJobRecord>): ResearchJobRecord | undefined {
    const record = this.jobs.get(id);
    if (!record) return undefined;
    Object.assign(record, patch, { updatedAt: new Date().toISOString() });
    void this.persistJob(record);
    return record;
  }

  cancel(id: string): ResearchJobRecord | undefined {
    const record = this.jobs.get(id);
    if (!record || (record.status !== "pending" && record.status !== "processing")) return record;
    record.status = "cancelled";
    record.updatedAt = new Date().toISOString();
    void this.persistJob(record);
    return record;
  }

  isOwner(id: string, userId: string): boolean {
    return this.jobs.get(id)?.userId === userId;
  }

  /** Persistência best-effort do estado do job (nunca lança). */
  private async persistJob(record: ResearchJobRecord): Promise<void> {
    if (!serviceClient) return;
    try {
      const { error } = await serviceClient.from("research_jobs").upsert(
        {
          id: record.id,
          user_id: record.userId,
          project_id: record.projectId,
          topic: record.params.topic,
          params: record.params,
          status: record.status,
          progress: record.progress,
          error: record.error,
          results_count: record.results.length,
          created_at: record.createdAt,
          updated_at: record.updatedAt,
          completed_at: record.completedAt,
        },
        { onConflict: "id" },
      );
      if (error) throw error;
    } catch (error) {
      logger.debug({ err: error, jobId: record.id }, "research_jobs persist falhou (ignorado)");
    }
  }

  /** Persiste queries geradas (research_queries) — best-effort. */
  async persistQueries(record: ResearchJobRecord): Promise<void> {
    if (!serviceClient || record.queries.length === 0) return;
    try {
      const rows = record.queries.map((q) => ({
        job_id: record.id,
        user_id: record.userId,
        query: q.query,
        language: q.language,
        purpose: q.purpose,
      }));
      const { error } = await serviceClient.from("research_queries").insert(rows);
      if (error) throw error;
    } catch (error) {
      logger.debug({ err: error, jobId: record.id }, "research_queries persist falhou");
    }
  }

  /** Persiste fontes + resultados (sources / research_results) — best-effort. */
  async persistResults(record: ResearchJobRecord): Promise<void> {
    if (!serviceClient || record.results.length === 0) return;
    try {
      const sourceRows = record.results.map((r) => ({
        fingerprint: r.source.fingerprint,
        added_by: record.userId,
        title: r.source.title,
        authors: r.source.authors,
        year: r.source.year ?? null,
        abstract: r.source.abstract ?? null,
        journal: r.source.journal ?? null,
        publisher: r.source.publisher ?? null,
        volume: r.source.volume ?? null,
        issue: r.source.issue ?? null,
        pages: r.source.pages ?? null,
        doi: r.source.doi ?? null,
        isbn: r.source.isbn ?? null,
        url: r.source.url ?? null,
        type: r.source.type,
        citation_count: r.source.citationCount ?? null,
        keywords: r.source.keywords,
        language: r.source.language ?? null,
        open_access: r.source.openAccess,
        providers: r.source.providers,
        metadata: r.source.metadata,
      }));
      const { error } = await serviceClient
        .from("sources")
        .upsert(sourceRows, { onConflict: "fingerprint", ignoreDuplicates: false });
      if (error) throw error;

      const fingerprints = sourceRows.map((s) => s.fingerprint);
      const { data: idRows, error: selectError } = await serviceClient
        .from("sources")
        .select("id,fingerprint")
        .in("fingerprint", fingerprints);
      if (selectError) throw selectError;
      const idByFp = new Map(
        (idRows ?? []).map((row) => [row.fingerprint as string, row.id as string]),
      );

      const resultRows = record.results
        .map((r, index) => ({
          job_id: record.id,
          user_id: record.userId,
          source_id: idByFp.get(r.source.fingerprint) ?? null,
          rank: index + 1,
          relevance_score: r.relevance.score,
          relevance: r.relevance,
        }))
        .filter((row) => row.source_id !== null);
      if (resultRows.length > 0) {
        const { error: insertError } = await serviceClient
          .from("research_results")
          .upsert(resultRows, { onConflict: "job_id,source_id" });
        if (insertError) throw insertError;
      }
    } catch (error) {
      logger.debug({ err: error, jobId: record.id }, "results persist falhou (ignorado)");
    }
  }
}

export const jobManager = new JobManager();

