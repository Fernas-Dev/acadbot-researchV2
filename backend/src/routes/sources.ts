import { createRouter } from "../lib/router.js";
import { authenticate } from "../middleware/auth.js";
import { getSourceById } from "../services/sources/sourcesStore.js";
import { AppError } from "../lib/errors.js";

export const sourcesRouter = createRouter();

sourcesRouter.use(authenticate);

/**
 * Detalhe de uma fonte académica (§20).
 * Campos não confirmados vêm como null — o frontend mostra "Não informado".
 */
sourcesRouter.get("/:id", async (req, res) => {
  const source = await getSourceById(req.params.id);
  if (!source) throw AppError.notFound("Fonte não encontrada.");
  res.json({ source });
});
