import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { createRouter } from "./router.js";
import { AppError } from "./errors.js";
import { errorHandler, notFoundHandler } from "../middleware/errorHandler.js";

/**
 * Express 4 não encaminha rejeições de handlers async para o error handler.
 * Estes testes garantem que o wrapper `createRouter` cobre esse caso (§47) —
 * caso contrário os pedidos ficariam pendurados e o processo poderia cair.
 */
function appWith(router: express.Router): express.Express {
  const app = express();
  app.use("/api", router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe("createRouter — erros assíncronos", () => {
  it("encaminha AppError lançado em handler async (throw direto)", async () => {
    const router = createRouter();
    router.get("/boom", async () => {
      throw AppError.notFound("Recurso de teste não encontrado.");
    });

    const res = await request(appWith(router)).get("/api/boom");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
    expect(res.body.error.message).toBe("Recurso de teste não encontrado.");
  });

  it("encaminha rejeição de promise (await falhado)", async () => {
    const router = createRouter();
    router.post("/reject", async () => {
      await Promise.reject(AppError.badRequest("Dados inválidos no teste."));
    });

    const res = await request(appWith(router)).post("/api/reject").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("converte erro técnico em mensagem genérica (nunca expõe internals)", async () => {
    const router = createRouter();
    router.get("/crash", async () => {
      throw new Error("ECONNRESET upstream provider-db-internal");
    });

    const res = await request(appWith(router)).get("/api/crash");
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(res.body)).not.toContain("ECONNRESET");
  });

  it("converte erro de erro de middleware sync em resposta estruturada", () => {
    const router = createRouter();
    router.get(
      "/sync",
      ((_req, _res, next) => {
        next(AppError.forbidden("Sem permissão (teste)."));
      }) as express.RequestHandler,
    );

    return request(appWith(router))
      .get("/api/sync")
      .expect(403)
      .expect((res) => {
        expect(res.body.error.code).toBe("FORBIDDEN");
      });
  });

  it("mantém handlers normais a responder", async () => {
    const router = createRouter();
    router.get("/ok", async (_req, res) => {
      res.json({ ok: true });
    });

    const res = await request(appWith(router)).get("/api/ok");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("preserva middleware e cadeias de múltiplos handlers", async () => {
    const router = createRouter();
    const calls: string[] = [];
    router.get(
      "/chain",
      (_req, _res, next) => {
        calls.push("middleware");
        next();
      },
      async (_req, res) => {
        calls.push("handler");
        res.json({ calls });
      },
    );

    const res = await request(appWith(router)).get("/api/chain");
    expect(res.status).toBe(200);
    expect(res.body.calls).toEqual(["middleware", "handler"]);
  });
});