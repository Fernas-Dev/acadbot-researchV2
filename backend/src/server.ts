import { createApp } from "./app.js";
import { env, integrations } from "./config/index.js";
import { logger } from "./lib/logger.js";
import { ensureRegistryLoaded } from "./providers/registry.js";

async function main(): Promise<void> {
  const app = createApp();

  await ensureRegistryLoaded();

  app.listen(env.PORT, () => {
    logger.info(`AcadBot Research API a escutar em http://localhost:${env.PORT}`);
    logger.info(
      `Integrações — Supabase: ${integrations.supabase ? "ok" : "NÃO CONFIGURADO"}, ` +
        `IA: ${integrations.ai ? "ok" : "opcional (não configurada)"}, ` +
        `Providers: crossref + openalex + semantic_scholar`,
    );
    if (!integrations.supabase) {
      logger.warn(
        "Supabase não configurado: autenticação e dados estarão indisponíveis até definires " +
          "SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY no ficheiro .env",
      );
    }
  });
}

main().catch((error) => {
  logger.error({ err: error }, "Falha ao arrancar o servidor");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandledRejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  process.exit(1);
});
