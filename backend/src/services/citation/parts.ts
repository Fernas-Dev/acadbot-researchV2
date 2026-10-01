import type { AcademicSource, Author } from "../../types/index.js";

/** Nomes que fazem parte do sobrenome composto em português. */
const FAMILY_SUFFIXES = new Set(["junior", "jnior", "filho", "neto", "sobrinho", "jnr"]);

/**
 * Divide "N. Gregory Mankiw" em { family: "Mankiw", given: "N. Gregory" }.
 * Heurística: último token é sobrenome, exceto sufixos como Júnior/Filho.
 * Só é usado quando o provider não forneceu a separação.
 */
export function splitAuthorName(name: string): { family: string; given: string } {
  const clean = name.trim().replace(/\s+/g, " ");
  if (clean.includes(",")) {
    const [family, rest] = clean.split(",", 2);
    return { family: family.trim(), given: (rest ?? "").trim() };
  }
  const tokens = clean.split(" ");
  if (tokens.length === 1) return { family: tokens[0], given: "" };

  const last = tokens[tokens.length - 1];
  const normalizedLast = last.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (FAMILY_SUFFIXES.has(normalizedLast) && tokens.length >= 3) {
    const family = `${tokens[tokens.length - 2]} ${tokens[tokens.length - 1]}`;
    return { family, given: tokens.slice(0, -2).join(" ") };
  }
  return { family: last, given: tokens.slice(0, -1).join(" ") };
}

export function authorParts(author: Author): { family: string; given: string } {
  if (author.family && author.given) return { family: author.family, given: author.given };
  if (author.family && !author.given) return splitAuthorName(author.family);
  return splitAuthorName(author.name);
}

/** Iniciais dos nomes próprios: "N. Gregory" → "N. G." */
export function initials(given: string): string {
  if (!given) return "";
  return given
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => {
      const clean = part.replace(/\./g, "");
      return clean ? `${clean[0].toUpperCase()}.` : "";
    })
    .join(" ")
    .trim();
}

/** Lista de autores no formato APA: FAMILY, F. M., & FAMILY, F. M. */
export function apaAuthorList(authors: Author[]): string {
  if (authors.length === 0) return "";
  const parts = authors.map((a) => {
    const { family, given } = authorParts(a);
    return given ? `${family}, ${initials(given)}` : family;
  });
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} & ${parts[1]}`;
  if (parts.length <= 20) return `${parts.slice(0, -1).join(", ")}, & ${parts[parts.length - 1]}`;
  return `${parts.slice(0, 19).join(", ")}, ... ${parts[parts.length - 1]}`;
}

/** Lista de autores no formato ABNT: FAMILY, F. M.; FAMILY, F. M. */
export function abntAuthorList(authors: Author[]): string {
  if (authors.length === 0) return "";
  if (authors.length > 3) {
    const { family } = authorParts(authors[0]);
    return `${family.toUpperCase()} et al.`;
  }
  const parts = authors.map((a) => {
    const { family, given } = authorParts(a);
    return given ? `${family.toUpperCase()}, ${initials(given)}` : family.toUpperCase();
  });
  return parts.join("; ");
}

/** "Silva; Costa; Pereira" — para citação no texto. */
export function citationSurnames(authors: Author[]): string[] {
  return authors.map((a) => {
    const { family } = authorParts(a);
    return family;
  });
}

export function titleWithSubtitle(source: AcademicSource): string {
  const subtitle = source.metadata.subtitle;
  if (typeof subtitle === "string" && subtitle.trim()) {
    return `${source.title}: ${subtitle.trim()}`;
  }
  return source.title;
}

export function yearOrND(source: AcademicSource): string {
  return source.year ? String(source.year) : "[s.d.]";
}
