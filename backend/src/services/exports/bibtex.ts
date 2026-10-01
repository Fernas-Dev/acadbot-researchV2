import type { AcademicSource } from "../../types/index.js";

const TYPE_TO_BIBTEX: Record<string, string> = {
  article: "article",
  book: "book",
  thesis: "phdthesis",
  dissertation: "mastersthesis",
  report: "techreport",
  conference: "inproceedings",
  working_paper: "misc",
  other: "misc",
};

/** Gera uma chave BibTeX estável a partir do primeiro autor + ano + palavra do título. */
function bibtexKey(source: AcademicSource, index: number): string {
  const first = source.authors[0]?.name ?? "sem-autor";
  const surname = (first.includes(",") ? first.split(",")[0] : first.split(/\s+/).slice(-1)[0] ?? "semautor")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toLowerCase();
  const word = (source.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z\s]/g, "")
    .split(/\s+/)
    .find((w) => w.length > 4) ?? "obra")
    .toLowerCase();
  return `${surname || "semautor"}${source.year ?? ""}${word}${index > 0 ? index : ""}`;
}

function escapeBibtex(value: string): string {
  return value.replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}

/** BibTeX — exportação de fontes académicas. */
export function sourcesToBibtex(sources: AcademicSource[]): string {
  return sources
    .map((source, index) => {
      const type = TYPE_TO_BIBTEX[source.type] ?? "misc";
      const fields: Array<[string, string | null | undefined]> = [
        ["title", source.title],
        ["author", source.authors.length ? source.authors.map((a) => a.name).join(" and ") : null],
        ["year", source.year ? String(source.year) : null],
        ["journal", source.journal],
        ["booktitle", source.type === "conference" ? source.journal : null],
        ["publisher", source.publisher],
        ["volume", source.volume],
        ["number", source.issue],
        ["pages", source.pages],
        ["doi", source.doi],
        ["isbn", source.isbn],
        ["url", source.url],
        ["language", source.language],
      ];
      const body = fields
        .filter(([, value]) => Boolean(value && value.trim()))
        .map(([key, value]) => `  ${key} = {${escapeBibtex(value as string)}}`)
        .join(",\n");
      return `@${type}{${bibtexKey(source, index)},\n${body}\n}`;
    })
    .join("\n\n")
    .concat("\n");
}
