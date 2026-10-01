import type { LiteratureEntry, MatrixColumn } from "@/types";

export const NOT_IDENTIFIED_LABEL = "Não identificado na fonte";

/** Colunas fixas da matriz (espelha o backend). */
export const MATRIX_COLUMNS: MatrixColumn[] = [
  { key: "author", label: "Autor" },
  { key: "year", label: "Ano" },
  { key: "title", label: "Título" },
  { key: "theme", label: "Tema" },
  { key: "objective", label: "Objetivo" },
  { key: "methodology", label: "Metodologia" },
  { key: "sample", label: "Amostra" },
  { key: "variables", label: "Variáveis" },
  { key: "results", label: "Resultados" },
  { key: "limitations", label: "Limitações" },
];

export type MatrixRow = Record<string, string | number | null>;

/** Converte uma entrada da matriz para linha tabular (sem inventar dados). */
export function matrixRowFromEntry(entry: LiteratureEntry): MatrixRow {
  return {
    author: entry.author ?? NOT_IDENTIFIED_LABEL,
    year: entry.year ?? null,
    title: entry.title ?? NOT_IDENTIFIED_LABEL,
    theme: entry.theme ?? NOT_IDENTIFIED_LABEL,
    objective: entry.objective ?? NOT_IDENTIFIED_LABEL,
    methodology: entry.methodology ?? NOT_IDENTIFIED_LABEL,
    sample: entry.sample ?? NOT_IDENTIFIED_LABEL,
    variables: entry.variables ?? NOT_IDENTIFIED_LABEL,
    results: entry.results ?? NOT_IDENTIFIED_LABEL,
    limitations: entry.limitations ?? NOT_IDENTIFIED_LABEL,
  };
}

export function cellLabel(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return NOT_IDENTIFIED_LABEL;
  return String(value);
}
