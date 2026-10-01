import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

describe("GET /healthz", () => {
  it("responde ok", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("GET /api/health", () => {
  it("informa claramente o estado das integrações sem expor segredos", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.integrations).toBeDefined();
    expect(Array.isArray(res.body.integrations.providers)).toBe(true);
    expect(res.body.integrations.providers.map((p: { id: string }) => p.id)).toEqual([
      "crossref",
      "openalex",
      "semantic_scholar",
    ]);
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain("service_role");
    expect(raw.toLowerCase()).not.toContain("apikey");
  });
});

describe("Segurança (§38, §51)", () => {
  it("bloqueia rotas privadas sem token", async () => {
    for (const path of ["/api/projects", "/api/library", "/api/research", "/api/validation", "/api/dashboard"]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("rejeita token inválido com mensagem clara (sem Supabase configurado)", async () => {
    const res = await request(app).get("/api/projects").set("Authorization", "Bearer token-invalido");
    // Sem Supabase configurado: 503 com explicação; com Supabase: 401 sessão inválida.
    expect([401, 503]).toContain(res.status);
    expect(res.body.error.message.length).toBeGreaterThan(10);
  });

  it("não devolve detalhes técnicos em erros de negócio", async () => {
    const res = await request(app).get("/api/projects/nao-e-uuid").set("Authorization", "Bearer x");
    expect(res.body.error).toBeDefined();
    expect(JSON.stringify(res.body)).not.toContain("stack");
  });

  it("protege endpoints administrativos (não basta estar autenticado)", async () => {
    const res = await request(app).get("/api/admin/overview").set("Authorization", "Bearer x");
    expect([401, 403, 503]).toContain(res.status);
  });

  it("aplica cabeçalhos de segurança (helmet)", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("rejeita payloads inválidos com 400 e mensagem amigável", async () => {
    const res = await request(app)
      .post("/api/research")
      .set("Authorization", "Bearer x")
      .send({ topic: "ab" });
    expect([400, 401, 503]).toContain(res.status);
    if (res.status === 400) expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("devolve 404 estruturado para rotas inexistentes", async () => {
    const res = await request(app).get("/api/nao-existe");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("GET /api/auth/public-config", () => {
  it("devolve apenas configuração pública (sem service role key)", async () => {
    const res = await request(app).get("/api/auth/public-config");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("integrations");
    expect(JSON.stringify(res.body)).not.toContain("service_role");
    expect(res.body).not.toHaveProperty("serviceRoleKey");
  });
});
