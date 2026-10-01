import type { AcademicSource, CitationOutput } from "../../types/index.js";
import { apaAuthorList, citationSurnames, titleWithSubtitle, yearOrND } from "./parts.js";

/**
 * APA 7 — apenas com dados presentes na fonte. Campos ausentes são omitidos
 * (APA permite omitir; nunca inventamos editora, volume ou páginas).
 */
export function formatApa7(source: AcademicSource): CitationOutput {
  const authors = apaAuthorList(source.authors);
  const year = yearOrND(source);
  const title = titleWithSubtitle(source);
  const doi = source.doi ? `https://doi.org/${source.doi}` : null;

  let full: string;
  const isArticle = source.type === "article" || source.type === "conference";
  const isBook = source.type === "book";

  if (isArticle && source.journal) {
    const volumePart = source.volume ? `${source.volume}` : "";
    const issuePart = source.issue ? `(${source.issue})` : "";
    const pagesPart = source.pages ? `, ${source.pages}` : "";
    full = `${authors ? `${authors} ` : ""}(${year}). ${title}. ${source.journal}${volumePart ? `, ${volumePart}${issuePart}` : issuePart}${pagesPart}.${doi ? ` ${doi}` : ""}`;
  } else if (isBook) {
    const edition = typeof source.metadata.edition === "string" ? ` (${source.metadata.edition} ed.).` : "";
    full = `${authors ? `${authors} ` : ""}(${year}). ${title}.${edition} ${source.publisher ?? ""}${source.publisher ? "." : ""}${doi ? ` ${doi}` : ""}`.replace(/\s+/g, " ").replace(/\.\./g, ".");
  } else {
    // formato genérico
    full = `${authors ? `${authors} ` : ""}(${year}). ${title}.${source.publisher ? ` ${source.publisher}.` : ""}${doi ? ` ${doi}` : ""}`;
  }
  full = full.replace(/\s+\./g, ".").replace(/\.\./g, ".").trim();

  const surnames = citationSurnames(source.authors);
  const yearIn = yearOrND(source);
  let narrative: string;
  let parenthetical: string;
  if (surnames.length === 0) {
    const shortTitle = source.title.length > 40 ? `${source.title.slice(0, 40)}…` : source.title;
    narrative = `${shortTitle} (${yearIn})`;
    parenthetical = `(${shortTitle}, ${yearIn})`;
  } else if (surnames.length === 1) {
    narrative = `${surnames[0]} (${yearIn})`;
    parenthetical = `(${surnames[0]}, ${yearIn})`;
  } else if (surnames.length === 2) {
    narrative = `${surnames[0]} and ${surnames[1]} (${yearIn})`;
    parenthetical = `(${surnames[0]} & ${surnames[1]}, ${yearIn})`;
  } else {
    narrative = `${surnames[0]} et al. (${yearIn})`;
    parenthetical = `(${surnames[0]} et al., ${yearIn})`;
  }

  return { style: "apa7", full, narrative, parenthetical };
}
