import { api } from "@/lib/api.js";

/* --------------------------- Administração (§42-43) --------------------------- */

export interface AdminOverview {
  counts: {
    users: number;
    jobs: number;
    validations: number;
    sources: number;
    savedSources: number;
    exports: number;
    errors: number;
    matrices: number;
  };
  integrations: {
    supabase: boolean;
    ai: boolean;
    crossrefPolite: boolean;
    semanticScholarKeyed: boolean;
    openalexPolite: boolean;
  };
  quotas: { researchPerDay: number; validationPerDay: number; bulkMaxReferences: number };
  recentLogs: Array<{
    id: string;
    level: string;
    message: string;
    endpoint: string | null;
    provider: string | null;
    created_at: string;
  }>;
}

export interface AdminProvider {
  id: string;
  label: string;
  enabled: boolean;
  priority: number;
  lastError: string | null;
  lastCheckedAt: string | null;
}

export const adminApi = {
  overview: () => api.get<AdminOverview>("/api/admin/overview"),

  users: (search?: string) =>
    api.get<{
      users: Array<{
        id: string;
        email: string;
        name: string | null;
        institution: string | null;
        study_area: string | null;
        role: string;
        created_at: string;
      }>;
    }>(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),

  research: () =>
    api.get<{
      jobs: Array<{
        id: string;
        user_id: string;
        topic: string;
        status: string;
        results_count: number;
        duration_ms: number | null;
        created_at: string;
      }>;
    }>("/api/admin/research"),

  validation: () =>
    api.get<{
      validations: Array<{
        id: string;
        user_id: string;
        status: string;
        confidence: number;
        raw_reference: string;
        created_at: string;
      }>;
    }>("/api/admin/validation"),

  providers: () => api.get<{ providers: AdminProvider[] }>("/api/admin/providers"),

  checkProviders: () =>
    api.post<{ results: Array<{ id: string; label: string; ok: boolean; latencyMs: number | null; error: string | null }> }>(
      "/api/admin/providers/health",
    ),

  updateProvider: (id: string, input: { enabled?: boolean; priority?: number }) =>
    api.put<{ provider: { id: string; label: string; enabled: boolean; priority: number } | null }>(
      `/api/admin/providers/${id}`,
      input,
    ),

  usage: () =>
    api.get<{
      total: number;
      byKind: Array<{ kind: string; amount: number }>;
      byDay: Array<{ day: string; amount: number }>;
    }>("/api/admin/usage"),

  logs: (level?: "error" | "warn" | "info") =>
    api.get<{
      logs: Array<{
        id: string;
        level: string;
        message: string;
        context: Record<string, unknown>;
        endpoint: string | null;
        provider: string | null;
        duration_ms: number | null;
        created_at: string;
      }>;
    }>(`/api/admin/logs${level ? `?level=${level}` : ""}`),

  settings: () =>
    api.get<{
      settings: Array<{ key: string; value: unknown; updated_at: string }>;
      serverConfig: {
        env: string;
        appUrl: string;
        aiBaseUrl: string | null;
        aiModel: string | null;
        quotas: { researchPerDay: number; validationPerDay: number; bulkMaxReferences: number };
      };
    }>("/api/admin/settings"),

  updateSetting: (key: string, value: unknown) =>
    api.put<{ setting: { key: string; value: unknown; updated_at: string } }>("/api/admin/settings", { key, value }),
};
