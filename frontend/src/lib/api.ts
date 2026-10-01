import { supabase } from "./supabase.js";
import type { ExportFormat, ExportKind } from "@/types";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Envolve erros técnicos em mensagens claras para o utilizador (§47). */
async function toApiError(response: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  const error = (payload as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
  const message =
    error?.message ??
    (response.status >= 500
      ? "Ocorreu um erro inesperado no servidor. Tente novamente em instantes."
      : "Não foi possível concluir o pedido. Verifica os dados e tenta novamente.");
  return new ApiError(response.status, error?.code ?? "UNKNOWN", message, error?.details);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(await authHeaders()),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Não foi possível contactar o servidor. Verifica a tua ligação e se a API está a correr.",
    );
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};

/** Exportações: transferência de ficheiro binário gerada no backend (§32). */
export async function apiDownload(
  body: { kind: ExportKind; format: ExportFormat; [key: string]: unknown },
  fallbackName: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/exports`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Não foi possível contactar o servidor para exportar.");
  }

  if (!response.ok) throw await toApiError(response);

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const fileName = match?.[1] ?? fallbackName;
  const blob = await response.blob();

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const API_BASE_URL = API_URL;
