import { api, apiDownload } from "@/lib/api.js";
import type { DashboardData, ExportFormat, ExportKind, HistoryEntry, Project } from "@/types";

/* ---------------------------------- Projetos ---------------------------------- */

export interface ProjectInput {
  title: string;
  description?: string | null;
  theme?: string | null;
  researchProblem?: string | null;
  objective?: string | null;
  keywords?: string[];
}

export const projectsApi = {
  list: () => api.get<{ projects: Project[] }>("/api/projects"),
  get: (id: string) => api.get<{ project: Project }>(`/api/projects/${id}`),
  create: (input: ProjectInput) => api.post<{ project: Project }>("/api/projects", input),
  update: (id: string, input: Partial<ProjectInput>) =>
    api.put<{ project: Project }>(`/api/projects/${id}`, input),
  remove: (id: string) => api.delete<void>(`/api/projects/${id}`),
};

/* --------------------------------- Dashboard ---------------------------------- */

export const dashboardApi = {
  get: () => api.get<DashboardData>("/api/dashboard"),
  notifications: () =>
    api.get<{ notifications: Array<{ id: string; title: string; body: string | null; read: boolean; created_at: string }>; unread: number }>(
      "/api/dashboard/notifications",
    ),
  markNotificationsRead: () => api.post<void>("/api/dashboard/notifications/read"),
};

/* --------------------------------- Histórico ---------------------------------- */

export const historyApi = {
  list: (params: { type?: "all" | "research" | "validation" | "export"; limit?: number } = {}) => {
    const search = new URLSearchParams();
    if (params.type) search.set("type", params.type);
    if (params.limit) search.set("limit", String(params.limit));
    const query = search.toString();
    return api.get<{ entries: HistoryEntry[] }>(`/api/history${query ? `?${query}` : ""}`);
  },
};

/* -------------------------------- Exportações --------------------------------- */

export interface ExportParams {
  kind: ExportKind;
  format: ExportFormat;
  jobId?: string | null;
  matrixId?: string | null;
  savedSourceIds?: string[];
  projectId?: string | null;
  title?: string;
  citationStyle?: "apa7" | "abnt";
}

export const exportsApi = {
  download: (params: ExportParams) =>
    apiDownload({ ...params }, `acadbot-${params.kind}.${params.format}`),
  history: () =>
    api.get<{ supportedFormats: ExportFormat[]; exports: Array<{ id: string; file_name: string; created_at: string }> }>(
      "/api/exports",
    ),
};
