import { createRouter } from "../lib/router.js";
import { integrations, env } from "../config/index.js";
import { providerRegistry } from "../providers/registry.js";
import { serviceClient } from "../lib/supabase.js";
import { sleep } from "../lib/http.js";

export const healthRouter = createRouter();

healthRouter.get("/", async (_req, res) => {
  let dbReachable: boolean | null = null;
  if (serviceClient) {
    try {
      const probe = (async () => {
        const { error } = await serviceClient!.from("profiles").select("id").limit(1);
        return !error;
      })();
      const result = await Promise.race([
        probe,
        sleep(4000).then(() => null),
      ]);
      dbReachable = result === null ? null : result;
    } catch {
      dbReachable = false;
    }
  }

  res.json({
    status: "ok",
    service: "acadbot-api",
    version: "0.1.0",
    time: new Date().toISOString(),
    env: env.NODE_ENV,
    integrations: {
      supabase: integrations.supabase,
      dbReachable,
      ai: integrations.ai,
      providers: providerRegistry.list().map((state) => ({
        id: state.instance.id,
        label: state.instance.label,
        enabled: state.enabled,
        priority: state.priority,
        lastError: state.lastError ?? null,
      })),
    },
  });
});
