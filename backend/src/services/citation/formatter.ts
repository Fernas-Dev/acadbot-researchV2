import type { AcademicSource, CitationOutput, CitationStyle } from "../../types/index.js";
import { formatApa7 } from "./apa7.js";
import { formatAbnt } from "./abnt.js";

type Formatter = (source: AcademicSource) => CitationOutput;

/**
 * Registry de estilos — arquitetura preparada para MLA, Chicago,
 * Harvard e Vancouver (basta registar o formatter).
 */
const FORMATTERS: Partial<Record<CitationStyle, Formatter>> = {
  apa7: formatApa7,
  abnt: formatAbnt,
};

export const SUPPORTED_STYLES: CitationStyle[] = ["apa7", "abnt"];

export function formatCitation(source: AcademicSource, style: CitationStyle): CitationOutput {
  const formatter = FORMATTERS[style];
  if (!formatter) {
    throw new Error(`Estilo de citação não suportado: ${style}`);
  }
  return formatter(source);
}

export function formatAll(source: AcademicSource): CitationOutput[] {
  return SUPPORTED_STYLES.map((style) => formatCitation(source, style));
}
