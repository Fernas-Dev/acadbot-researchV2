import { createRouter } from "../lib/router.js";
import { z } from "zod";
import { authenticate, requireUser } from "../middleware/auth.js";
import { parseBody } from "../middleware/validate.js";
import { AppError } from "../lib/errors.js";
import { requireDb } from "../lib/supabase.js";
import { upsertSources, fromRow, type SourceRow } from "../services/sources/sourcesStore.js";
import { computeFingerprint } from "../services/research/normalize.js";
import type { AcademicSource } from "../types/index.js";

export const libraryRouter = createRouter();

libraryRouter.use(authenticate);

const sourceSchema = z.object({
  fingerprint: z.string().min(3).optional(),
  title: z.string().trim().min(2).max(1000),
  authors: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(300),
        family: z.string().nullish(),
        given: z.string().nullish(),
      }),
    )
    .max(60)
    .default([]),
  year: z.number().int().nullable().optional(),
  abstract: z.string().max(20000).nullish(),
  journal: z.string().max(500).nullish(),
  publisher: z.string().max(500).nullish(),
  volume: z.string().max(60).nullish(),
  issue: z.string().max(60).nullish(),
  pages: z.string().max(60).nullish(),
  doi: z.string().max(300).nullish(),
  isbn: z.string().max(60).nullish(),
  url: z.string().max(2000).nullish(),
  type: z
    .enum(["article", "book", "thesis", "dissertation", "report", "conference", "working_paper", "other"])
    .default("other"),
  citationCount: z.number().int().nullable().optional(),
  keywords: z.array(z.string().max(120)).max(20).default([]),
  language: z.string().max(20).nullish(),
  openAccess: z.boolean().default(false),
  providers: z
    .array(z.object({ provider: z.enum(["crossref", "semantic_scholar", "openalex"]), externalId: z.string().max(500) }))
    .max(5)
    .default([]),
  metadata: z.record(z.unknown()).default({}),
});

const saveSchema = z.object({
  sourceId: z.string().uuid().nullish(),
  source: sourceSchema.nullish(),
  projectId: z.string().uuid().nullish(),
  status: z.enum(["unread", "reading", "read", "important"]).default("unread"),
  notes: z.string().max(4000).nullish(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
});

const updateSchema = z.object({
  status: z.enum(["unread", "reading", "read", "important"]).optional(),
  notes: z.string().max(4000).nullish(),
  projectId: z.string().uuid().nullish(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
});

const READING_STATUS = ["unread", "reading", "read", "important"] as const;

/** Cria (ou devolve) tags do utilizador pelos nomes indicados. */
async function ensureTags(userId: string, names: string[]): Promise<string[]> {
  const db = requireDb();
  const cleaned = [...new Set(names.map((n) => n.replace(/^#/, "").trim()).filter(Boolean))];
  if (cleaned.length === 0) return [];

  await db.from("tags").upsert(
    cleaned.map((name) => ({ user_id: userId, name })),
    { onConflict: "user_id,name", ignoreDuplicates: true },
  );

  const { data, error } = await db.from("tags").select("id,name").eq("user_id", userId).in("name", cleaned);
  if (error) throw AppError.internal("Não foi possível guardar as tags.");
  return (data ?? []).map((t) => t.id as string);
}

/** Substitui as tags associadas a uma fonte guardada. */
async function replaceTags(userId: string, savedSourceId: string, names: string[]): Promise<void> {
  const db = requireDb();
  const tagIds = await ensureTags(userId, names);
  await db.from("source_tags").delete().eq("saved_source_id", savedSourceId).eq("user_id", userId);
  if (tagIds.length > 0) {
    const { error } = await db
      .from("source_tags")
      .insert(tagIds.map((tagId) => ({ user_id: userId, saved_source_id: savedSourceId, tag_id: tagId })));
    if (error) throw AppError.internal("Não foi possível associar as tags.");
  }
}

/** Carrega tags por saved_source id. */
async function tagsBySavedSource(userId: string, savedIds: string[]): Promise<Map<string, string[]>> {
  const db = requireDb();
  const map = new Map<string, string[]>();
  if (savedIds.length === 0) return map;
  const { data } = await db
    .from("source_tags")
    .select("saved_source_id,tag_id")
    .eq("user_id", userId)
    .in("saved_source_id", savedIds);
  const tagIds = [...new Set((data ?? []).map((row) => row.tag_id as string))];
  if (tagIds.length === 0) return map;
  const { data: tags } = await db.from("tags").select("id,name").eq("user_id", userId).in("id", tagIds);
  const nameById = new Map((tags ?? []).map((t) => [t.id as string, t.name as string]));
  for (const row of data ?? []) {
    const name = nameById.get(row.tag_id as string);
    if (!name) continue;
    const key = row.saved_source_id as string;
    map.set(key, [...(map.get(key) ?? []), name]);
  }
  return map;
}

/** Biblioteca (§26): listar, filtrar, ordenar, guardar, atualizar e remover fontes. */
libraryRouter.get("/", async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  const query = z
    .object({
      search: z.string().trim().max(200).optional(),
      status: z.enum(READING_STATUS).optional(),
      projectId: z.string().uuid().optional(),
      sort: z.enum(["recent", "year_desc", "year_asc", "title"]).default("recent"),
      limit: z.coerce.number().int().min(1).max(200).default(100),
    })
    .parse(req.query);

  let builder = db
    .from("saved_sources")
    .select("id,status,notes,project_id,created_at,updated_at,source:sources(*)")
    .eq("user_id", user.id)
    .limit(query.limit);

  if (query.status) builder = builder.eq("status", query.status);
  if (query.projectId) builder = builder.eq("project_id", query.projectId);

  const { data, error } = await builder;
  if (error) throw AppError.internal("Não foi possível carregar a biblioteca.");

  type Row = {
    id: string;
    status: string;
    notes: string | null;
    project_id: string | null;
    created_at: string;
    source: SourceRow | null;
  };
  let items = ((data ?? []) as unknown as Row[]).filter((row) => row.source !== null);
  const tagMap = await tagsBySavedSource(user.id, items.map((row) => row.id));

  const search = query.search?.toLowerCase();
  if (search) {
    items = items.filter((row) => {
      const haystack = `${row.source?.title ?? ""} ${(row.source?.authors ?? [])
        .map((a) => a.name)
        .join(" ")} ${row.source?.doi ?? ""} ${row.notes ?? ""}`.toLowerCase();
      return haystack.includes(search);
    });
  }

  const sorters: Record<string, (a: Row, b: Row) => number> = {
    recent: (a, b) => b.created_at.localeCompare(a.created_at),
    year_desc: (a, b) => (b.source?.year ?? 0) - (a.source?.year ?? 0),
    year_asc: (a, b) => (a.source?.year ?? 0) - (b.source?.year ?? 0),
    title: (a, b) => (a.source?.title ?? "").localeCompare(b.source?.title ?? ""),
  };
  items.sort(sorters[query.sort]);

  res.json({
    items: items.map((row) => ({
      id: row.id,
      status: row.status,
      notes: row.notes,
      projectId: row.project_id,
      savedAt: row.created_at,
      tags: tagMap.get(row.id) ?? [],
      source: row.source ? fromRow(row.source) : null,
    })),
  });
});

/** Guarda uma fonte na biblioteca (§26) — por id existente ou por objeto completo. */
libraryRouter.post("/", async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(saveSchema, req.body);
  const db = requireDb();

  let sourceId = input.sourceId ?? null;
  if (!sourceId) {
    if (!input.source) {
      throw AppError.badRequest("Indica a fonte a guardar (sourceId ou objeto source).");
    }
    const source = input.source as AcademicSource;
    const finalized: AcademicSource = {
      ...source,
      year: source.year ?? null,
      abstract: source.abstract ?? null,
      journal: source.journal ?? null,
      publisher: source.publisher ?? null,
      volume: source.volume ?? null,
      issue: source.issue ?? null,
      pages: source.pages ?? null,
      doi: source.doi ?? null,
      isbn: source.isbn ?? null,
      url: source.url ?? null,
      language: source.language ?? null,
      citationCount: source.citationCount ?? null,
      fingerprint: source.fingerprint ?? computeFingerprint(source),
    };
    const map = await upsertSources([finalized]);
    sourceId = map.get(finalized.fingerprint) ?? null;
  }

  if (!sourceId) throw AppError.internal("Não foi possível guardar a fonte.");

  const { data, error } = await db
    .from("saved_sources")
    .upsert(
      {
        user_id: user.id,
        source_id: sourceId,
        project_id: input.projectId ?? null,
        status: input.status,
        notes: input.notes ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,source_id" },
    )
    .select("id,status,notes,project_id,created_at")
    .single();

  if (error || !data) throw AppError.internal("Não foi possível guardar a fonte.");
  if (input.tags.length > 0) await replaceTags(user.id, data.id as string, input.tags);

  res.status(201).json({ item: { ...data, tags: input.tags } });
});

/** Atualiza estado, notas, projeto e tags de uma fonte guardada. */
libraryRouter.patch("/:id", async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(updateSchema, req.body);
  const db = requireDb();

  const { data, error } = await db
    .from("saved_sources")
    .update({
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.projectId !== undefined ? { project_id: input.projectId ?? null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id)
    .eq("user_id", user.id)
    .select("id,status,notes,project_id")
    .single();

  if (error || !data) throw AppError.notFound("Fonte não encontrada na tua biblioteca.");
  if (input.tags !== undefined) await replaceTags(user.id, data.id as string, input.tags);

  res.json({ item: { ...data, tags: input.tags } });
});

/** Remove uma fonte da biblioteca. */
libraryRouter.delete("/:id", async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  const { error, count } = await db
    .from("saved_sources")
    .delete({ count: "exact" })
    .eq("id", req.params.id)
    .eq("user_id", user.id);
  if (error) throw AppError.internal("Não foi possível remover a fonte.");
  if (!count) throw AppError.notFound("Fonte não encontrada na tua biblioteca.");
  res.status(204).send();
});
/** Lista as tags do utilizador com contagem de uso. */
libraryRouter.get("/tags", async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  const { data: tags, error } = await db
    .from("tags")
    .select("id,name,color")
    .eq("user_id", user.id)
    .order("name");
  if (error) throw AppError.internal("Não foi possível carregar as tags.");
  const { data: links } = await db.from("source_tags").select("tag_id").eq("user_id", user.id);
  const counts = new Map<string, number>();
  for (const link of links ?? []) {
    const key = link.tag_id as string;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  res.json({ tags: (tags ?? []).map((t) => ({ ...t, count: counts.get(t.id as string) ?? 0 })) });
});

/** Cria (ou devolve) uma tag (§27). */
libraryRouter.post("/tags", async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(
    z.object({
      name: z.string().trim().min(1).max(40),
      color: z.string().trim().max(20).nullish(),
    }),
    req.body,
  );
  const db = requireDb();
  const clean = input.name.replace(/^#/, "").trim();
  const { data, error } = await db
    .from("tags")
    .upsert({ user_id: user.id, name: clean, color: input.color ?? null }, { onConflict: "user_id,name" })
    .select("id,name,color")
    .single();
  if (error || !data) throw AppError.internal("Não foi possível criar a tag.");
  res.status(201).json({ tag: data });
});

/** Remove uma tag e as suas associações. */
libraryRouter.delete("/tags/:tagId", async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  await db.from("source_tags").delete().eq("user_id", user.id).eq("tag_id", req.params.tagId);
  const { error, count } = await db
    .from("tags")
    .delete({ count: "exact" })
    .eq("id", req.params.tagId)
    .eq("user_id", user.id);
  if (error) throw AppError.internal("Não foi possível remover a tag.");
  if (!count) throw AppError.notFound("Tag não encontrada.");
  res.status(204).send();
});



