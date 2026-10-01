import { createRouter } from "../lib/router.js";
import { z } from "zod";
import { authenticate, requireUser } from "../middleware/auth.js";
import { citationLimiter } from "../middleware/rateLimit.js";
import { parseBody } from "../middleware/validate.js";
import { AppError } from "../lib/errors.js";
import { requireDb } from "../lib/supabase.js";
import { formatCitation, formatAll, SUPPORTED_STYLES } from "../services/citation/formatter.js";
import { getSourceById } from "../services/sources/sourcesStore.js";
import { newId } from "../lib/http.js";
import type { AcademicSource, CitationStyle } from "../types/index.js";

export const citationsRouter = createRouter();

citationsRouter.use(authenticate);

const styleSchema = z.enum(["apa7", "abnt"]);

/** Gera citações para uma fonte da base de dados. */
citationsRouter.post("/", citationLimiter, async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(
    z.object({
      sourceId: z.string().uuid(),
      styles: z.array(styleSchema).min(1).max(4).default(["apa7", "abnt"]),
      persist: z.boolean().default(true),
    }),
    req.body,
  );

  const source = await getSourceById(input.sourceId);
  if (!source) throw AppError.notFound("Fonte não encontrada.");

  const citations = input.styles.map((style) => formatCitation(source, style));

  if (input.persist) {
    const db = requireDb();
    await db.from("citations").upsert(
      citations.map((citation) => ({
        id: newId(),
        user_id: user.id,
        source_id: input.sourceId,
        style: citation.style,
        full_text: citation.full,
        narrative: citation.narrative,
        parenthetical: citation.parenthetical,
      })),
      { onConflict: "user_id,source_id,style" },
    );
  }

  res.status(201).json({ citations, source });
});

/** Gera citações para várias fontes (ex.: seleção da biblioteca). */
citationsRouter.post("/bulk", citationLimiter, async (req, res) => {
  const input = parseBody(
    z.object({
      sourceIds: z.array(z.string().uuid()).min(1).max(100),
      style: styleSchema.default("apa7"),
    }),
    req.body,
  );

  const items: Array<{ sourceId: string; citation: ReturnType<typeof formatCitation>; source: AcademicSource }> = [];
  for (const sourceId of input.sourceIds) {
    const source = await getSourceById(sourceId);
    if (!source) continue;
    items.push({ sourceId, citation: formatCitation(source, input.style), source });
  }
  res.json({ items, style: input.style });
});

/** Todos os estilos suportados para uma fonte. */
citationsRouter.get("/:sourceId/all", async (req, res) => {
  const source = await getSourceById(req.params.sourceId);
  if (!source) throw AppError.notFound("Fonte não encontrada.");
  res.json({ citations: formatAll(source), styles: SUPPORTED_STYLES });
});

/** Citações guardadas pelo utilizador. */
citationsRouter.get("/", async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  const query = z
    .object({ style: styleSchema.optional(), limit: z.coerce.number().int().min(1).max(200).default(100) })
    .parse(req.query);

  let builder = db
    .from("citations")
    .select("id,style,full_text,narrative,parenthetical,created_at,source_id,source:sources(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(query.limit);
  if (query.style) builder = builder.eq("style", query.style);

  const { data, error } = await builder;
  if (error) throw AppError.internal("Não foi possível carregar as citações.");

  res.json({
    citations: (data ?? []).map((row) => ({
      id: row.id,
      style: row.style as CitationStyle,
      full: row.full_text,
      narrative: row.narrative,
      parenthetical: row.parenthetical,
      createdAt: row.created_at,
      sourceId: row.source_id,
      source: row.source,
    })),
    supportedStyles: SUPPORTED_STYLES,
  });
});

/** Remove uma citação guardada. */
citationsRouter.delete("/:id", async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  const { error, count } = await db
    .from("citations")
    .delete({ count: "exact" })
    .eq("id", req.params.id)
    .eq("user_id", user.id);
  if (error) throw AppError.internal("Não foi possível remover a citação.");
  if (!count) throw AppError.notFound("Citação não encontrada.");
  res.status(204).send();
});
