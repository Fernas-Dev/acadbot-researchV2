import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, integrations } from "../config/index.js";
import { AppError } from "./errors.js";
import { tokenCache } from "./cache.js";

/**
 * Clientes Supabase — apenas no backend.
 * - serviceClient: service_role, usado para acesso a dados com escopo
 *   manual por utilizador (espelha as políticas RLS em código).
 * - authVerifyClient: anon key, usado apenas para validar JWTs recebidos.
 * Nunca são expostos ao frontend.
 */
export const serviceClient: SupabaseClient | null = integrations.supabase
  ? createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export const authVerifyClient: SupabaseClient | null = integrations.supabase
  ? createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

/** Cliente que falha com mensagem clara quando o Supabase não está configurado. */
export function requireDb(): SupabaseClient {
  if (!serviceClient) {
    throw AppError.unavailable(
      "Serviço de dados indisponível: o Supabase não está configurado neste ambiente. " +
        "Defina SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY no ficheiro .env.",
    );
  }
  return serviceClient;
}

export const DB_UNCONFIGURED_MESSAGE =
  "Serviço de dados indisponível: o Supabase não está configurado neste ambiente.";

/** Cache de verificação de tokens — reduz chamadas de rede por pedido. */
export { tokenCache as authTokenCache };
