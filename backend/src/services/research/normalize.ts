import { sha256 } from "../../lib/http.js";
import { normalizeText, normalizeDoi, normalizeIsbn, firstAuthorSurname } from "../../lib/text.js";
import type { AcademicSource, ProviderSearchResult } from "../../types/index.js";

/**
 * Fingerprint de uma fonte (§17):
 * 1. DOI (quando existe)
 * 2. ISBN (quando existe)
 * 3. título normalizado + primeiro autor + ano
 */
export function computeFingerprint(source: ProviderSearchResult | AcademicSource): string {
  if (source.doi && normalizeDoi(source.doi).length > 0) {
    return `doi:${normalizeDoi(source.doi)}`;
  }
  if (source.isbn && normalizeIsbn(source.isbn).length >= 10) {
    return `isbn:${normalizeIsbn(source.isbn)}`;
  }
  const titleKey = normalizeText(source.title).slice(0, 120);
  const authorKey = firstAuthorSurname(source.authors);
  const yearKey = source.year ?? "";
  return `ta:${sha256(`${titleKey}|${authorKey}|${yearKey}`)}`;
}

/** Atribui fingerprint e devolve a fonte pronta para deduplicação/persistência. */
export function finalizeSource(source: ProviderSearchResult): AcademicSource {
  return { ...source, fingerprint: computeFingerprint(source) };
}
