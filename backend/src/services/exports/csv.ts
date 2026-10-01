import type { AcademicSource } from "../../types/index.js";
import type { RankedSource } from "../research/orchestrator.js";

const TYPE_LABELS: Record<string, string> = {
  article: "Artigo",
  book: "Livro",
  thesis: "Tese",
  dissertation: "Dissertação",
  report: "Relatório",
  conference: "Conferência",
  working_paper: "Working paper",
  other: "Outro",
};

export const SOURCE_TYPE_LABELS = TYPE_LABELS;

/** Escapa um campo CSV (aspas duplicadas, envolve quando necessário). */
function cell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",;\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function authorsToString(source: AcademicSource): string {
  return source.authors.map((a) => a.name).join("; ");
}

/** CSV de resultados de pesquisa (com relevância estimada). */
export function researchToCsv(topic: string, items: RankedSource[]): string {
  const header = [
    "Título", "Autores", "Ano", "Tipo", "Revista/Editora", "DOI", "ISBN", "URL",
    "Citações", "Acesso aberto", "Providers", "Relevância estimada", "Motivos",
  ];
  const rows = items.map((item) => [
    item.source.title,
    authorsToString(item.source),
    item.source.year ?? "",
    TYPE_LABELS[item.source.type] ?? item.source.type,
    item.source.journal ?? item.source.publisher ?? "",
    item.source.doi ?? "",
    item.source.isbn ?? "",
    item.source.url ?? "",
    item.source.citationCount ?? "",
    item.source.openAccess ? "Sim" : "Não",
    item.source.providers.map((p) => p.provider).join("|"),
    `${item.relevance.score}% (${item.relevance.label})`,
    item.relevance.reasons.join(" | "),
  ]);
  const lines = [header, ...rows].map((row) => row.map(cell).join(","));
  return `\uFEFF# Pesquisa: ${topic.replace(/[\r\n]+/g, " ")}\n${lines.join("\r\n")}\r\n`;
}

export interface LibraryExportItem {
  source: AcademicSource;
  status?: string | null;
  notes?: string | null;
  projectTitle?: string | null;
  tags?: string[];
}

/** CSV da biblioteca pessoal. */
export function libraryToCsv(items: LibraryExportItem[]): string {
  const header = [
    "Título", "Autores", "Ano", "Tipo", "Revista/Editora", "DOI", "ISBN", "URL",
    "Estado de leitura", "Tags", "Projeto", "Notas",
  ];
  const rows = items.map((item) => [
    item.source.title,
    authorsToString(item.source),
    item.source.year ?? "",
    TYPE_LABELS[item.source.type] ?? item.source.type,
    item.source.journal ?? item.source.publisher ?? "",
    item.source.doi ?? "",
    item.source.isbn ?? "",
    item.source.url ?? "",
    item.status ?? "",
    (item.tags ?? []).join(" | "),
    item.projectTitle ?? "",
    item.notes ?? "",
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}

/** CSV da matriz de literatura. */
export function matrixToCsv(
  title: string,
  rows: Array<Record<string, string | number | null | undefined>>,
  columns: Array<{ key: string; label: string }>,
): string {
  const header = columns.map((c) => c.label);
  const body = rows.map((row) => columns.map((c) => row[c.key] ?? ""));
  return `\uFEFF# ${title.replace(/[\r\n]+/g, " ")}\n${[header, ...body]
    .map((row) => row.map(cell).join(","))
    .join("\r\n")}\r\n`;
}
