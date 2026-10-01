import { z } from "zod";
import { env, integrations } from "../../config/index.js";
import { fetchJson } from "../../lib/http.js";
import { logger } from "../../lib/logger.js";
import { AI_SYSTEM_RULES } from "./prompts.js";

/**
 * Cliente de IA — SEMPRE no backend (§4). Sem AI_API_KEY, todas as funções
 * devolvem `null` e o sistema continua a funcionar de forma determinística.
 * As respostas são validadas por schema antes de serem usadas (§57).
 */
interface ChatCompletion {
  choices?: Array<{ message?: { content?: string } }>;
}

export function isAiEnabled(): boolean {
  return integrations.ai;
}

export interface AiJsonRequest<T> {
  schema: z.ZodType<T>;
  instruction: string;
  context: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Pede ao modelo uma resposta JSON e valida-a. Em qualquer falha
 * (rede, JSON inválido, schema inválido) devolve `null` — nunca
 * inventamos dados nem usamos respostas não validadas.
 */
export async function completeJson<T>(request: AiJsonRequest<T>): Promise<T | null> {
  if (!isAiEnabled()) return null;

  const started = Date.now();
  try {
    const data = await fetchJson<ChatCompletion>(`${env.AI_BASE_URL}/chat/completions`, {
      method: "POST",
      label: "ai",
      timeoutMs: 30_000,
      retries: 1,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens ?? 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: AI_SYSTEM_RULES },
          { role: "user", content: `${request.instruction}\n\n${request.context}` },
        ],
      }),
    });

    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    const result = request.schema.safeParse(parsed);
    if (!result.success) {
      logger.warn({ issues: result.error.issues.slice(0, 5) }, "Resposta de IA inválida — ignorada");
      return null;
    }
    logger.debug({ durationMs: Date.now() - started }, "IA respondeu com JSON válido");
    return result.data;
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : String(error) },
      "Falha na chamada de IA — a continuar sem IA",
    );
    return null;
  }
}
