import { createRouter } from "../lib/router.js";
import { z } from "zod";
import { authenticate, requireUser } from "../middleware/auth.js";
import { parseBody } from "../middleware/validate.js";
import { AppError } from "../lib/errors.js";
import { requireDb, DB_UNCONFIGURED_MESSAGE, serviceClient } from "../lib/supabase.js";
import { integrations } from "../config/index.js";

export const authRouter = createRouter();

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  institution: z.string().trim().max(200).nullish(),
  studyArea: z.string().trim().max(200).nullish(),
});

const PROFILE_COLUMNS = "id,email,name,institution,study_area,role,created_at,updated_at";

/**
 * Configuração pública necessária ao frontend (nunca expõe segredos).
 * Indica claramente quando uma integração não está configurada (§58).
 */
authRouter.get("/public-config", (_req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL ?? null,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? null,
    integrations: {
      supabase: integrations.supabase,
      ai: integrations.ai,
      aiModel: integrations.ai ? process.env.AI_MODEL ?? null : null,
    },
  });
});

/** Perfil do utilizador autenticado (criado automaticamente pelo trigger de registo). */
authRouter.get("/me", authenticate, async (req, res) => {
  const user = requireUser(req);
  const db = requireDb();
  const { data, error } = await db.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).single();

  if (error || !data) {
    // Perfil ausente (ex.: trigger não executado) — devolvemos os dados do token
    // e informamos que o perfil completo não está disponível.
    res.json({
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        institution: user.institution,
        study_area: user.studyArea,
        role: user.role,
      },
      warning: "Não foi possível carregar o perfil completo. Confirma as migrações da base de dados.",
    });
    return;
  }
  res.json({ profile: data });
});

/** Atualiza o perfil do utilizador. */
authRouter.put("/profile", authenticate, async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(profileSchema, req.body);
  if (!serviceClient) throw AppError.unavailable(DB_UNCONFIGURED_MESSAGE);

  const { data, error } = await serviceClient
    .from("profiles")
    .upsert(
      {
        id: user.id,
        email: user.email,
        name: input.name,
        institution: input.institution ?? null,
        study_area: input.studyArea ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select(PROFILE_COLUMNS)
    .single();

  if (error || !data) throw AppError.internal("Não foi possível atualizar o perfil.");
  res.json({ profile: data });
});
