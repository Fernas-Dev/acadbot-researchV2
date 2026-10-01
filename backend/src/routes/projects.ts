import { createRouter } from "../lib/router.js";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { parseBody } from "../middleware/validate.js";
import { AppError } from "../lib/errors.js";
import { requireDb } from "../lib/supabase.js";
import { DB_UNCONFIGURED_MESSAGE } from "../lib/supabase.js";

export const projectsRouter = createRouter();

const projectSchema = z.object({
  title: z.string().trim().min(3).max(300),
  description: z.string().trim().max(4000).nullish(),
  theme: z.string().trim().max(300).nullish(),
  researchProblem: z.string().trim().max(4000).nullish(),
  objective: z.string().trim().max(2000).nullish(),
  keywords: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
});

const db = requireDb;

projectsRouter.use(authenticate);

function assertDb() {
  try {
    db();
  } catch {
    throw AppError.unavailable(DB_UNCONFIGURED_MESSAGE);
  }
}

/** Lista projetos do utilizador com contagens básicas. */
projectsRouter.get("/", async (req, res) => {
  assertDb();
  const client = requireDb();
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("user_id", req.user!.id)
    .order("updated_at", { ascending: false });
  if (error) throw AppError.internal("Não foi possível carregar os projetos.");

  const projectIds = (data ?? []).map((p) => p.id as string);
  let savedCounts = new Map<string, number>();
  let jobCounts = new Map<string, number>();
  if (projectIds.length > 0) {
    const [{ data: saved }, { data: jobs }] = await Promise.all([
      client.from("saved_sources").select("project_id").in("project_id", projectIds),
      client.from("research_jobs").select("id,project_id").in("project_id", projectIds),
    ]);
    savedCounts = new Map(
      (saved ?? []).map((s) => [s.project_id as string, (savedCounts.get(s.project_id as string) ?? 0) + 1]),
    );
    jobCounts = new Map(
      (jobs ?? []).map((j) => [j.project_id as string, (jobCounts.get(j.project_id as string) ?? 0) + 1]),
    );
  }

  res.json({
    projects: (data ?? []).map((p) => ({
      ...p,
      savedCount: savedCounts.get(p.id as string) ?? 0,
      researchCount: jobCounts.get(p.id as string) ?? 0,
    })),
  });
});

/** Cria projeto (§10). */
projectsRouter.post("/", async (req, res) => {
  assertDb();
  const input = parseBody(projectSchema, req.body);
  const client = requireDb();
  const { data, error } = await client
    .from("projects")
    .insert({
      user_id: req.user!.id,
      title: input.title,
      description: input.description ?? null,
      theme: input.theme ?? null,
      research_problem: input.researchProblem ?? null,
      objective: input.objective ?? null,
      keywords: input.keywords,
    })
    .select()
    .single();
  if (error) throw AppError.internal("Não foi possível criar o projeto.");
  res.status(201).json({ project: data });
});

/** Detalhe do projeto. */
projectsRouter.get("/:id", async (req, res) => {
  assertDb();
  const client = requireDb();
  const { data, error } = await client
    .from("projects")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id)
    .single();
  if (error || !data) throw AppError.notFound("Projeto não encontrado.");
  res.json({ project: data });
});

/** Atualiza projeto. */
projectsRouter.put("/:id", async (req, res) => {
  assertDb();
  const input = parseBody(projectSchema.partial(), req.body);
  const client = requireDb();
  const { data, error } = await client
    .from("projects")
    .update({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
      ...(input.researchProblem !== undefined ? { research_problem: input.researchProblem } : {}),
      ...(input.objective !== undefined ? { objective: input.objective } : {}),
      ...(input.keywords !== undefined ? { keywords: input.keywords } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id)
    .select()
    .single();
  if (error || !data) throw AppError.notFound("Projeto não encontrado ou sem permissão.");
  res.json({ project: data });
});

/** Remove projeto. */
projectsRouter.delete("/:id", async (req, res) => {
  assertDb();
  const client = requireDb();
  const { error, count } = await client
    .from("projects")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id);
  if (error) throw AppError.internal("Não foi possível remover o projeto.");
  if (!count) throw AppError.notFound("Projeto não encontrado.");
  res.status(204).send();
});

