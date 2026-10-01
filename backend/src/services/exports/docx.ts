/**
 * Gerador de DOCX (OOXML) — implementação mínima e autónoma.
 * Mantém a exportação DOCX funcional no backend (§32) sem depender de
 * bibliotecas cujos tipos não resolvem em modo ESM estrito.
 */
import JSZip from "jszip";
import type { AcademicSource } from "../../types/index.js";
import type { RankedSource } from "../research/orchestrator.js";
import { authorsToString, SOURCE_TYPE_LABELS, type LibraryExportItem } from "./csv.js";

export const NOT_INFORMED = "Não informado";
export const NOT_IDENTIFIED_IN_SOURCE = "Não identificado na fonte";

export function orNotInformed(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return NOT_INFORMED;
  return String(value);
}

/** Escapa texto para XML (o conteúdo vem de fontes externas — nunca é interpretado). */
export function escapeXml(input: string): string {
  return (
    input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      // Caracteres de controlo não são válidos em XML 1.0.
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
  );
}

interface RunOptions {
  bold?: boolean;
  italics?: boolean;
  size?: number; // meios-pontos (24 = 12pt)
  color?: string;
}

function run(text: string, options: RunOptions = {}): string {
  const props: string[] = [];
  if (options.bold) props.push("<w:b/>");
  if (options.italics) props.push("<w:i/>");
  if (options.color) props.push(`<w:color w:val="${options.color}"/>`);
  props.push(`<w:sz w:val="${options.size ?? 22}"/>`);
  return `<w:r><w:rPr>${props.join("")}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

export interface ParagraphOptions extends RunOptions {
  spacingAfter?: number;
  spacingBefore?: number;
  alignment?: "left" | "right" | "center";
}

export function paragraph(text: string, options: ParagraphOptions = {}): string {
  const props: string[] = [
    `<w:spacing w:before="${options.spacingBefore ?? 0}" w:after="${options.spacingAfter ?? 120}" w:line="276" w:lineRule="auto"/>`,
  ];
  if (options.alignment) props.push(`<w:jc w:val="${options.alignment}"/>`);
  return `<w:p><w:pPr>${props.join("")}</w:pPr>${run(text, options)}</w:p>`;
}

function cellXml(text: string, options: { bold?: boolean; shaded?: boolean; widthPct: number }): string {
  const shading = options.shaded ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F4F7"/>' : "";
  return (
    `<w:tc><w:tcPr><w:tcW w:w="${options.widthPct}" w:type="pct"/>${shading}</w:tcPr>` +
    paragraph(text, { bold: options.bold, size: 18, spacingAfter: 40 }) +
    "</w:tc>"
  );
}

function tableBorders(): string {
  const side = (name: string): string => `<w:${name} w:val="single" w:sz="4" w:space="0" w:color="D1D5DB"/>`;
  return `<w:tblBorders>${side("top")}${side("left")}${side("bottom")}${side("right")}${side("insideH")}${side("insideV")}</w:tblBorders>`;
}

/** Tabela OOXML — usada pela matriz de literatura. */
export function tableXml(
  columns: Array<{ key: string; label: string }>,
  rows: Array<Record<string, string | number | null | undefined>>,
  emptyLabel = NOT_IDENTIFIED_IN_SOURCE,
): string {
  const widthPct = Math.floor(5000 / Math.max(columns.length, 1));
  const header = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${columns
    .map((column) => cellXml(column.label, { bold: true, shaded: true, widthPct }))
    .join("")}</w:tr>`;
  const body = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const value = row[column.key];
          const text = value === null || value === undefined || value === "" ? emptyLabel : String(value);
          return cellXml(text, { widthPct });
        })
        .join("");
      return `<w:tr>${cells}</w:tr>`;
    })
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${tableBorders()}</w:tblPr>${header}${body}</w:tbl>`;
}

/** Empacota fragmentos de corpo num documento DOCX válido. */
export async function buildDocx(bodyXml: string[]): Promise<Buffer> {
  const document =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${bodyXml.join("")}` +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
    '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>' +
    "</w:body></w:document>";

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    "</Types>";

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    "</Relationships>";

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.file("_rels/.rels", rels);
  zip.file("word/document.xml", document);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

function sourceBlocks(items: RankedSource[], withRelevance: boolean): string[] {
  const out: string[] = [];
  items.forEach((item, index) => {
    const source = item.source;
    out.push(
      paragraph(`${index + 1}. ${source.title}`, { bold: true, size: 24, spacingAfter: 40, spacingBefore: 160 }),
      paragraph(authorsToString(source) || "Autores não informados", { spacingAfter: 20 }),
      paragraph(
        `${orNotInformed(source.year)} • ${SOURCE_TYPE_LABELS[source.type] ?? source.type} • ` +
          `${source.journal ?? source.publisher ?? "Veículo não informado"}`,
        { spacingAfter: 20 },
      ),
      paragraph(`DOI: ${orNotInformed(source.doi)}  |  URL: ${orNotInformed(source.url)}`, { spacingAfter: 40 }),
    );
    if (withRelevance) {
      out.push(
        paragraph(
          `Relevância estimada: ${item.relevance.score}% (${item.relevance.label}) — ${item.relevance.reasons.join("; ")}`,
          { italics: true, size: 18, color: "6B7280" },
        ),
      );
    }
  });
  return out;
}

export async function researchToDocx(topic: string, items: RankedSource[], meta: string[]): Promise<Buffer> {
  return buildDocx([
    paragraph("AcadBot Research — Resultados de pesquisa bibliográfica", { bold: true, size: 30 }),
    paragraph(topic, { bold: true, size: 26 }),
    ...meta.map((line) => paragraph(line, { size: 18, color: "6B7280", spacingAfter: 60 })),
    paragraph(
      "Fontes obtidas de bases académicas externas (Crossref, OpenAlex, Semantic Scholar). " +
        `Informação não confirmada é apresentada como "${NOT_INFORMED}". ` +
        "A relevância é uma estimativa heurística, não uma métrica científica universal.",
      { size: 18, color: "6B7280" },
    ),
    ...sourceBlocks(items, true),
  ]);
}

export async function libraryToDocx(items: LibraryExportItem[]): Promise<Buffer> {
  if (items.length === 0) {
    return buildDocx([
      paragraph("AcadBot Research — Biblioteca", { bold: true, size: 30 }),
      paragraph("Ainda não existem fontes guardadas."),
    ]);
  }
  const body: string[] = [
    paragraph("AcadBot Research — Biblioteca", { bold: true, size: 30 }),
    paragraph(`${items.length} fonte(s).`, { size: 18, color: "6B7280" }),
  ];
  items.forEach((item, index) => {
    const source: AcademicSource = item.source;
    body.push(
      paragraph(`${index + 1}. ${source.title}`, { bold: true, size: 24, spacingBefore: 160, spacingAfter: 40 }),
      paragraph(authorsToString(source) || "Autores não informados", { spacingAfter: 20 }),
      paragraph(
        `${orNotInformed(source.year)} • ${SOURCE_TYPE_LABELS[source.type] ?? source.type} • ` +
          `${source.journal ?? source.publisher ?? "Veículo não informado"}`,
        { spacingAfter: 20 },
      ),
      paragraph(`DOI: ${orNotInformed(source.doi)}  |  URL: ${orNotInformed(source.url)}`, { spacingAfter: 20 }),
      paragraph(
        `Estado: ${item.status ?? "não lido"} • Tags: ${(item.tags ?? []).join(", ") || "—"} • Projeto: ${item.projectTitle ?? "—"}`,
        { size: 18, color: "6B7280", spacingAfter: 40 },
      ),
    );
    if (item.notes) body.push(paragraph(`Notas: ${item.notes}`, { italics: true, size: 18, color: "4B5563" }));
  });
  return buildDocx(body);
}

export async function matrixToDocx(
  title: string,
  columns: Array<{ key: string; label: string }>,
  rows: Array<Record<string, string | number | null | undefined>>,
): Promise<Buffer> {
  return buildDocx([
    paragraph("AcadBot Research — Matriz de revisão da literatura", { bold: true, size: 28 }),
    paragraph(title, { bold: true, size: 24 }),
    paragraph(
      `Campos sem informação disponível na fonte são apresentados como "${NOT_IDENTIFIED_IN_SOURCE}".`,
      { size: 18, color: "6B7280" },
    ),
    tableXml(columns, rows),
  ]);
}

