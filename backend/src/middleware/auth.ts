import type { NextFunction, Request, Response } from "express";
import { sha256 } from "../lib/http.js";
import { AppError } from "../lib/errors.js";
import { authVerifyClient, requireDb, authTokenCache } from "../lib/supabase.js";

export interface AuthUser {
  id: string;
  email: string;
  role: "user" | "admin";
  name: string | null;
  institution: string | null;
  studyArea: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface CachedAuth {
  user: AuthUser;
}

/**
 * Middleware de autenticação: valida o JWT do Supabase em cada pedido
 * (com cache curto) e carrega o perfil (role) do utilizador.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw AppError.unauthorized();
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) throw AppError.unauthorized();

    const cacheKey = sha256(token);
    const cached = authTokenCache.get<CachedAuth>(cacheKey);
    if (cached) {
      req.user = cached.user;
      next();
      return;
    }

    if (!authVerifyClient) {
      throw AppError.unavailable(
        "Autenticação indisponível: o Supabase não está configurado neste ambiente.",
      );
    }

    const { data, error } = await authVerifyClient.auth.getUser(token);
    if (error || !data?.user) {
      throw AppError.unauthorized("Sessão inválida ou expirada. Inicie sessão novamente.");
    }
    const userId = data.user.id;
    const email = data.user.email ?? "";

    // Perfil (role/name) — o backend usa service_role mas SEMPRE filtra por user id.
    const db = requireDb();
    const { data: profile } = await db
      .from("profiles")
      .select("role, name, institution, study_area")
      .eq("id", userId)
      .single();

    const authUser: AuthUser = {
      id: userId,
      email,
      role: profile?.role === "admin" ? "admin" : "user",
      name: (profile?.name as string | undefined) ?? null,
      institution: (profile?.institution as string | undefined) ?? null,
      studyArea: (profile?.study_area as string | undefined) ?? null,
    };

    authTokenCache.set(cacheKey, { user: authUser });
    req.user = authUser;
    next();
  } catch (error) {
    next(error);
  }
}

/** Middleware de autorização: apenas administradores. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (req.user?.role !== "admin") {
    next(AppError.forbidden("Acesso restrito a administradores."));
    return;
  }
  next();
}

/** Garante um utilizador autenticado nos handlers (evita `!` espalhado pelo código). */
export function requireUser(req: Request): AuthUser {
  if (!req.user) throw AppError.unauthorized();
  return req.user;
}
