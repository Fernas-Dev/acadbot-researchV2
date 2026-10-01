import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/services/admin.js";
import { keys } from "./queries.js";

/* ------------------------------ Administração (§42) ------------------------------ */

export const useAdminOverview = (enabled: boolean) =>
  useQuery({ queryKey: keys.adminOverview, queryFn: adminApi.overview, enabled });

export const useAdminUsers = (search?: string, enabled = true) =>
  useQuery({ queryKey: keys.adminUsers(search), queryFn: () => adminApi.users(search), enabled });

export const useAdminResearch = (enabled = true) =>
  useQuery({ queryKey: keys.adminResearch, queryFn: adminApi.research, enabled });

export const useAdminValidation = (enabled = true) =>
  useQuery({ queryKey: keys.adminValidation, queryFn: adminApi.validation, enabled });

export const useAdminProviders = (enabled = true) =>
  useQuery({ queryKey: keys.adminProviders, queryFn: adminApi.providers, enabled });

export const useAdminUsage = (enabled = true) =>
  useQuery({ queryKey: keys.adminUsage, queryFn: adminApi.usage, enabled });

export const useAdminLogs = (level?: "error" | "warn" | "info", enabled = true) =>
  useQuery({ queryKey: keys.adminLogs(level), queryFn: () => adminApi.logs(level), enabled });

export const useAdminSettings = (enabled = true) =>
  useQuery({ queryKey: keys.adminSettings, queryFn: adminApi.settings, enabled });

export function useAdminMutations() {
  const client = useQueryClient();
  return {
    checkProviders: useMutation({
      mutationFn: () => adminApi.checkProviders(),
      onSuccess: () => void client.invalidateQueries({ queryKey: keys.adminProviders }),
    }),
    updateProvider: useMutation({
      mutationFn: ({ id, input }: { id: string; input: { enabled?: boolean; priority?: number } }) =>
        adminApi.updateProvider(id, input),
      onSuccess: () => void client.invalidateQueries({ queryKey: keys.adminProviders }),
    }),
    updateSetting: useMutation({
      mutationFn: ({ key, value }: { key: string; value: unknown }) => adminApi.updateSetting(key, value),
      onSuccess: () => void client.invalidateQueries({ queryKey: keys.adminSettings }),
    }),
  };
}
