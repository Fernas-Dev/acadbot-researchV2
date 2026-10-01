import { similarityWithContainment, firstAuthorSurname, tokenize, removeStopwords } from "../../lib/text.js";
import type { AcademicSource } from "../../types/index.js";

const TITLE_SIMILARITY_THRESHOLD = 0.93;

function titleTokens(title: string): string[] {
  return removeStopwords(tokenize(title));
}

/**
 * Deduplicação (§17):
 * 1. fingerprint idêntico (DOI/ISBN/título+autor+ano) → merge de providers;
 * 2. títulos muito semilares + mesmo 1.º autor + ano ±1 → merge cross-provider
 *    (apanha variantes de título entre providers sem DOI).
 * Mantém a fonte com mais metadados e une os providers relacionados.
 */
export function deduplicateSources(sources: AcademicSource[]): AcademicSource[] {
  const byFingerprint = new Map<string, AcademicSource>();
  const fuzzyBuckets: AcademicSource[] = [];

  for (const source of sources) {
    const existing = byFingerprint.get(source.fingerprint);
    if (existing) {
      mergeInto(existing, source);
      continue;
    }

    // fuzzy: compara com buckets já aceites sem DOI/ISBN
    let matched: AcademicSource | null = null;
    for (const candidate of fuzzyBuckets) {
      if (isFuzzyDuplicate(candidate, source)) {
        matched = candidate;
        break;
      }
    }
    if (matched) {
      mergeInto(matched, source);
      continue;
    }

    byFingerprint.set(source.fingerprint, source);
    fuzzyBuckets.push(source);
  }

  return [...byFingerprint.values()];
}

function isFuzzyDuplicate(a: AcademicSource, b: AcademicSource): boolean {
  // Só aplica fuzzy quando pelo menos uma das fontes não tem DOI
  // (com DOI em ambos, o fingerprint já cobre).
  if (a.doi && b.doi) return false;

  const sameYear = a.year == null || b.year == null || Math.abs(a.year - b.year) <= 1;
  if (!sameYear) return false;

  const authorA = firstAuthorSurname(a.authors);
  const authorB = firstAuthorSurname(b.authors);
  const authorsMatch =
    !authorA || !authorB || authorA === authorB ||
    authorA.includes(authorB) || authorB.includes(authorA);
  if (!authorsMatch) return false;

  const sim = similarityWithContainment(a.title, b.title);
  if (sim >= TITLE_SIMILARITY_THRESHOLD) return true;

  // Títulos curtos: comparação por interseção de tokens significativos
  const tokensA = titleTokens(a.title);
  const tokensB = titleTokens(b.title);
  if (tokensA.length >= 3 && tokensB.length >= 3) {
    const setB = new Set(tokensB);
    const inter = tokensA.filter((t) => setB.has(t)).length;
    const ratio = inter / Math.min(tokensA.length, tokensB.length);
    return ratio >= 0.9;
  }
  return false;
}

/** Une `b` em `a`: providers, metadados (prefere campos preenchidos), max de citações. */
function mergeInto(a: AcademicSource, b: AcademicSource): void {
  const providerIds = new Set(a.providers.map((p) => `${p.provider}:${p.externalId}`));
  for (const ref of b.providers) {
    const key = `${ref.provider}:${ref.externalId}`;
    if (!providerIds.has(key)) {
      a.providers.push(ref);
      providerIds.add(key);
    }
  }

  // Preenche campos em falta a partir da duplicada (nunca substitui dados existentes)
  a.abstract = a.abstract ?? b.abstract ?? null;
  a.journal = a.journal ?? b.journal ?? null;
  a.publisher = a.publisher ?? b.publisher ?? null;
  a.volume = a.volume ?? b.volume ?? null;
  a.issue = a.issue ?? b.issue ?? null;
  a.pages = a.pages ?? b.pages ?? null;
  a.doi = a.doi ?? b.doi ?? null;
  a.isbn = a.isbn ?? b.isbn ?? null;
  a.url = a.url ?? b.url ?? null;
  a.language = a.language ?? b.language ?? null;
  a.openAccess = a.openAccess || b.openAccess;
  a.citationCount =
    a.citationCount == null ? b.citationCount ?? null : Math.max(a.citationCount, b.citationCount ?? 0);
  if (a.keywords.length === 0 && b.keywords.length > 0) a.keywords = b.keywords;
  if (a.authors.length === 0 && b.authors.length > 0) a.authors = b.authors;
  if (a.year == null && b.year != null) a.year = b.year;
  a.metadata = { ...b.metadata, ...a.metadata };
}
