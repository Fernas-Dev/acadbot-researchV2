/**
 * Utilitários de texto — normalização, tokenização e similaridade.
 * Partilhados por deduplicação, matching e ranking de relevância.
 */

/** Minúsculas, sem acentos, sem pontuação, espaços colapsados. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const STOPWORDS = new Set([
  // Português
  "a","o","as","os","um","uma","uns","umas","de","do","da","dos","das","em","no","na","nos","nas",
  "por","para","com","sem","sobre","entre","ate","apos","e","ou","que","como","mais","menos","muito",
  "pouco","tambem","seu","sua","seus","suas","pelo","pela","aos","às","esto","este","esta","estes",
  "estas","esse","essa","isso","aquilo","eu","tu","ele","ela","nos","voce","voces","eles","elas",
  "ser","estar","ter","haver","fazer","sao","e","foi","sido","estudo","estudos","analise","analizar",
  // Inglês
  "the","a","an","of","in","on","at","to","for","with","without","from","by","and","or","but","is",
  "are","was","were","be","been","being","have","has","had","do","does","did","will","would","can",
  "could","should","may","might","must","this","that","these","those","it","its","as","than","then",
  "into","about","over","under","between","during","their","his","her","our","your","my","me","you",
  "we","they","them","which","who","whom","what","study","studies","analysis","case","based",
]);

export function tokenize(input: string): string[] {
  return normalizeText(input).split(" ").filter((t) => t.length > 0);
}

export function removeStopwords(tokens: string[]): string[] {
  return tokens.filter((t) => !STOPWORDS.has(t) && t.length > 1);
}

/** Distância de Levenshtein (O(n·m) com memória O(min)). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Similaridade 0..1 baseada em Levenshtein normalizado. */
export function similarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  return 1 - levenshtein(na, nb) / maxLen;
}

/** Similaridade com "containment": se uma contém a outra, valor alto proporcional. */
export function similarityWithContainment(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (longer.includes(shorter) && shorter.length >= 8) {
    return Math.max(similarity(a, b), shorter.length / longer.length * 0.95 + 0.05);
  }
  return similarity(a, b);
}

export function jaccard(tokensA: string[], tokensB: string[]): number {
  const a = new Set(tokensA);
  const b = new Set(tokensB);
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return inter / union;
}

export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1).trimEnd()}…`;
}

/** Normaliza DOI: minúsculas, sem prefixo de URL, sem espaços. */
export function normalizeDoi(doi: string): string {
  return doi
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .replace(/\s+/g, "");
}

export function isValidDoiFormat(doi: string): boolean {
  return /^10\.\d{4,9}\/\S+$/.test(normalizeDoi(doi));
}

/** Normaliza ISBN: mantém apenas dígitos e X final. */
export function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[\s-]/g, "").toUpperCase();
}

export function firstAuthorSurname(authors: Array<{ name: string; family?: string | null }>): string {
  const first = authors[0];
  if (!first) return "";
  if (first.family) return normalizeText(first.family);
  const tokens = first.name.trim().split(/\s+/);
  if (tokens.length === 0) return "";
  // ABNT estilo "SILVA, João" → sobrenome antes da vírgula
  if (first.name.includes(",")) return normalizeText(tokens[0].replace(",", ""));
  return normalizeText(tokens[tokens.length - 1]);
}

export function uniqueBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
