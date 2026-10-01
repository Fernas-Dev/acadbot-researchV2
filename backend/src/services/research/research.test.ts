import { describe, expect, it } from "vitest";
import { analyzeTopicLocally } from "./topicAnalyzer.js";
import { generateQueries } from "./queryGenerator.js";
import { deduplicateSources } from "./deduplication.js";
import { finalizeSource, computeFingerprint } from "./normalize.js";
import { calculateRelevance } from "./relevance.js";
import type { AcademicSource, ProviderSearchResult } from "../../types/index.js";

const TOPIC = "Impacto da inflação no crescimento económico de Moçambique";

function raw(overrides: Partial<ProviderSearchResult> = {}): ProviderSearchResult {
  return {
    title: "Inflation and economic growth in Mozambique",
    authors: [{ name: "João Silva", family: "Silva", given: "João" }],
    year: 2019,
    abstract: "Study on inflation, monetary policy and GDP growth in Mozambique.",
    journal: "Journal of African Economies",
    publisher: null,
    volume: "12",
    issue: "3",
    pages: "45-67",
    doi: "10.1234/jae.2019.001",
    isbn: null,
    url: null,
    type: "article",
    citationCount: 25,
    keywords: ["inflation", "economic growth"],
    language: "en",
    openAccess: false,
    providers: [{ provider: "crossref", externalId: "10.1234/jae.2019.001" }],
    metadata: {},
    ...overrides,
  };
}

describe("topicAnalyzer (§12)", () => {
  it("deteta contexto geográfico, conceitos e keywords EN", () => {
    const analysis = analyzeTopicLocally({ topic: TOPIC });
    expect(analysis.geoContext?.pt.toLowerCase()).toContain("moçambique");
    expect(analysis.geoContext?.en.toLowerCase()).toContain("mozambique");
    expect(analysis.mainConcepts.length).toBeGreaterThan(2);
    expect(analysis.keywords.pt.join(" ")).toContain("inflacao");
    expect(analysis.keywords.en.join(" ")).toContain("inflation");
  });

  it("deteta período quando o tema inclui anos", () => {
    const analysis = analyzeTopicLocally({ topic: "Inflação em Moçambique 2000 2020" });
    expect(analysis.period?.from).toBe(2000);
    expect(analysis.period?.to).toBe(2020);
  });

  it("respeita a área indicada pelo utilizador", () => {
    const analysis = analyzeTopicLocally({ topic: TOPIC, area: "Economia Monetária" });
    expect(analysis.area).toBe("Economia Monetária");
  });
});

describe("queryGenerator (§13)", () => {
  it("gera múltiplas queries em PT e EN, sem repetições", () => {
    const analysis = analyzeTopicLocally({ topic: TOPIC });
    const queries = generateQueries(analysis, 8);
    expect(queries.length).toBeGreaterThan(2);
    expect(new Set(queries.map((q) => q.query.toLowerCase())).size).toBe(queries.length);
    expect(queries.some((q) => q.language === "en")).toBe(true);
    expect(queries.some((q) => q.language === "pt")).toBe(true);
  });
});

describe("normalização e deduplicação (§16-17)", () => {
  it("fingerprint prioriza DOI", () => {
    expect(computeFingerprint(raw())).toBe("doi:10.1234/jae.2019.001");
  });

  it("usa ISBN quando não há DOI", () => {
    expect(computeFingerprint(raw({ doi: null, isbn: "978-85-221-1602-4" }))).toBe(
      "isbn:9788522116024",
    );
  });

  it("faz fallback para título + autor + ano", () => {
    const fp = computeFingerprint(raw({ doi: null, isbn: null }));
    expect(fp.startsWith("ta:")).toBe(true);
    expect(fp).toBe(computeFingerprint(raw({ doi: null, isbn: null, url: "https://outro.org" })));
  });

  it("remove duplicados entre providers e mantém providers relacionados", () => {
    const a = finalizeSource(raw());
    const b = finalizeSource(
      raw({
        title: "Inflation and economic growth in Mozambique",
        abstract: null,
        providers: [{ provider: "openalex", externalId: "W123" }],
      }),
    );
    const merged = deduplicateSources([a, b]);
    expect(merged).toHaveLength(1);
    expect(merged[0].providers.map((p) => p.provider).sort()).toEqual(["crossref", "openalex"]);
    expect(merged[0].abstract).toContain("inflation");
  });

  it("mantém fontes distintas separadas", () => {
    const a = finalizeSource(raw());
    const b = finalizeSource(
      raw({
        title: "Fiscal policy and unemployment in Kenya",
        doi: "10.1234/outro",
        providers: [{ provider: "openalex", externalId: "W999" }],
      }),
    );
    expect(deduplicateSources([a, b])).toHaveLength(2);
  });
});

describe("relevância (§18)", () => {
  const analysis = analyzeTopicLocally({ topic: TOPIC });

  it("pontua alto a fonte alinhada com o tema", () => {
    const source: AcademicSource = finalizeSource(raw());
    const result = calculateRelevance({ source, analysis, topic: TOPIC, workType: "monografia" });
    expect(result.score).toBeGreaterThan(60);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(["alta", "relevante", "moderada"]).toContain(result.label);
  });

  it("pontua baixo uma fonte sem relação com o tema", () => {
    const source: AcademicSource = finalizeSource(
      raw({
        title: "Deep learning for image segmentation",
        abstract: "Convolutional networks applied to medical imaging.",
        keywords: ["neural networks"],
        doi: "10.9999/irrelevante",
      }),
    );
    const result = calculateRelevance({ source, analysis, topic: TOPIC, workType: "monografia" });
    expect(result.score).toBeLessThan(60);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("é sempre apresentada como estimativa de 0 a 100", () => {
    const source: AcademicSource = finalizeSource(raw({ abstract: null, year: null }));
    const result = calculateRelevance({ source, analysis, topic: TOPIC, workType: "artigo" });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
