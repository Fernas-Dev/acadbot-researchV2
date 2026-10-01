import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase.js";
import { api } from "@/lib/api.js";
import type { Profile } from "@/types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  setupMessage: string;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    name: string;
    institution?: string;
    studyArea?: string;
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (input: { name: string; institution?: string | null; studyArea?: string | null }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const REDIRECT = () => `${window.location.origin}/reset-password`;

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured) {
      setProfile(null);
      return;
    }
    try {
      const data = await api.get<{ profile: Profile }>("/api/auth/me");
      setProfile(data.profile);
    } catch {
      // Perfil indisponível (Supabase/migrações) — a app continua sem bloquear.
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
      if (data.session) void loadProfile();
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) void loadProfile();
      else setProfile(null);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      if (!supabase) throw new Error(SUPABASE_SETUP_MESSAGE);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(
          error.message.toLowerCase().includes("invalid login")
            ? "Email ou palavra-passe incorretos."
            : "Não foi possível iniciar sessão. Tenta novamente.",
        );
      }
    },
    [],
  );

  const signUp = useCallback<AuthContextValue["signUp"]>(async (input) => {
    if (!supabase) throw new Error(SUPABASE_SETUP_MESSAGE);
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          name: input.name,
          institution: input.institution ?? null,
          study_area: input.studyArea ?? null,
        },
      },
    });
    if (error) {
      throw new Error(
        error.message.toLowerCase().includes("already registered")
          ? "Já existe uma conta com este email."
          : "Não foi possível criar a conta. Verifica os dados e tenta novamente.",
      );
    }
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    if (!supabase) throw new Error(SUPABASE_SETUP_MESSAGE);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT() });
    if (error) throw new Error("Não foi possível enviar o email de recuperação.");
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<void> => {
    if (!supabase) throw new Error(SUPABASE_SETUP_MESSAGE);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error("Não foi possível atualizar a palavra-passe.");
  }, []);

  const updateProfile = useCallback<AuthContextValue["updateProfile"]>(async (input) => {
    const data = await api.put<{ profile: Profile }>("/api/auth/profile", input);
    setProfile(data.profile);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      configured: isSupabaseConfigured,
      setupMessage: SUPABASE_SETUP_MESSAGE,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      updateProfile,
      refreshProfile: loadProfile,
    }),
    [session, profile, loading, signIn, signUp, signOut, resetPassword, updatePassword, updateProfile, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return context;
}
