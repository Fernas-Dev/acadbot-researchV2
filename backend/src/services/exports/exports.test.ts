import { describe, expect, it } from "vitest";
import { generateExport } from "./index.js";
import { researchToCsv, libraryToCsv, matrixToCsv } from "./csv.js";
import { sourcesToBibtex } from "./bibtex.js";
import { sourcesToRis } from "./ris.js";
import { escapeXml, buildDocx, tableXml } from "./docx.js";
import { finalizeSource } from "../research/normalize.js";
import type { AcademicSource, ProviderSearchResult } from "../../types/index.js";
import type { RankedSource } from "../research/orchestrator.js";

function source(overrides: Partial<ProviderSearchResult> = {}): AcademicSource {
  return finalizeSource({
    title: "Inflation and economic growth in Mozambique",
    authors: [{ name: "João Silva", family: "Silva", given: "João" }],
    year: 2019,
    abstract: "Estudo sobre inflação e crescimento.",
    journal: "Journal of African Economies",
    publisher: null,
    volume: "12",
    issue: "3",
    pages: "45-67",
    doi: "10.1234/jae.2019.001",
    isbn: null,
    url: "https://exemplo.org/artigo",
    type: "article",
    citationCount: 25,
    keywords: ["inflation"],
    language: "en",
    openAccess: true,
    providers: [{ provider: "crossref", externalId: "10.1234/jae.2019.001" }],
    metadata: {},
    ...overrides,
  });
}

const ranked: RankedSource[] = [
  {
    source: source(),
    relevance: { score: 92, label: "alta", reasons: ["Correspondência de keywords"], matchedKeywords: ["inflation"] },
  },
];

describe("CSV", () => {
  it("exporta resultados com relevância e BOM para Excel", () => {
    const csv = researchToCsv("Inflação em Moçambique", ranked);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Relevância estimada");
    expect(csv).toContain("92% (alta)");
    expect(csv).toContain("Inflation and economic growth in Mozambique");
  });

  it("escapa aspas e ponto-e-vírgula", () => {
    const csv = libraryToCsv([
      { source: source({ title: 'Título com "aspas", e vírgula' }), status: "read", tags: ["economia"] },
    ]);
    expect(csv).toContain('"Título com ""aspas"", e vírgula"');
  });

  it("exporta a matriz com colunas fixas", () => {
    const csv = matrixToCsv(
      "Matriz",
      [{ author: "Silva", methodology: "Não identificado na fonte" }],
      [
        { key: "author", label: "Autor" },
        { key: "methodology", label: "Metodologia" },
      ],
    );
    expect(csv).toContain("Autor,Metodologia");
    expect(csv).toContain("Não identificado na fonte");
  });
});

describe("BibTeX e RIS", () => {
  it("gera BibTeX com tipo, chave e DOI", () => {
    const bib = sourcesToBibtex([source()]);
    expect(bib).toContain("@article{silva2019inflation");
    expect(bib).toContain("doi = {10.1234/jae.2019.001}");
    expect(bib).toContain("author = {João Silva}");
  });

  it("gera RIS com campos padrão", () => {
    const ris = sourcesToRis([source()]);
    expect(ris).toContain("TY  - JOUR");
    expect(ris).toContain("AU  - João Silva");
    expect(ris).toContain("DO  - 10.1234/jae.2019.001");
    expect(ris).toContain("ER  - ");
  });

  it("usa tipo genérico quando o tipo é desconhecido no RIS", () => {
    expect(sourcesToRis([source({ type: "other" })])).toContain("TY  - GEN");
  });
});

describe("DOCX (OOXML)", () => {
  it("escapa XML de conteúdo externo", () => {
    expect(escapeXml("<script>alert('x')</script> & \"aspas\"")).toBe(
      "&lt;script&gt;alert(&apos;x&apos;)&lt;/script&gt; &amp; &quot;aspas&quot;",
    );
  });

  it("gera um ficheiro DOCX válido (zip com word/document.xml)", async () => {
    const buffer = await buildDocx([tableXml([{ key: "a", label: "A" }], [{ a: "valor" }], "—")]);
    expect(buffer.byteLength).toBeGreaterThan(500);
    // assinatura ZIP: PK\x03\x04
    expect(buffer.subarray(0, 2).toString("utf8")).toBe("PK");
  });
});

describe("generateExport (§32)", () => {
  it("devolve ficheiro CSV com nome e mime corretos", async () => {
    const file = await generateExport({
      kind: "research",
      format: "csv",
      title: "Inflação em Moçambique",
      results: ranked,
    });
    expect(file.fileName).toBe("inflacao-em-mocambique-research.csv");
    expect(file.mimeType).toContain("text/csv");
    expect(file.content.toString("utf8")).toContain("Inflation");
  });

  it("gera PDF válido a partir dos resultados", async () => {
    const file = await generateExport({
      kind: "research",
      format: "pdf",
      title: "Inflação em Moçambique",
      results: ranked,
      meta: ["Fontes: 1"],
    });
    expect(file.mimeType).toBe("application/pdf");
    expect(file.content.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });

  it("gera DOCX a partir da matriz com campos em falta marcados", async () => {
    const file = await generateExport({
      kind: "matrix",
      format: "docx",
      title: "Matriz de revisão",
      matrixColumns: [
        { key: "author", label: "Autor" },
        { key: "methodology", label: "Metodologia" },
      ],
      matrixRows: [{ author: "Silva", methodology: null }],
    });
    expect(file.fileName.endsWith(".docx")).toBe(true);
    expect(file.content.byteLength).toBeGreaterThan(500);
  });

  it("gera BibTeX e RIS a partir da biblioteca", async () => {
    const bib = await generateExport({
      kind: "library",
      format: "bibtex",
      title: "Biblioteca",
      libraryItems: [{ source: source() }],
    });
    expect(bib.fileName.endsWith(".bibtex")).toBe(true);
    expect(bib.content.toString("utf8")).toContain("@article");

    const ris = await generateExport({
      kind: "library",
      format: "ris",
      title: "Biblioteca",
      libraryItems: [{ source: source() }],
    });
    expect(ris.content.toString("utf8")).toContain("TY  - JOUR");
  });
});
