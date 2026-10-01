import { createRouter } from "../lib/router.js";
import { z } from "zod";
import { authenticate, requireAdmin, requireUser } from "../middleware/auth.js";
import { adminLimiter } from "../middleware/rateLimit.js";
import { parseBody } from "../middleware/validate.js";
import { AppError } from "../lib/errors.js";
import { requireDb } from "../lib/supabase.js";
import { providerRegistry, ensureRegistryLoaded } from "../providers/registry.js";
import { logSystem } from "../lib/systemLogs.js";
import { integrations, quotas, env } from "../config/index.js";

export const adminRouter = createRouter();

adminRouter.use(authenticate, requireAdmin, adminLimiter);

const providerIdSchema = z.enum(["crossref", "semantic_scholar", "openalex"]);

/** Contagem segura (devolve 0 quando a tabela não existe ou falha). */
async function safeCount(table: string, filter?: { column: string; value: string }): Promise<number> {
  try {
    const db = requireDb();
    let builder = db.from(table).select("id", { count: "exact", head: true });
    if (filter) builder = builder.eq(filter.column, filter.value);
    const { count, error } = await builder;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/** Visão geral do painel administrativo (§42). */
adminRouter.get("/overview", async (req, res) => {
  const [users, jobs, validations, sources, savedSources, exportsCount, errors, matrices] = await Promise.all([
    safeCount("profiles"),
    safeCount("research_jobs"),
    safeCount("validation_jobs"),
    safeCount("sources"),
    safeCount("saved_sources"),
    safeCount("exports"),
    safeCount("system_logs", { column: "level", value: "error" }),
    safeCount("literature_matrices"),
  ]);

  const { data: recentLogs } = await (async () => {
    try {
      const db = requireDb();
      return await db
        .from("system_logs")
        .select("id,level,message,endpoint,provider,created_at")
        .order("created_at", { ascending: false })
        .limit(10);
    } catch {
      return { data: [] };
    }
  })();

  await logSystem({
    level: "info",
    message: "Acesso ao painel administrativo",
    userId: requireUser(req).id,
    endpoint: "GET /api/admin/overview",
  });

  res.json({
    counts: { users, jobs, validations, sources, savedSources, exports: exportsCount, errors, matrices },
    integrations: {
      supabase: integrations.supabase,
      ai: integrations.ai,
      crossrefPolite: integrations.crossrefPolite,
      semanticScholarKeyed: integrations.semanticScholarKeyed,
      openalexPolite: integrations.openalexPolite,
    },
    quotas: { ...quotas },
    recentLogs: recentLogs ?? [],
  });
});

/** Lista de utilizadores (dados mínimos, sem segredos). */
adminRouter.get("/users", async (req, res) => {
  const db = requireDb();
  const query = z
    .object({
      search: z.string().trim().max(120).optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50),
    })
    .parse(req.query);

  let builder = db
    .from("profiles")
    .select("id,email,name,institution,study_area,role,created_at")
    .order("created_at", { ascending: false })
    .limit(query.limit);
  if (query.search) builder = builder.ilike("email", `%${query.search}%`);

  const { data, error } = await builder;
  if (error) throw AppError.internal("Não foi possível carregar os utilizadores.");
  res.json({ users: data ?? [] });
});

/** Pesquisas recentes de todos os utilizadores. */
adminRouter.get("/research", async (req, res) => {
  const db = requireDb();
  const limit = z.coerce.number().int().min(1).max(200).default(50).parse((req.query as { limit?: unknown }).limit ?? 50);
  const { data, error } = await db
    .from("research_jobs")
    .select("id,user_id,topic,status,results_count,duration_ms,created_at,completed_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw AppError.internal("Não foi possível carregar as pesquisas.");
  res.json({ jobs: data ?? [] });
});

/** Validações recentes. */
adminRouter.get("/validation", async (req, res) => {
  const db = requireDb();
  const limit = z.coerce.number().int().min(1).max(200).default(50).parse((req.query as { limit?: unknown }).limit ?? 50);
  const { data, error } = await db
    .from("validation_jobs")
    .select("id,user_id,status,confidence,raw_reference,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw AppError.internal("Não foi possível carregar as validações.");
  res.json({ validations: data ?? [] });
});

/** Gestão de providers (§43): estado, ativação e prioridade. Nunca expõe API keys. */
adminRouter.get("/providers", async (_req, res) => {
  await providerRegistry.loadFromDb(true);
  const providers = providerRegistry.list().map((state) => ({
    id: state.instance.id,
    label: state.instance.label,
    enabled: state.enabled,
    priority: state.priority,
    lastError: state.lastError ?? null,
    lastCheckedAt: state.lastCheckedAt ?? null,
    configured: true,
  }));
  res.json({ providers });
});

/** Executa health check real nos providers ativos. */
adminRouter.post("/providers/health", async (_req, res) => {
  await ensureRegistryLoaded();
  const results = await Promise.all(
    providerRegistry.list().map(async (state) => {
      const health = await state.instance.healthCheck();
      await providerRegistry.recordHealth(state.instance.id, health.ok, health.error);
      return {
        id: state.instance.id,
        label: state.instance.label,
        ok: health.ok,
        latencyMs: health.latencyMs ?? null,
        error: health.ok ? null : "Falha ao contactar o provider (verifica a conectividade).",
      };
    }),
  );
  res.json({ results });
});

/** Ativa/desativa um provider e define prioridade. */
adminRouter.put("/providers/:id", async (req, res) => {
  const id = providerIdSchema.parse(req.params.id);
  const input = parseBody(
    z.object({
      enabled: z.boolean().optional(),
      priority: z.number().int().min(1).max(10).optional(),
    }),
    req.body,
  );
  if (input.enabled !== undefined) providerRegistry.setEnabled(id, input.enabled);
  if (input.priority !== undefined) providerRegistry.setPriority(id, input.priority);
  await providerRegistry.persist(id, input);
  await logSystem({
    level: "info",
    message: "Configuração de provider atualizada",
    userId: requireUser(req).id,
    provider: id,
    context: { ...input },
  });
  const state = providerRegistry.get(id);
  res.json({
    provider: state
      ? { id, label: state.instance.label, enabled: state.enabled, priority: state.priority }
      : null,
  });
});

/** Uso das APIs e da IA (usage_records + provider_config). */
adminRouter.get("/usage", async (_req, res) => {
  const db = requireDb();
  const { data, error } = await db
    .from("usage_records")
    .select("user_id,kind,amount,day")
    .order("day", { ascending: false })
    .limit(500);
  if (error) throw AppError.internal("Não foi possível carregar o uso.");

  const byKind = new Map<string, number>();
  const byDay = new Map<string, number>();
  for (const row of data ?? []) {
    const kind = row.kind as string;
    byKind.set(kind, (byKind.get(kind) ?? 0) + ((row.amount as number) ?? 1));
    const day = (row.day as string) ?? "";
    byDay.set(day, (byDay.get(day) ?? 0) + ((row.amount as number) ?? 1));
  }

  res.json({
    total: data?.length ?? 0,
    byKind: [...byKind.entries()].map(([kind, amount]) => ({ kind, amount })),
    byDay: [...byDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 30)
      .map(([day, amount]) => ({ day, amount })),
  });
});

/** Logs do sistema (sem dados sensíveis — os segredos são redigidos na origem). */
adminRouter.get("/logs", async (req, res) => {
  const db = requireDb();
  const query = z
    .object({
      level: z.enum(["error", "warn", "info"]).optional(),
      limit: z.coerce.number().int().min(1).max(300).default(100),
    })
    .parse(req.query);

  let builder = db
    .from("system_logs")
    .select("id,level,message,context,endpoint,provider,duration_ms,user_id,created_at")
    .order("created_at", { ascending: false })
    .limit(query.limit);
  if (query.level) builder = builder.eq("level", query.level);

  const { data, error } = await builder;
  if (error) throw AppError.internal("Não foi possível carregar os logs.");
  res.json({ logs: data ?? [] });
});

/** Configurações administrativas (app_settings). */
adminRouter.get("/settings", async (_req, res) => {
  const db = requireDb();
  const { data, error } = await db.from("app_settings").select("key,value,updated_at");
  if (error) throw AppError.internal("Não foi possível carregar as configurações.");
  res.json({
    settings: data ?? [],
    serverConfig: {
      env: env.NODE_ENV,
      appUrl: env.APP_URL,
      aiBaseUrl: integrations.ai ? env.AI_BASE_URL : null,
      aiModel: integrations.ai ? env.AI_MODEL : null,
      quotas: { ...quotas },
    },
  });
});

/** Atualiza uma configuração administrativa. */
adminRouter.put("/settings", async (req, res) => {
  const input = parseBody(
    z.object({ key: z.string().trim().min(2).max(80), value: z.unknown() }),
    req.body,
  );
  const db = requireDb();
  const { data, error } = await db
    .from("app_settings")
    .upsert({ key: input.key, value: input.value, updated_at: new Date().toISOString() }, { onConflict: "key" })
    .select("key,value,updated_at")
    .single();
  if (error || !data) throw AppError.internal("Não foi possível guardar a configuração.");
  await logSystem({
    level: "info",
    message: "Configuração administrativa atualizada",
    userId: requireUser(req).id,
    context: { key: input.key },
  });
  res.json({ setting: data });
});

