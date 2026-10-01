import { Router } from "express";
import type { NextFunction, Request, RequestHandler, Response } from "express";

type AnyHandler = RequestHandler | RequestHandler[] | ((req: Request, res: Response, next: NextFunction) => unknown);

/**
 * Express 4 não encaminha rejeições de handlers `async` para o error handler
 * (resulta em unhandled rejection e pedido pendurado). Este wrapper garante
 * que qualquer erro assíncrono chega ao middleware central de erros (§47).
 */
function wrapHandler(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    try {
      const result: unknown = handler(req, res, next);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        (result as Promise<unknown>).catch(next);
      }
    } catch (error) {
      next(error);
    }
  };
}

function wrapArgument(argument: AnyHandler): AnyHandler {
  if (typeof argument === "function") return wrapHandler(argument as RequestHandler);
  if (Array.isArray(argument)) return argument.map((item) => wrapHandler(item));
  return argument;
}

/**
 * Router com handlers async protegidos. Usar em vez de `Router()` em todos
 * os módulos de rotas — mantém o tratamento de erros consistente.
 */
export function createRouter(): Router {
  const router = Router();
  const methods = ["get", "post", "put", "patch", "delete", "all", "use"] as const;

  for (const method of methods) {
    const original = router[method].bind(router) as (...args: unknown[]) => unknown;
    (router as unknown as Record<string, unknown>)[method] = (...args: unknown[]): unknown =>
      original(...args.map((argument) => wrapArgument(argument as AnyHandler)));
  }

  return router;
}