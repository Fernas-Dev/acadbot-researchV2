import { normalizeDoi, normalizeIsbn } from "../../lib/text.js";
import type { ParsedReference } from "../../types/index.js";

/**
 * Parser de referências bibliográficas (§21).
 * Suporta formatos comuns: ABNT (SOBRENOME, Nome. Título...), APA
 * (Surname, N. (Year). Title...) e variações. Extrai também DOI/ISBN/URL
 * por padrão em qualquer posição da string.
 */

const MONTHS = "jan\\.?|fev\\.?|mar\\.?|abr\\.?|may|mai\\.?|jun\\.?|jul\\.?|aug|ago\\.?|sep|set\\.?|oct|out\\.?|nov\\.?|dec|dez\\.?";

function extractDoi(raw: string): string | null {
  // Sufixos de DOI podem conter pontos (ex.: 10.1234/abc.2019.001);
  // a pontuação final é removida depois.
  const match = raw.match(/(10\.\d{4,9}\/[^\s"<>]+)/i);
  if (!match) return null;
  return normalizeDoi(match[1].replace(/[.,;:)\]]+$/, ""));
}

function extractIsbn(raw: string): string | null {
  // ISBN-13: prefixo 978/979 + 10 dígitos, com separadores opcionais
  const isbn13 = raw.match(/\b(97[89](?:[-–\s]?\d){10})\b/);
  if (isbn13) {
    const digits = normalizeIsbn(isbn13[1]);
    if (digits.length === 13) return digits;
  }
  // ISBN-10: 9 dígitos + dígito verificador (0-9 ou X)
  const isbn10 = raw.match(/\b(?:\d[-–\s]?){9}[\dXx]\b/);
  if (isbn10) {
    const digits = normalizeIsbn(isbn10[0]);
    if (digits.length === 10) return digits;
  }
  return null;
}

function extractUrl(raw: string): string | null {
  const match = raw.match(/https?:\/\/[^\s,;"'<>]+/i);
  return match ? match[0] : null;
}

function extractYear(raw: string): number | null {
  // evita confundir com páginas "2014-2020" ou DOIs
  const withoutDoi = raw.replace(/10\.\d{4,9}\/\S+/gi, " ");
  const match = withoutDoi.match(/\b(1[89]\d{2}|20[0-2]\d)\b/);
  return match ? Number(match[1]) : null;
}

function extractPages(raw: string): string | null {
  const match = raw.match(/\bp{1,2}\.\s*(\d+[\s–-]?\d*)/i) ?? raw.match(/\b(\d+\s*[-–]\s*\d+)\b(?!\d)/);
  return match ? match[1].replace(/\s/g, "") : null;
}

function extractVolumeIssue(raw: string): { volume: string | null; issue: string | null } {
  const vol = raw.match(/\bv{1,2}\.\s*(\d+)/i) ?? raw.match(/\bvolume\s*(\d+)/i);
  const num =
    raw.match(/\bn[.:ºo]{0,2}\s*(\d+)/i) ??
    raw.match(/\bnumber\s*(\d+)/i) ??
    raw.match(/\b(\d+)\((\d+)\)/i);
  return {
    volume: vol ? vol[1] : (num && num.length === 3 ? num[1] : null),
    issue: num ? (num.length === 3 ? num[2] : num[1]) : null,
  };
}

/** Divide bloco de autores: "SILVA, J.; COSTA, M" → ["Silva, J.", "Costa, M"]. */
function parseAuthorBlock(block: string): string[] {
  const clean = block.replace(/^(et al\.?);?$/i, "").trim();
  if (!clean) return [];
  const parts = clean
    .split(/\s*;\s*|\s*&\s*|,\s+and\s+|\s+and\s+/)
    .map((p) => p.replace(/[,.]$/, "").trim())
    .filter((p) => p.length > 1 && !/^(et al)$/i.test(p));
  return parts.length ? parts : [clean];
}

/** Segmento composto apenas por iniciais ("N.", "J. M.", "N"). */
const INITIALS_ONLY = /^[A-ZÀ-Ý]\.?(\s*[A-ZÀ-Ý]\.?)*$/;
/** Segmento que parece um nome próprio ("Gregory", "N. Gregory", "Maria João"). */
const GIVEN_NAME = /^([A-ZÀ-Ý]\.?\s*)*[A-ZÀ-Ý][a-zà-ÿ]+(\s+([A-ZÀ-Ý]\.?\s*)*[A-ZÀ-Ý][a-zà-ÿ]+)*$/;

/**
 * Onde termina o bloco de autores num registo ABNT?
 * "MANKIW, N. Gregory. Introdução à Economia. São Paulo: ..." → o bloco
 * inclui "Gregory" (nome próprio) e para antes do título.
 */
function findAuthorBlockEnd(segments: string[]): number {
  let end = 1;
  while (end < segments.length && end <= 3) {
    const segment = segments[end].trim();
    if (!segment) break;
    if (INITIALS_ONLY.test(segment) || GIVEN_NAME.test(segment)) {
      end += 1;
      continue;
    }
    break;
  }
  return end;
}

export function parseReference(rawInput: string): ParsedReference {
  const raw = rawInput.trim().replace(/\s+/g, " ");
  const ref: ParsedReference = { raw, authors: [] };

  ref.doi = extractDoi(raw);
  ref.isbn = extractIsbn(raw);
  ref.url = extractUrl(raw);
  ref.year = extractYear(raw);
  ref.pages = extractPages(raw);
  const vi = extractVolumeIssue(raw);
  ref.volume = vi.volume;
  ref.issue = vi.issue;

  // ---- Split autor / resto ----
  let rest = raw;
  const dotPos = raw.indexOf(". ");
  const segments = raw.split(/\.\s+/);
  // Bloco de autores no estilo ABNT: "SOBRENOME, Nome ..." no início do registo.
  const authorSegments =
    segments.length > 1 &&
    /^[A-ZÀ-Ý][A-ZÀ-Ý\s'.-]+,\s*\S/.test(segments[0]) &&
    segments[0].split(",")[0].length > 2
      ? segments.slice(0, findAuthorBlockEnd(segments))
      : null;
  const abntPattern = raw.match(/^([A-ZÀ-Ý][A-ZÀ-Ý\s'.-]+,\s*[^.]+?)\.\s+(.+)$/);
  const apaPattern = raw.match(/^([A-ZÀ-Ý][^,.(]{1,60}),\s*([A-ZÀ-Ý][^.()]{0,40}?)\.\s+(.+)$/);

  if (abntPattern && authorSegments !== null) {
    // ABNT: sobrenome em MAIÚSCULAS antes da vírgula
    const authorBlock = (authorSegments ?? [segments[0]]).join(". ");
    ref.authors = parseAuthorBlock(authorBlock);
    rest = raw.slice(authorBlock.length).replace(/^[.\s]+/, "");
    // normaliza "SILVA, João" → "João Silva" para matching
    ref.authors = ref.authors.map((a) => {
      const m = a.match(/^([^,]+),\s*(.+)$/);
      return m ? `${m[2].trim()} ${m[1].trim()}` : a;
    });
  } else if (apaPattern) {
    ref.authors = parseAuthorBlock(`${apaPattern[1]}, ${apaPattern[2]}`);
    rest = apaPattern[3];
  } else if (dotPos > 0) {
    const block = raw.slice(0, dotPos);
    const tokens = block.split(" ");
    if (tokens.length <= 6) {
      ref.authors = parseAuthorBlock(block);
      rest = raw.slice(dotPos + 2);
    }
  }

  // ---- Editora / local (ABNT: "São Paulo: Cengage Learning, 2014.") ----
  const placePublisher = rest.match(/([A-ZÀ-Ý][\wÀ-ÿ'’.\- ]+?)\s*:\s*([^.]+?),\s*(?:\d{4}|s\.?d\.?)/);
  if (placePublisher) {
    ref.place = placePublisher[1].trim();
    ref.publisher = placePublisher[2].trim();
  } else {
    const publisherOnly = rest.match(/:\s*([A-ZÀ-Ý][^.]+?),\s*(?:\d{4}|s\.?d\.?)/);
    if (publisherOnly) ref.publisher = publisherOnly[1].trim();
  }

  // ---- Título: primeiro segmento de rest antes de ponto seguinte ----
  let titleCandidate = rest
    .split(/(?:\.\s+[A-ZÀ-Ý0-9]|\.\s*$)/)[0]
    .replace(new RegExp(MONTHS, "gi"), "")
    .trim();

  if (ref.authors.length === 0) {
    // sem autores: título no início do raw
    titleCandidate = raw.split(/\.\s+[A-ZÀ-Ý]/)[0].trim();
  }

  // Remove sufixos de edição ABNT ("2. ed.")
  titleCandidate = titleCandidate.replace(/\s*\d+\.\s*ed\.?\s*$/i, "").trim();
  // Remove colchetes "[s.d.]"
  titleCandidate = titleCandidate.replace(/\[s\.?d\.?\]/gi, "").trim();

  if (titleCandidate.length > 3) ref.title = titleCandidate.replace(/[.,]$/, "");

  // ---- Revista: segmento antes de "v." / padrão APA ----
  const journalMatch = rest.match(/([A-ZÀ-Ý][^.():]+?)\s*,\s*v{1,2}\.\s*\d+/i);
  if (journalMatch) ref.journal = journalMatch[1].trim();

  // ---- Edição ----
  const edition = raw.match(/(\d+)\.\s*ed/i);
  if (edition) ref.edition = edition[1];

  // ---- Tipo heurístico ----
  if (ref.doi && (ref.journal || ref.volume)) ref.type = "article";
  else if (ref.isbn || ref.publisher) ref.type = "book";

  return ref;
}


