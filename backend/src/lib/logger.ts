import pino from "pino";
import { env, isDev, isTest } from "../config/index.js";

const redactPaths = [
  "authorization",
  "password",
  "token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "api_key",
  "AI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SEMANTIC_SCHOLAR_API_KEY",
  "req.headers.authorization",
  "*.password",
  "*.apiKey",
  "*.token",
];

export const logger = pino(
  isTest
    ? { level: env.LOG_LEVEL, redact: { paths: redactPaths, censor: "[REDACTED]" } }
    : {
        level: env.LOG_LEVEL,
        redact: { paths: redactPaths, censor: "[REDACTED]" },
        ...(isDev
          ? {
              transport: {
                target: "pino-pretty",
                options: { colorize: true, translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" },
              },
            }
          : {}),
      },
);
