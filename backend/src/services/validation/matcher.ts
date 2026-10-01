import { similarity, similarityWithContainment, normalizeText, firstAuthorSurname, normalizeDoi, normalizeIsbn } from "../../lib/text.js";
import type { AcademicSource, FieldScores, ParsedReference, ValidationStatus } from "../../types/index.js";

export interface MatchResult {
  confidence: number; // 0..100
  fieldScores: FieldScores;
  conflicts: string[];
  missing: string[];
}

interface FieldWeight {
  key: keyof FieldScores;
  weight: number;
}

const WEIGHTS: FieldWeight[] = [
  { key: "doi", weight: 26 },
  { key: "title", weight: 26 },
  { key: "author", weight: 20 },
  { key: "year", weight: 14 },
  { key: "isbn", weight: 6 },
  { key: "journal", weight: 4 },
  { key: "publisher", weight: 2 },
  { key: "volume", weight: 1 },
  { key: "pages", weight: 1 },
];

function scoreAuthor(
  refAuthors: string[],
  sourceAuthors: Array<{ name: string; family?: string | null; given?: string | null }>,
): number {
  if (refAuthors.length === 0 || sourceAuthors.length === 0) return -1;
  const refFirst = refAuthors[0];
  const srcFirst = sourceAuthors[0];
  const refFamily = firstAuthorSurname([{ name: refFirst }]);
  const srcFamily = firstAuthorSurname([srcFirst]);
  if (!refFamily || !srcFamily) return -1;
  let score = similarity(refFamily, srcFamily) * 100;
  // sobrenomes iguais mas iniciais divergentes → penaliza levemente
  const refInitial = (refFirst.replace(/[^A-Za-zÀ-ÿ]/g, "")[0] ?? "").toUpperCase();
  const srcName = srcFirst.name;
  if (score >= 95 && refInitial && srcName) {
    const srcInitial = srcName[0].toUpperCase();
    if (refInitial !== srcInitial) score -= 10;
  }
  return Math.round(score);
}

/**
 * Matching (§23): compara campo a campo a referência do utilizador com a
 * fonte encontrada. Campos ausentes não contam (peso redistribuído).
 * Devolve confiança de correspondência — não prova absoluta de autenticidade.
 */
export function matchSource(ref: ParsedReference, source: AcademicSource): MatchResult {
  const fieldScores: FieldScores = {};
  const conflicts: string[] = [];
  const missing: string[] = [];

  const doiOk = (() => {
    if (!ref.doi && !source.doi) { missing.push("DOI"); return -1; }
    if (ref.doi && source.doi) {
      const equal = normalizeDoi(ref.doi) === normalizeDoi(source.doi);
      if (!equal) conflicts.push("DOI diferente da fonte encontrada");
      return equal ? 100 : 0;
    }
    return -1; // só uma das partes tem DOI
  })();

  const isbnOk = (() => {
    if (!ref.isbn && !source.isbn) return -1;
    if (ref.isbn && source.isbn) {
      const a = normalizeIsbn(ref.isbn);
      const b = normalizeIsbn(source.isbn);
      const equal = a === b || (a.length === 13 && b.length === 10 && a.slice(3, 12) === b.slice(0, 9)) || (b.length === 13 && a.length === 10 && b.slice(3, 12) === a.slice(0, 9));
      if (!equal) conflicts.push("ISBN diferente da fonte encontrada");
      return equal ? 100 : 0;
    }
    return -1;
  })();

  const titleOk = (() => {
    if (!ref.title || !source.title) { missing.push("título"); return -1; }
    const score = similarityWithContainment(ref.title, source.title) * 100;
    if (score < 60) conflicts.push("Título divergente da fonte encontrada");
    return Math.round(score);
  })();

  const authorOk = scoreAuthor(ref.authors, source.authors);
  if (authorOk < 0) missing.push("autor");

  const yearOk = (() => {
    if (!ref.year || !source.year) { missing.push("ano"); return -1; }
    if (ref.year === source.year) return 100;
    const near = Math.abs(ref.year - source.year) <= 1 ? 70 : 0;
    conflicts.push(`Ano difere (referência: ${ref.year}; fonte: ${source.year})`);
    return near;
  })();

  const journalOk = (() => {
    if (!ref.journal && !source.journal) return -1;
    if (ref.journal && source.journal) {
      const score = similarity(ref.journal, source.journal) * 100;
      if (score < 70) conflicts.push("Revista divergente");
      return Math.round(score);
    }
    return -1;
  })();

  const publisherOk = (() => {
    if (!ref.publisher && !source.publisher) return -1;
    if (ref.publisher && source.publisher) {
      const score = similarity(ref.publisher, source.publisher) * 100;
      if (score < 70) conflicts.push("Editora divergente");
      return Math.round(score);
    }
    return -1;
  })();

  const volumeOk = (() => {
    if (!ref.volume && !source.volume) return -1;
    if (ref.volume && source.volume) {
      const equal = normalizeText(ref.volume) === normalizeText(source.volume);
      if (!equal) conflicts.push("Volume divergente");
      return equal ? 100 : 0;
    }
    return -1;
  })();

  const pagesOk = (() => {
    if (!ref.pages && !source.pages) return -1;
    if (ref.pages && source.pages) {
      const equal = normalizeText(ref.pages) === normalizeText(source.pages);
      if (!equal) conflicts.push("Páginas divergentes");
      return equal ? 100 : 60;
    }
    return -1;
  })();

  fieldScores.doi = doiOk < 0 ? null : doiOk;
  fieldScores.isbn = isbnOk < 0 ? null : isbnOk;
  fieldScores.title = titleOk < 0 ? null : titleOk;
  fieldScores.author = authorOk < 0 ? null : authorOk;
  fieldScores.year = yearOk < 0 ? null : yearOk;
  fieldScores.journal = journalOk < 0 ? null : journalOk;
  fieldScores.publisher = publisherOk < 0 ? null : publisherOk;
  fieldScores.volume = volumeOk < 0 ? null : volumeOk;
  fieldScores.pages = pagesOk < 0 ? null : pagesOk;

  const available = WEIGHTS.filter((w) => {
    const value = fieldScores[w.key];
    return typeof value === "number" && value >= 0;
  });

  const totalWeight = available.reduce((sum, w) => sum + w.weight, 0) || 1;
  const weighted = available.reduce((sum, w) => {
    const value = fieldScores[w.key] as number;
    return sum + value * w.weight;
  }, 0);

  return { confidence: Math.round(weighted / totalWeight), fieldScores, conflicts, missing };
}

/** Estado final da validação a partir do melhor match (§22). */
export function decideStatus(match: MatchResult | null, hasAnyResult: boolean): ValidationStatus {
  if (!match || !hasAnyResult) return "unconfirmed";

  // Conflito explícito de identificador (DOI/ISBN) é uma inconsistência real:
  // a referência aponta para dados que não correspondem à obra encontrada.
  const hardConflict = match.conflicts.some((c) => c.startsWith("DOI") || c.startsWith("ISBN"));
  const titleScore = match.fieldScores.title ?? null;
  if (hardConflict && (match.confidence >= 40 || (titleScore ?? 0) >= 80)) return "inconsistent";

  if (match.conflicts.length >= 2 && match.confidence >= 60) return "inconsistent";
  if (match.confidence >= 80 && match.conflicts.length === 0) return "confirmed";
  if (match.confidence >= 55) return "partially_confirmed";
  return "unconfirmed";
}

