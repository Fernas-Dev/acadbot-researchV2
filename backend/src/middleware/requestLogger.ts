import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

/** Log de acesso: método, rota, estado, duração e utilizador (nunca segredos). */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path === "/healthz") return;
    logger.info(
      {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Date.now() - start,
        userId: req.user?.id,
      },
      "http",
    );
  });
  next();
}
