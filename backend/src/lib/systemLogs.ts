import { serviceClient } from "./supabase.js";
import { logger } from "./logger.js";

export type SystemLogLevel = "error" | "warn" | "info";

export interface SystemLogEntry {
  level: SystemLogLevel;
  message: string;
  context?: Record<string, unknown>;
  userId?: string | null;
  endpoint?: string | null;
  provider?: string | null;
  durationMs?: number | null;
}

/**
 * Registra eventos em system_logs (best-effort).
 * Nunca registra senhas ou API keys — os redact paths do logger
 * protegem o stdout, e aqui só guardamos contexto permitido.
 */
export async function logSystem(entry: SystemLogEntry): Promise<void> {
  logger[entry.level === "info" ? "info" : entry.level](
    { ...(entry.context ?? {}), userId: entry.userId ?? undefined },
    entry.message,
  );
  if (!serviceClient) return;
  try {
    const { error } = await serviceClient.from("system_logs").insert({
      level: entry.level,
      message: entry.message.slice(0, 2000),
      context: entry.context ?? {},
      user_id: entry.userId ?? null,
      endpoint: entry.endpoint ?? null,
      provider: entry.provider ?? null,
      duration_ms: entry.durationMs ?? null,
    });
    if (error) throw error;
  } catch (error) {
    logger.debug({ err: error }, "system_logs insert falhou (ignorado)");
  }
}
