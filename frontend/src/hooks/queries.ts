import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardApi, exportsApi, historyApi, projectsApi, type ProjectInput } from "@/services/core.js";
import { researchApi } from "@/services/research.js";
import type { ResearchParams } from "@/types";

/** Chaves de cache centralizadas (evita strings espalhadas pelo código). */
export const keys = {
  dashboard: ["dashboard"] as const,
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  research: ["research"] as const,
  researchJob: (id: string) => ["research", id] as const,
  researchResults: (id: string) => ["research", id, "results"] as const,
  library: (params: unknown) => ["library", params] as const,
  libraryTags: ["library", "tags"] as const,
  validations: ["validations"] as const,
  validation: (id: string) => ["validations", id] as const,
  citations: (style?: string) => ["citations", style ?? "all"] as const,
  matrices: ["matrices"] as const,
  matrix: (id: string) => ["matrices", id] as const,
  history: (type: string) => ["history", type] as const,
  adminOverview: ["admin", "overview"] as const,
  adminUsers: (search?: string) => ["admin", "users", search ?? ""] as const,
  adminResearch: ["admin", "research"] as const,
  adminValidation: ["admin", "validation"] as const,
  adminProviders: ["admin", "providers"] as const,
  adminUsage: ["admin", "usage"] as const,
  adminLogs: (level?: string) => ["admin", "logs", level ?? "all"] as const,
  adminSettings: ["admin", "settings"] as const,
};

/* ---------------------------------- Dashboard ---------------------------------- */

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: dashboardApi.get });

/* ----------------------------------- Projetos ----------------------------------- */

export const useProjects = () => useQuery({ queryKey: keys.projects, queryFn: projectsApi.list });

export const useProject = (id: string) =>
  useQuery({ queryKey: keys.project(id), queryFn: () => projectsApi.get(id), enabled: Boolean(id) });

export function useProjectMutations() {
  const client = useQueryClient();
  const invalidate = (): void => {
    void client.invalidateQueries({ queryKey: keys.projects });
    void client.invalidateQueries({ queryKey: keys.dashboard });
  };
  return {
    create: useMutation({
      mutationFn: (input: ProjectInput) => projectsApi.create(input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: Partial<ProjectInput> }) =>
        projectsApi.update(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => projectsApi.remove(id), onSuccess: invalidate }),
  };
}

/* ------------------------------- Pesquisa assíncrona ------------------------------- */

export const useResearchJobs = () => useQuery({ queryKey: keys.research, queryFn: researchApi.list });

export const useResearchJob = (id: string, options: { poll?: boolean } = {}) =>
  useQuery({
    queryKey: keys.researchJob(id),
    queryFn: () => researchApi.get(id),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      if (!options.poll) return false;
      const status = query.state.data?.job.status;
      return status === "pending" || status === "processing" ? 1500 : false;
    },
  });

export const useResearchResults = (id: string, enabled = true) =>
  useQuery({
    queryKey: keys.researchResults(id),
    queryFn: () => researchApi.results(id),
    enabled: Boolean(id) && enabled,
  });

export const useStartResearch = () =>
  useMutation({ mutationFn: (input: ResearchParams & { projectId?: string | null }) => researchApi.start(input) });

export const useCancelResearch = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => researchApi.cancel(id),
    onSuccess: (_data, id) => void client.invalidateQueries({ queryKey: keys.researchJob(id) }),
  });
};

/* ---------------------------------- Histórico ---------------------------------- */

export const useHistory = (type: "all" | "research" | "validation" | "export" = "all") =>
  useQuery({ queryKey: keys.history(type), queryFn: () => historyApi.list({ type, limit: 100 }) });

/* ---------------------------------- Exportações ---------------------------------- */

export const useExportDownload = () =>
  useMutation({ mutationFn: (params: Parameters<typeof exportsApi.download>[0]) => exportsApi.download(params) });
