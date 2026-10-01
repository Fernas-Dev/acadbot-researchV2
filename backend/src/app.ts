import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import { corsOrigins, isDev } from "./config/index.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

/** Fábrica da aplicação Express — separada do listen() para facilitar testes. */
export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(
    cors({
      origin: corsOrigins,
      credentials: false,
      exposedHeaders: ["Content-Disposition"],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(requestLogger);
  app.use(globalLimiter);

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", service: "acadbot-api" });
  });

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  if (isDev) {
    // eslint-disable-next-line no-console
    console.log("[app] Express inicializado (development)");
  }

  return app;
}
