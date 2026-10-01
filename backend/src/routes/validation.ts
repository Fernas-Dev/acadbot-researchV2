import { createRouter } from "../lib/router.js";
import { z } from "zod";
import { authenticate, requireUser } from "../middleware/auth.js";
import { validationLimiter, bulkValidationLimiter } from "../middleware/rateLimit.js";
import { parseBody } from "../middleware/validate.js";
import { AppError } from "../lib/errors.js";
import { newId } from "../lib/http.js";
import { validateReference } from "../services/validation/validator.js";
import { verifyDOI } from "../services/validation/doiValidator.js";
import { parseReference } from "../services/validation/referenceParser.js";
import { validationStore } from "../services/validation/validationStore.js";
import { logSystem } from "../lib/systemLogs.js";
import { quotas } from "../config/index.js";

export const validationRouter = createRouter();

const validateSchema = z.object({
  reference: z.string().trim().min(10, "Referência demasiado curta").max(2000),
  projectId: z.string().uuid().nullish(),
});

const doiSchema = z.object({
  doi: z.string().trim().min(6).max(200),
  reference: z.string().trim().max(2000).optional(),
});

function publicValidation(record: ReturnType<typeof validationStore.get>) {
  if (!record) return null;
  return {
    id: record.id,
    reference: record.reference,
    createdAt: record.createdAt,
    status: record.detail.status,
    confidence: record.detail.confidence,
    outcome: record.detail.outcome,
    parsed: record.detail.parsed,
    matches: record.detail.matches,
    providersQueried: record.detail.providersQueried,
    providersFailed: record.detail.providersFailed,
    doiVerification: record.detail.doiVerification,
  };
}

/** Validação de uma referência (§21-23). */
validationRouter.post("/", authenticate, validationLimiter, async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(validateSchema, req.body);

  if (validationStore.countToday(user.id) >= quotas.validationPerDay) {
    throw AppError.tooMany(
      `Limite diário de ${quotas.validationPerDay} validações atingido. Tente novamente amanhã.`,
    );
  }

  const started = Date.now();
  const detail = await validateReference(input.reference);
  const record = validationStore.create(newId(), user.id, input.reference, detail);
  await logSystem({
    level: "info",
    message: "Validação de referência",
    userId: user.id,
    provider: "validation",
    durationMs: Date.now() - started,
    context: { validationId: record.id, status: detail.status },
  });
  res.status(201).json({ validation: publicValidation(record) });
});

/** Verificação de DOI (§25). */
validationRouter.post("/doi", authenticate, validationLimiter, async (req, res) => {
  const input = parseBody(doiSchema, req.body);
  const parsed = input.reference ? parseReference(input.reference) : undefined;
  const verification = await verifyDOI(input.doi, parsed);
  res.json({ verification });
});

/** Validação em massa (§24) — processa sequencialmente, com limite por pedido. */
validationRouter.post("/bulk", authenticate, bulkValidationLimiter, async (req, res) => {
  const user = requireUser(req);
  const input = parseBody(
    z.object({
      references: z.array(z.string().trim().min(10).max(2000)).min(1).max(quotas.bulkMaxReferences),
      projectId: z.string().uuid().nullish(),
    }),
    req.body,
  );

  const usedToday = validationStore.countToday(user.id);
  const allowance = Math.max(0, quotas.validationPerDay - usedToday);
  const batch = input.references.slice(0, Math.max(1, allowance));
  const skipped = input.references.length - batch.length;

  const items: Array<Record<string, unknown>> = [];
  let index = 0;
  for (const reference of batch) {
    index += 1;
    try {
      const detail = await validateReference(reference);
      const record = validationStore.create(newId(), user.id, reference, detail);
      items.push({
        number: index,
        id: record.id,
        reference,
        status: detail.status,
        confidence: detail.confidence,
        problems: detail.outcome.problems,
        message: detail.outcome.message,
      });
    } catch {
      items.push({
        number: index,
        id: null,
        reference,
        status: "unconfirmed",
        confidence: 0,
        problems: ["Não foi possível validar esta referência agora. Tente novamente."],
        message: "Erro ao validar — tente novamente individualmente.",
      });
    }
  }

  await logSystem({
    level: "info",
    message: "Validação em massa",
    userId: user.id,
    provider: "validation",
    context: { total: input.references.length, processed: items.length, skipped },
  });

  res.status(201).json({ items, skipped, quotaRemaining: Math.max(0, allowance - items.length) });
});

/** Histórico de validações do utilizador. */
validationRouter.get("/", authenticate, async (req, res) => {
  const items = validationStore.listByUser(requireUser(req).id, 100).map((v) => publicValidation(v));
  res.json({ validations: items });
});

/** Detalhe de uma validação. */
validationRouter.get("/:id", authenticate, async (req, res) => {
  const record = validationStore.get(req.params.id);
  if (!record || record.userId !== requireUser(req).id) {
    throw AppError.notFound("Validação não encontrada.");
  }
  res.json({ validation: publicValidation(record) });
});

