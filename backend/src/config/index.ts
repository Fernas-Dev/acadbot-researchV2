import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

/**
 * Carrega o .env na raiz do monorepo (fallback: .env local do backend).
 * Não substitui variáveis já presentes no processo.
 */
function loadEnvFile(): void {
  const candidates = [
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), ".env"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate, override: false });
      return;
    }
  }
  if (process.env.NODE_ENV !== "test") {
    // Sem .env — a app arranca em modo "não configurado" e informa o utilizador.
    console.warn(
      "[config] Ficheiro .env não encontrado. A aplicação arrancará sem integrações configuradas. Copie .env.example para .env.",
    );
  }
}

loadEnvFile();

/** Aceita string vazia como ausente (ex.: `SUPABASE_URL=` no .env). */
function cleanString(schema: z.ZodString) {
  return z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    schema.optional(),
  );
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default(process.env.NODE_ENV === "test" ? "test" : "development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  APP_URL: z.string().url().default("http://localhost:5173"),
  API_URL: z.string().url().default("http://localhost:4000"),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default(process.env.NODE_ENV === "test" ? "error" : "info"),

  // Supabase
  SUPABASE_URL: cleanString(z.string().url()),
  SUPABASE_ANON_KEY: cleanString(z.string()),
  SUPABASE_SERVICE_ROLE_KEY: cleanString(z.string()),

  // Providers académicos
  CROSSREF_MAILTO: cleanString(z.string().email()),
  SEMANTIC_SCHOLAR_API_KEY: cleanString(z.string()),
  OPENALEX_API_KEY: cleanString(z.string()),
  OPENALEX_MAILTO: cleanString(z.string().email()),

  // IA (opcional)
  AI_API_KEY: cleanString(z.string()),
  AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_MODEL: z.string().min(1).default("gpt-4o-mini"),

  // Limites / quotas
  FREE_RESEARCH_LIMIT: z.coerce.number().int().min(1).default(20),
  FREE_VALIDATION_LIMIT: z.coerce.number().int().min(1).default(100),
  FREE_BULK_MAX_REFERENCES: z.coerce.number().int().min(1).default(100),
  MAX_CONCURRENT_JOBS: z.coerce.number().int().min(1).max(10).default(2),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("[config] Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

/** Flags de integração — usadas para informar claramente quando algo não está configurado. */
export const integrations = {
  supabase: Boolean(
    env.SUPABASE_URL && env.SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY,
  ),
  ai: Boolean(env.AI_API_KEY),
  crossref: true,
  crossrefPolite: Boolean(env.CROSSREF_MAILTO),
  semanticScholar: true, // funciona sem key (limites reduzidos)
  semanticScholarKeyed: Boolean(env.SEMANTIC_SCHOLAR_API_KEY),
  openalex: true,
  openalexPolite: Boolean(env.OPENALEX_MAILTO || env.OPENALEX_API_KEY),
} as const;

export type IntegrationFlags = typeof integrations;

/** Limites de rate limiting — configuração central (não espalhada pelo código). */
export const rateLimits = {
  global: { windowMs: 60_000, max: 300 },
  research: { windowMs: 60_000, max: 10 },
  validation: { windowMs: 60_000, max: 30 },
  bulkValidation: { windowMs: 60_000, max: 5 },
  citation: { windowMs: 60_000, max: 60 },
  admin: { windowMs: 60_000, max: 60 },
} as const;

/** Quotas diárias por utilizador (plano gratuito, configurável via env). */
export const quotas = {
  researchPerDay: env.FREE_RESEARCH_LIMIT,
  validationPerDay: env.FREE_VALIDATION_LIMIT,
  bulkMaxReferences: env.FREE_BULK_MAX_REFERENCES,
} as const;

export const corsOrigins: string[] = env.CORS_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const isDev = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
