import { Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout.js";
import { useAuth } from "@/hooks/useAuth.js";
import { LoadingBlock } from "@/components/common/states.js";

/** Protege todas as páginas privadas (§8). */
export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }): JSX.Element {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingBlock label="A verificar sessão…" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (adminOnly && profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppLayout />;
}

/** Redireciona utilizadores autenticados para fora das páginas públicas (auth/landing). */
export function RedirectIfAuthenticated({ children }: { children: JSX.Element }): JSX.Element {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingBlock label="A carregar…" />
      </div>
    );
  }
  if (session) return <Navigate to="/dashboard" replace />;
  return children;
}
