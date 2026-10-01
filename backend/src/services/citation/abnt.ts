import type { AcademicSource, CitationOutput } from "../../types/index.js";
import { abntAuthorList, citationSurnames, titleWithSubtitle, yearOrND } from "./parts.js";

/**
 * ABNT NBR 6023/6022 (autor-data) — apenas com dados presentes.
 * Campos ausentes ficam omitidos ou "[s.d.]" (sem data). Nunca inventados.
 */
export function formatAbnt(source: AcademicSource): CitationOutput {
  const authors = abntAuthorList(source.authors);
  const year = yearOrND(source);
  const title = titleWithSubtitle(source);
  const isArticle = source.type === "article" || source.type === "conference";
  const isBook = source.type === "book";

  let full: string;
  if (isArticle && source.journal) {
    const vol = source.volume ? `v. ${source.volume}, ` : "";
    const num = source.issue ? `n. ${source.issue}, ` : "";
    const pages = source.pages ? `p. ${source.pages}, ` : "";
    full = `${authors ? `${authors}. ` : ""}${title}. ${source.journal}, ${vol}${num}${pages}${year}.`;
  } else if (isBook) {
    const edition = typeof source.metadata.edition === "string" ? `. ${source.metadata.edition}. ed.` : "";
    const place = typeof source.metadata.place === "string" && source.metadata.place ? `${source.metadata.place}: ` : "";
    const publisher = source.publisher ? `${place}${source.publisher}, ` : "";
    full = `${authors ? `${authors}. ` : ""}${title}${edition}. ${publisher}${year}.`;
  } else {
    const publisher = source.publisher ? ` ${source.publisher}, ` : " ";
    full = `${authors ? `${authors}. ` : ""}${title}.${publisher}${year}.`;
  }
  full = full.replace(/\s+\./g, ".").replace(/\.{2,}/g, ".").replace(/\s{2,}/g, " ").trim();

  const surnames = citationSurnames(source.authors);
  let narrative: string;
  let parenthetical: string;
  if (surnames.length === 0) {
    const shortTitle = source.title.length > 40 ? `${source.title.slice(0, 40)}…` : source.title;
    narrative = `${shortTitle.toUpperCase()} (${year})`;
    parenthetical = `(${shortTitle.toUpperCase()}, ${year})`;
  } else if (surnames.length > 3) {
    narrative = `${surnames[0].toUpperCase()} et al. (${year})`;
    parenthetical = `(${surnames[0].toUpperCase()} et al., ${year})`;
  } else if (surnames.length === 1) {
    narrative = `${surnames[0].toUpperCase()} (${year})`;
    parenthetical = `(${surnames[0].toUpperCase()}, ${year})`;
  } else {
    const list = surnames.map((s) => s.toUpperCase()).join("; ");
    narrative = `${list} (${year})`;
    parenthetical = `(${list}, ${year})`;
  }

  return { style: "abnt", full, narrative, parenthetical };
}
