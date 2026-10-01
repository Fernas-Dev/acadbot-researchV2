import type { ZodTypeAny, z } from "zod";
import { AppError } from "../lib/errors.js";

/** Validação de inputs com zod — erros viram 400 com mensagem clara. */
export function parseBody<S extends ZodTypeAny>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
      .join("; ");
    throw AppError.badRequest(`Dados inválidos — ${issues}`, result.error.flatten());
  }
  return result.data as z.infer<S>;
}

export function parseQuery<S extends ZodTypeAny>(schema: S, query: unknown): z.infer<S> {
  return parseBody(schema, query);
}
