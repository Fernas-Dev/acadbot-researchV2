import { describe, expect, it, vi, beforeEach } from "vitest";

const searchMock = vi.fn();

vi.mock("../../providers/registry.js", () => ({
  ensureRegistryLoaded: vi.fn(async () => undefined),
  providerRegistry: {
    enabled: () => [
      {
        instance: {
          id: "semantic_scholar",
          label: "Semantic Scholar",
          search: searchMock,
          getById: vi.fn(),
          healthCheck: vi.fn(),
        },
        enabled: true,
        priority: 3,
      },
    ],
    markOk: vi.fn(),
    markError: vi.fn(),
  },
}));

vi.mock("./normalize.js", () => ({
  finalizeSource: (item: any) => ({ ...item, fingerprint: "fp" }),
}));

vi.mock("./deduplication.js", () => ({
  deduplicateSources: (items: any[]) => items,
}));

vi.mock("./topicAnalyzer.js", () => ({
  analyzeTopicLocally: () => ({
    area: "Tecnologia",
    subarea: "IA",
    mainConcepts: ["inteligência artificial"],
    variables: ["atendimento"],
    keywords: { pt: ["inteligência artificial"], en: ["artificial intelligence"] },
    synonyms: ["AI"],
  }),
}));

vi.mock("./queryGenerator.js", () => ({
  generateQueries: () =>
    Array.from({ length: 8 }, (_, index) => ({
      query: `query ${index + 1}`,
      language: "pt",
      purpose: "test",
    })),
}));

vi.mock("./relevance.js", () => ({
  calculateRelevance: () => ({
    score: 80,
    label: "alta",
    reasons: ["match"],
    matchedKeywords: ["inteligência artificial"],
  }),
}));

import { runResearch } from "./orchestrator.js";

describe("runResearch", () => {
  beforeEach(() => {
    searchMock.mockReset();
    searchMock.mockResolvedValue([
      {
        title: "Paper test",
        authors: [],
        year: 2024,
        abstract: "Resumo",
        journal: "Journal",
        publisher: null,
        volume: null,
        issue: null,
        pages: null,
        doi: null,
        isbn: null,
        url: "https://example.com",
        type: "article",
        citationCount: 1,
        keywords: [],
        language: null,
        openAccess: false,
        providers: [{ provider: "semantic_scholar", externalId: "paper-1" }],
        metadata: {},
      },
    ]);
  });

  it("não dispara mais do que 2 consultas no provider público do Semantic Scholar", async () => {
    const result = await runResearch({
      topic: "impacto da IA no atendimento",
      workType: "artigo",
      languages: ["pt"],
      sourceTypes: ["all"],
      maxResults: 10,
    });

    expect(searchMock).toHaveBeenCalledTimes(2);
    expect(result.providerStats[0]?.label).toBe("Semantic Scholar");
  });
});
