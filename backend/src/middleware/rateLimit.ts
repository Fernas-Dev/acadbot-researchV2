import rateLimit from "express-rate-limit";
import { rateLimits } from "../config/index.js";

const jsonMessage = {
  error: {
    code: "RATE_LIMITED",
    message: "Demasiados pedidos. Aguarde um momento antes de tentar novamente.",
  },
};

function makeLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: jsonMessage,
  });
}

/** Configuração central de rate limiting (§39) — não espalhada pelo código. */
export const globalLimiter = makeLimiter(rateLimits.global.windowMs, rateLimits.global.max);
export const researchLimiter = makeLimiter(rateLimits.research.windowMs, rateLimits.research.max);
export const validationLimiter = makeLimiter(
  rateLimits.validation.windowMs,
  rateLimits.validation.max,
);
export const bulkValidationLimiter = makeLimiter(
  rateLimits.bulkValidation.windowMs,
  rateLimits.bulkValidation.max,
);
export const citationLimiter = makeLimiter(rateLimits.citation.windowMs, rateLimits.citation.max);
export const adminLimiter = makeLimiter(rateLimits.admin.windowMs, rateLimits.admin.max);
