import type { AcademicSource } from "../../types/index.js";

const TYPE_TO_RIS: Record<string, string> = {
  article: "JOUR",
  book: "BOOK",
  thesis: "THES",
  dissertation: "THES",
  report: "RPRT",
  conference: "CONF",
  working_paper: "UNPB",
  other: "GEN",
};

/** RIS — exportação de fontes académicas (compatível com Zotero/Mendeley). */
export function sourcesToRis(sources: AcademicSource[]): string {
  const blocks = sources.map((source) => {
    const lines: string[] = [`TY  - ${TYPE_TO_RIS[source.type] ?? "GEN"}`];
    for (const author of source.authors) lines.push(`AU  - ${author.name}`);
    lines.push(`TI  - ${source.title.replace(/\s+/g, " ").trim()}`);
    if (source.year) lines.push(`PY  - ${source.year}`);
    if (source.journal) lines.push(`JO  - ${source.journal}`);
    if (source.publisher) lines.push(`PB  - ${source.publisher}`);
    if (source.volume) lines.push(`VL  - ${source.volume}`);
    if (source.issue) lines.push(`IS  - ${source.issue}`);
    if (source.pages) {
      const [start, end] = source.pages.split(/[-–]/);
      if (start) lines.push(`SP  - ${start.trim()}`);
      if (end) lines.push(`EP  - ${end.trim()}`);
    }
    if (source.abstract) lines.push(`AB  - ${source.abstract.replace(/\s+/g, " ").trim()}`);
    for (const keyword of source.keywords.slice(0, 8)) lines.push(`KW  - ${keyword}`);
    if (source.doi) lines.push(`DO  - ${source.doi}`);
    if (source.isbn) lines.push(`SN  - ${source.isbn}`);
    if (source.url) lines.push(`UR  - ${source.url}`);
    if (source.language) lines.push(`LA  - ${source.language}`);
    lines.push("ER  - ");
    return lines.join("\r\n");
  });
  return `${blocks.join("\r\n\r\n")}\r\n`;
}
