import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { logSystem } from "../lib/systemLogs.js";
import { isDev } from "../config/index.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Endpoint não encontrado." },
  });
}

/**
 * Tratamento central de erros: erros técnicos nunca chegam ao utilizador
 * tal como ocorreram; são convertidos em mensagens claras (§47).
 */
export async function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<Response> {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ code: err.code, path: req.path, userId: req.user?.id, details: err.details }, err.message);
    }
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
  }

  const message = err instanceof Error ? err.message : String(err);

  // Corpo JSON malformado (body-parser): 400 claro em vez de 500 técnico (§47).
  if (message.includes("in JSON") || (err instanceof SyntaxError && "body" in (err as object))) {
    return res.status(400).json({
      error: {
        code: "BAD_REQUEST",
        message: "O corpo do pedido não é um JSON válido. Verifique a sintaxe e tente novamente.",
      },
    });
  }

  logger.error(
    { err, path: req.path, method: req.method, userId: req.user?.id },
    "Erro não tratado",
  );
  await logSystem({
    level: "error",
    message: message.slice(0, 1000),
    endpoint: `${req.method} ${req.path}`,
    userId: req.user?.id ?? null,
    context: { path: req.path, method: req.method },
  });

  const body: { error: { code: string; message: string; details?: unknown } } = {
    error: {
      code: "INTERNAL_ERROR",
      message: "Ocorreu um erro inesperado. Tente novamente em instantes.",
    },
  };
  if (isDev && err instanceof Error) body.error.details = err.stack;
  return res.status(500).json(body);
}
