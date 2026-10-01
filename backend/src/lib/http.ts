import { createHash, randomUUID } from "node:crypto";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly url: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface FetchJsonOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  method?: "GET" | "POST";
  body?: string;
  /** Contexto para logs/erros (ex.: nome do provider). */
  label?: string;
}

/**
 * GET/POST JSON com timeout e retry (429/5xx) respeitando Retry-After.
 * Usado por todos os providers — chamadas HTTP ficam centralizadas aqui.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const {
    headers = {},
    timeoutMs = 15_000,
    retries = 2,
    method = "GET",
    body,
    label = "http",
  } = options;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          "User-Agent": `AcadBotResearch/0.1 (mailto:${"" })`,
          ...headers,
        },
        signal: controller.signal,
        body,
      });
      clearTimeout(timer);

      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get("retry-after")) * 1000;
        lastError = new HttpError(response.status, `HTTP ${response.status}`, url);
        if (attempt < retries) {
          await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 600 * (attempt + 1));
          continue;
        }
        throw lastError;
      }

      if (!response.ok) {
        throw new HttpError(response.status, `HTTP ${response.status}`, url);
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;
      if (error instanceof HttpError && error.status < 500 && error.status !== 429) {
        throw error; // 4xx definitivo — não vale a pena repetir
      }
      if (attempt >= retries) break;
      await sleep(500 * (attempt + 1));
    }
  }

  const reason =
    lastError instanceof Error
      ? `${label}: ${lastError.name}${lastError.message ? ` (${lastError.message.slice(0, 120)})` : ""}`
      : `${label}: falha desconhecida`;
  throw new HttpError(502, reason, url);
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function newId(): string {
  return randomUUID();
}
