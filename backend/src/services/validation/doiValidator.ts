import { crossrefProvider } from "../../providers/crossref.js";
import { openalexProvider } from "../../providers/openalex.js";
import { finalizeSource } from "../research/normalize.js";
import { isValidDoiFormat, normalizeDoi } from "../../lib/text.js";
import { similarity } from "../../lib/text.js";
import type { AcademicSource, DoiVerification, ParsedReference } from "../../types/index.js";

function authorSurnames(source: AcademicSource): string[] {
  return source.authors.map((a) => (a.family ?? a.name).trim().toLowerCase()).filter(Boolean);
}

/**
 * DOI Validator (§25): consulta o provider apropriado e compara
 * DOI, título, autor e ano com a referência informada (quando fornecida).
 * Nunca assume correspondência sem verificar os dados.
 */
export async function verifyDOI(doiInput: string, ref?: ParsedReference): Promise<DoiVerification> {
  const doi = normalizeDoi(doiInput);
  if (!doi || !isValidDoiFormat(doi)) {
    return {
      found: false,
      message: "DOI inválido ou num formato não reconhecido. Verifique o identificador.",
      conflicts: [],
    };
  }

  // Crossref é o registry oficial de DOIs; OpenAlex como fallback.
  let source: AcademicSource | null = await crossrefProvider.getById(doi).then((r) => (r ? finalizeSource(r) : null));
  if (!source) {
    const oa = await openalexProvider.getById(`doi:${doi}`);
    source = oa ? finalizeSource(oa) : null;
  }

  if (!source) {
    return {
      found: false,
      message: "DOI não encontrado nas fontes consultadas (Crossref/OpenAlex).",
      conflicts: [],
    };
  }

  const conflicts: string[] = [];
  if (ref) {
    if (ref.title && source.title && similarity(ref.title, source.title) < 0.75) {
      conflicts.push(
        `Título divergente — referência: "${ref.title.slice(0, 80)}" vs fonte: "${source.title.slice(0, 80)}"`,
      );
    }
    if (ref.year && source.year && Math.abs(ref.year - source.year) > 1) {
      conflicts.push(`Ano divergente — referência: ${ref.year}; fonte: ${source.year}`);
    }
    if (ref.authors.length > 0 && source.authors.length > 0) {
      const refSurname = ref.authors[0].split(",")[0].trim().toLowerCase();
      const found = authorSurnames(source).some((s) => s.includes(refSurname) || refSurname.includes(s));
      if (!found) conflicts.push(`Autor divergente — "${ref.authors[0]}" não corresponde aos autores da fonte`);
    }
  }

  if (conflicts.length > 0) {
    return {
      found: true,
      source,
      conflicts,
      message:
        "DOI encontrado, mas os dados não correspondem completamente à referência informada.",
    };
  }

  return {
    found: true,
    source,
    conflicts: [],
    message: "DOI encontrado e dados compatíveis com a referência informada.",
  };
}
