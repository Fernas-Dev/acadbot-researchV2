import PDFDocument from "pdfkit";
import type { AcademicSource } from "../../types/index.js";
import type { RankedSource } from "../research/orchestrator.js";
import { authorsToString, SOURCE_TYPE_LABELS, type LibraryExportItem } from "./csv.js";

function notInformed(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "Não informado";
  return String(value);
}

/** Renderiza um PDF a partir de blocos de texto simples (sem dados inventados). */
function renderPdf(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 54, info: { Producer: "AcadBot Research" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      build(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function sourceBlock(doc: PDFKit.PDFDocument, source: AcademicSource, index: number, extra?: string): void {
  if (doc.y > 660) doc.addPage();
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#111827").text(`${index}. ${source.title}`);
  doc.font("Helvetica").fontSize(9).fillColor("#374151");
  doc.text(authorsToString(source) || "Autores não informados");
  doc.text(
    `${notInformed(source.year)} • ${SOURCE_TYPE_LABELS[source.type] ?? source.type} • ` +
      `${source.journal ?? source.publisher ?? "Veículo não informado"}`,
  );
  doc.text(`DOI: ${notInformed(source.doi)}  |  URL: ${notInformed(source.url)}`);
  if (extra) {
    doc.fillColor("#6B7280").text(extra);
  }
  doc.moveDown(0.6);
}

export function researchToPdf(topic: string, items: RankedSource[], meta: string[]): Promise<Buffer> {
  return renderPdf((doc) => {
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#111827").text("AcadBot Research — Pesquisa bibliográfica");
    doc.moveDown(0.4);
    doc.font("Helvetica-Bold").fontSize(13).text(topic);
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(8).fillColor("#6B7280");
    for (const line of meta) doc.text(line);
    doc.text(
      "Fontes obtidas de bases académicas externas. Informação não confirmada é apresentada como \"Não informado\".",
    );
    doc.moveDown(0.8);
    items.forEach((item, index) => {
      sourceBlock(
        doc,
        item.source,
        index + 1,
        `Relevância estimada: ${item.relevance.score}% (${item.relevance.label}) — ${item.relevance.reasons.join("; ")}`,
      );
    });
  });
}

export function libraryToPdf(items: LibraryExportItem[]): Promise<Buffer> {
  return renderPdf((doc) => {
    doc.font("Helvetica-Bold").fontSize(16).fillColor("#111827").text("AcadBot Research — Biblioteca");
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(9).fillColor("#6B7280").text(`${items.length} fonte(s).`);
    doc.moveDown(0.6);
    if (items.length === 0) {
      doc.fontSize(11).fillColor("#111827").text("A biblioteca ainda não tem fontes guardadas.");
      return;
    }
    items.forEach((item, index) => {
      sourceBlock(
        doc,
        item.source,
        index + 1,
        `Estado: ${item.status ?? "não lido"} • Tags: ${(item.tags ?? []).join(", ") || "—"} • Projeto: ${
          item.projectTitle ?? "—"
        }`,
      );
      if (item.notes) doc.font("Helvetica-Oblique").fillColor("#4B5563").text(`Notas: ${item.notes}`).moveDown(0.4);
    });
  });
}

export interface PdfTableRow {
  cells: string[];
}

export function tableToPdf(title: string, columns: string[], rows: PdfTableRow[]): Promise<Buffer> {
  return renderPdf((doc) => {
    const usable = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colWidth = usable / Math.max(columns.length, 1);
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#111827").text("AcadBot Research — Matriz de literatura");
    doc.moveDown(0.3);
    doc.fontSize(12).text(title);
    doc.moveDown(0.2);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#6B7280")
      .text('Campos sem informação na fonte são apresentados como "Não identificado na fonte".');
    doc.moveDown(0.6);

    const drawRow = (cells: string[], bold: boolean): void => {
      const startY = doc.y;
      let maxY = startY;
      cells.forEach((cellText, index) => {
        doc
          .font(bold ? "Helvetica-Bold" : "Helvetica")
          .fontSize(7.5)
          .fillColor(bold ? "#111827" : "#374151")
          .text(cellText || "—", doc.page.margins.left + index * colWidth + 2, startY, {
            width: colWidth - 4,
          });
        maxY = Math.max(maxY, doc.y);
      });
      doc.y = maxY;
      doc.moveDown(0.35);
      if (doc.y > doc.page.height - 80) doc.addPage();
    };

    drawRow(columns, true);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor("#D1D5DB")
      .stroke();
    doc.moveDown(0.35);
    for (const row of rows) drawRow(row.cells, false);
  });
}
