import { createRouter } from "../lib/router.js";
import { authenticate, requireUser } from "../middleware/auth.js";
import { AppError } from "../lib/errors.js";
import { serviceClient } from "../lib/supabase.js";
import { jobManager } from "../services/research/jobManager.js";
import { validationStore } from "../services/validation/validationStore.js";
import { providerRegistry } from "../providers/registry.js";
import { quotas } from "../config/index.js";

export const dashboardRouter = createRouter();

dashboardRouter.use(authenticate);

interface Counts {
  projects: number;
  researches: number;
  savedSources: number;
  validations: number;
  citations: number;
  matrices: number;
}

async function loadCounts(userId: string): Promise<Counts> {
  const counts: Counts = {
    projects: 0,
    researches: 0,
    savedSources: 0,
    validations: validationStore.listByUser(userId, 1000).length,
    citations: 0,
    matrices: 0,
  };
  if (!serviceClient) {
    counts.researches = jobManager.listByUser(userId, 1000).length;
    return counts;
  }
  const db = serviceClient;
  const tables: Array<[keyof Counts, string]> = [
    ["projects", "projects"],
    ["researches", "research_jobs"],
    ["savedSources", "saved_sources"],
    ["citations", "citations"],
    ["matrices", "literature_matrices"],
  ];
  const results = await Promise.all(
    tables.map(async ([key, table]) => {
      const { count } = await db.from(table).select("id", { count: "exact", head: true }).eq("user_id", userId);
      return [key, count ?? 0] as const;
    }),
  );
  for (const [key, value] of results) counts[key] = value;
  return counts;
}

/** Dashboard (§9): projetos ativos, pesquisas recentes, fontes, validações e uso. */
dashboardRouter.get("/", async (req, res) => {
  const user = requireUser(req);
  const counts = await loadCounts(user.id);

  const recentResearch = jobManager.listByUser(user.id, 5).map((job) => ({
    id: job.id,
    topic: job.params.topic,
    status: job.status,
    createdAt: job.createdAt,
    resultCount: job.results.length,
    projectId: job.projectId,
  }));

  const recentValidations = validationStore.listByUser(user.id, 5).map((item) => ({
    id: item.id,
    reference: item.reference.slice(0, 160),
    status: item.detail.status,
    confidence: item.detail.confidence,
    createdAt: item.createdAt,
  }));

  let projects: Array<{ id: string; title: string; updated_at: string }> = [];
  if (serviceClient) {
    const { data } = await serviceClient
      .from("projects")
      .select("id,title,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5);
    projects = (data ?? []) as Array<{ id: string; title: string; updated_at: string }>;
  }

  const today = new Date().toISOString().slice(0, 10);
  const researchToday = jobManager
    .listByUser(user.id, 1000)
    .filter((job) => job.createdAt.startsWith(today)).length;

  res.json({
    counts,
    projects,
    recentResearch,
    recentValidations,
    usage: {
      researchToday,
      researchLimit: quotas.researchPerDay,
      validationsToday: validationStore.countToday(user.id),
      validationLimit: quotas.validationPerDay,
    },
    providers: providerRegistry.list().map((state) => ({
      id: state.instance.id,
      label: state.instance.label,
      enabled: state.enabled,
      lastError: state.lastError ?? null,
    })),
  });
});

/** Notificações do utilizador (badge do dashboard). */
dashboardRouter.get("/notifications", async (req, res) => {
  const user = requireUser(req);
  if (!serviceClient) {
    res.json({ notifications: [], unread: 0 });
    return;
  }
  const { data, error } = await serviceClient
    .from("notifications")
    .select("id,title,body,read,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw AppError.internal("Não foi possível carregar as notificações.");
  const notifications = data ?? [];
  res.json({ notifications, unread: notifications.filter((n) => !n.read).length });
});

/** Marca notificações como lidas. */
dashboardRouter.post("/notifications/read", async (req, res) => {
  const user = requireUser(req);
  if (!serviceClient) {
    res.status(204).send();
    return;
  }
  await serviceClient.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  res.status(204).send();
});
