/**
 * Exportações (§32): DOCX, PDF, CSV, BibTeX e RIS — sempre geradas no backend.
 * Nenhum dado é inventado: campos ausentes saem como "Não informado".
 */
import type { ExportFormat, ExportKind, ExportedFile } from "../../types/index.js";
import type { RankedSource } from "../research/orchestrator.js";
import {
  researchToCsv,
  libraryToCsv,
  matrixToCsv,
  type LibraryExportItem,
} from "./csv.js";
import { sourcesToBibtex } from "./bibtex.js";
import { sourcesToRis } from "./ris.js";
import { researchToDocx, libraryToDocx, matrixToDocx } from "./docx.js";
import { researchToPdf, libraryToPdf, tableToPdf } from "./pdf.js";

export const SUPPORTED_EXPORTS: ExportFormat[] = ["docx", "pdf", "csv", "bibtex", "ris"];

export interface ExportRequest {
  kind: ExportKind;
  format: ExportFormat;
  title: string;
  /** Pesquisa: fontes + relevância. */
  results?: RankedSource[];
  /** Biblioteca / citações: fontes guardadas. */
  libraryItems?: LibraryExportItem[];
  /** Matriz: linhas e colunas. */
  matrixRows?: Array<Record<string, string | number | null | undefined>>;
  matrixColumns?: Array<{ key: string; label: string }>;
  /** Linhas de contexto (tema, filtros, data, avisos). */
  meta?: string[];
}

const MIME: Record<ExportFormat, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  csv: "text/csv; charset=utf-8",
  bibtex: "application/x-bibtex; charset=utf-8",
  ris: "application/x-research-info-systems; charset=utf-8",
};

function slug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "acadbot";
}

/** Todas as fontes envolvidas no pedido (para BibTeX/RIS). */
function allSources(request: ExportRequest): RankedSource["source"][] {
  if (request.results?.length) return request.results.map((r) => r.source);
  return (request.libraryItems ?? []).map((item) => item.source);
}

export async function generateExport(request: ExportRequest): Promise<ExportedFile> {
  const base = slug(request.title);
  const fileName = `${base}-${request.kind}.${request.format}`;
  let content: string | Buffer;

  switch (request.format) {
    case "csv": {
      if (request.kind === "matrix") {
        content = matrixToCsv(request.title, request.matrixRows ?? [], request.matrixColumns ?? []);
      } else if (request.kind === "library" || request.kind === "citations") {
        content = libraryToCsv(request.libraryItems ?? []);
      } else {
        content = researchToCsv(request.title, request.results ?? []);
      }
      break;
    }
    case "bibtex":
      content = sourcesToBibtex(allSources(request));
      break;
    case "ris":
      content = sourcesToRis(allSources(request));
      break;
    case "docx": {
      if (request.kind === "matrix") {
        content = await matrixToDocx(request.title, request.matrixColumns ?? [], request.matrixRows ?? []);
      } else if (request.kind === "library" || request.kind === "citations") {
        content = await libraryToDocx(request.libraryItems ?? []);
      } else {
        content = await researchToDocx(request.title, request.results ?? [], request.meta ?? []);
      }
      break;
    }
    case "pdf": {
      if (request.kind === "matrix") {
        const columns = request.matrixColumns ?? [];
        content = await tableToPdf(
          request.title,
          columns.map((c) => c.label),
          (request.matrixRows ?? []).map((row) => ({
            cells: columns.map((c) => {
              const value = row[c.key];
              return value === null || value === undefined || value === ""
                ? "Não identificado na fonte"
                : String(value);
            }),
          })),
        );
      } else if (request.kind === "library" || request.kind === "citations") {
        content = await libraryToPdf(request.libraryItems ?? []);
      } else {
        content = await researchToPdf(request.title, request.results ?? [], request.meta ?? []);
      }
      break;
    }
    default:
      throw new Error(`Formato de exportação não suportado: ${String(request.format)}`);
  }

  return {
    fileName,
    mimeType: MIME[request.format],
    content: typeof content === "string" ? Buffer.from(content, "utf8") : content,
  };
}
