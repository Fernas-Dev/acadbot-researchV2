import { createRouter } from "../lib/router.js";
import { healthRouter } from "./health.js";
import { authRouter } from "./auth.js";
import { researchRouter } from "./research.js";
import { validationRouter } from "./validation.js";
import { projectsRouter } from "./projects.js";
import { libraryRouter } from "./library.js";
import { citationsRouter } from "./citations.js";
import { matrixRouter } from "./matrix.js";
import { historyRouter } from "./history.js";
import { exportsRouter } from "./exports.js";
import { dashboardRouter } from "./dashboard.js";
import { adminRouter } from "./admin.js";
import { sourcesRouter } from "./sources.js";

/** Router principal da API (§54). */
export const apiRouter = createRouter();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/research", researchRouter);
apiRouter.use("/validation", validationRouter);
apiRouter.use("/projects", projectsRouter);
apiRouter.use("/sources", sourcesRouter);
apiRouter.use("/library", libraryRouter);
apiRouter.use("/citations", citationsRouter);
apiRouter.use("/matrix", matrixRouter);
apiRouter.use("/history", historyRouter);
apiRouter.use("/exports", exportsRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/admin", adminRouter);
