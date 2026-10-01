import { crossrefProvider } from "./crossref.js";
import { openalexProvider } from "./openalex.js";
import { semanticScholarProvider } from "./semanticScholar.js";
import { serviceClient } from "../lib/supabase.js";
import { logger } from "../lib/logger.js";
import type { AcademicSearchProvider, ProviderId } from "../types/index.js";

export interface ProviderState {
  instance: AcademicSearchProvider;
  enabled: boolean;
  priority: number;
  lastError?: string | null;
  lastCheckedAt?: string | null;
}

interface ProviderConfigRow {
  id: string;
  enabled: boolean | null;
  priority: number | null;
  last_error: string | null;
  last_checked_at: string | null;
}

/**
 * Registry de providers — fonte única de verdade sobre quais providers
 * estão ativos e em que ordem. Estado persistido em `provider_config`
 * (gerido pelo admin) com fallback para os defaults.
 */
class ProviderRegistry {
  private states = new Map<ProviderId, ProviderState>();
  private loadedFromDb = false;

  constructor() {
    this.register(crossrefProvider, 1, true);
    this.register(openalexProvider, 2, true);
    this.register(semanticScholarProvider, 3, true);
  }

  register(instance: AcademicSearchProvider, priority: number, enabled: boolean): void {
    this.states.set(instance.id, { instance, enabled, priority, lastError: null, lastCheckedAt: null });
  }

  list(): ProviderState[] {
    return [...this.states.values()].sort((a, b) => a.priority - b.priority);
  }

  get(id: ProviderId): ProviderState | undefined {
    return this.states.get(id);
  }

  /** Providers ativos, ordenados por prioridade. */
  enabled(): ProviderState[] {
    return this.list().filter((s) => s.enabled);
  }

  setEnabled(id: ProviderId, enabled: boolean): void {
    const state = this.states.get(id);
    if (state) state.enabled = enabled;
  }

  setPriority(id: ProviderId, priority: number): void {
    const state = this.states.get(id);
    if (state) state.priority = priority;
  }

  markError(id: ProviderId, message: string): void {
    const state = this.states.get(id);
    if (state) {
      state.lastError = message.slice(0, 500);
      state.lastCheckedAt = new Date().toISOString();
    }
  }

  markOk(id: ProviderId): void {
    const state = this.states.get(id);
    if (state) {
      state.lastError = null;
      state.lastCheckedAt = new Date().toISOString();
    }
  }

  /** Carrega configuração do admin a partir de provider_config (com fallback silencioso). */
  async loadFromDb(force = false): Promise<void> {
    if (!serviceClient) return;
    if (this.loadedFromDb && !force) return;
    try {
      const { data, error } = await serviceClient
        .from("provider_config")
        .select("id,enabled,priority,last_error,last_checked_at");
      if (error) throw error;
      const rows = (data ?? []) as ProviderConfigRow[];
      for (const row of rows) {
        const state = this.states.get(row.id as ProviderId);
        if (!state) continue;
        state.enabled = row.enabled ?? state.enabled;
        state.priority = row.priority ?? state.priority;
        state.lastError = row.last_error;
        state.lastCheckedAt = row.last_checked_at;
      }
      this.loadedFromDb = true;
    } catch (error) {
      logger.debug({ err: error }, "provider_config indisponível — usando defaults");
    }
  }

  async persist(id: ProviderId, fields: { enabled?: boolean; priority?: number }): Promise<void> {
    if (!serviceClient) return;
    try {
      const { error } = await serviceClient
        .from("provider_config")
        .update({
          ...(fields.enabled !== undefined ? { enabled: fields.enabled } : {}),
          ...(fields.priority !== undefined ? { priority: fields.priority } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    } catch (error) {
      logger.warn({ err: error, provider: id }, "Falha ao persistir provider_config");
    }
  }

  async recordHealth(id: ProviderId, ok: boolean, error?: string): Promise<void> {
    this.markOk(id);
    if (!ok) this.markError(id, error ?? "health check falhou");
    if (!serviceClient) return;
    try {
      const { error: dbError } = await serviceClient
        .from("provider_config")
        .update({
          last_error: ok ? null : (error ?? "health check falhou").slice(0, 500),
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (dbError) throw dbError;
    } catch (dbErr) {
      logger.debug({ err: dbErr, provider: id }, "Falha ao registar health do provider");
    }
  }
}

export const providerRegistry = new ProviderRegistry();

/** Garante que o estado do admin está carregado antes da primeira pesquisa. */
export async function ensureRegistryLoaded(): Promise<void> {
  await providerRegistry.loadFromDb();
}
