import { api } from "@/lib/api.js";
import type {
  AcademicSource,
  BulkValidationItem,
  GeneratedQuery,
  RankedSource,
  ResearchJob,
  ResearchParams,
  TopicAnalysis,
  ValidationRecord,
} from "@/types";

/* --------------------------------- Pesquisa (§11-19) --------------------------------- */

export const researchApi = {
  previewTopic: (input: { topic: string; area?: string | null; countryRegion?: string | null }) =>
    api.post<{ analysis: TopicAnalysis; queries: GeneratedQuery[] }>("/api/research/topic-preview", input),

  start: (input: ResearchParams & { projectId?: string | null }) =>
    api.post<{ job: ResearchJob }>("/api/research", input),

  list: () => api.get<{ jobs: ResearchJob[] }>("/api/research"),

  get: (id: string) => api.get<{ job: ResearchJob }>(`/api/research/${id}`),

  results: (id: string) =>
    api.get<{
      job: ResearchJob;
      analysis: TopicAnalysis | null;
      queries: GeneratedQuery[];
      results: RankedSource[];
    }>(`/api/research/${id}/results`),

  cancel: (id: string) => api.post<{ job: ResearchJob }>(`/api/research/${id}/cancel`),
};

/* -------------------------------- Validação (§21-25) -------------------------------- */

export const validationApi = {
  validate: (reference: string, projectId?: string | null) =>
    api.post<{ validation: ValidationRecord }>("/api/validation", { reference, projectId: projectId ?? null }),

  validateBulk: (references: string[]) =>
    api.post<{ items: BulkValidationItem[]; skipped: number; quotaRemaining: number }>("/api/validation/bulk", {
      references,
    }),

  verifyDoi: (doi: string, reference?: string) =>
    api.post<{
      verification: { found: boolean; message: string; conflicts: string[]; source?: AcademicSource | null };
    }>("/api/validation/doi", { doi, reference }),

  list: () => api.get<{ validations: ValidationRecord[] }>("/api/validation"),

  get: (id: string) => api.get<{ validation: ValidationRecord }>(`/api/validation/${id}`),
};
