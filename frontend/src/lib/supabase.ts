import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "";
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/**
 * O frontend usa apenas a anon key (pública por design) para o Supabase Auth.
 * Nenhuma secret key (service_role, IA, providers) existe no frontend (§4, §37).
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabase);

export const SUPABASE_SETUP_MESSAGE =
  "A autenticação não está configurada neste ambiente. Adiciona VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ao ficheiro .env (e reinicia o servidor de desenvolvimento).";
