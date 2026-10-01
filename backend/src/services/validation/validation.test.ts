import { describe, expect, it } from "vitest";
import { parseReference } from "./referenceParser.js";
import { matchSource, decideStatus } from "./matcher.js";
import { finalizeSource } from "../research/normalize.js";
import type { AcademicSource, ProviderSearchResult } from "../../types/index.js";

function source(overrides: Partial<ProviderSearchResult> = {}): AcademicSource {
  return finalizeSource({
    title: "Introdução à Economia",
    authors: [{ name: "N. Gregory Mankiw", family: "Mankiw", given: "N. Gregory" }],
    year: 2014,
    abstract: null,
    journal: null,
    publisher: "Cengage Learning",
    volume: null,
    issue: null,
    pages: null,
    doi: null,
    isbn: "9788522116024",
    url: null,
    type: "book",
    citationCount: null,
    keywords: [],
    language: "pt",
    openAccess: false,
    providers: [{ provider: "openalex", externalId: "W123" }],
    metadata: {},
    ...overrides,
  });
}

describe("parseReference — ABNT", () => {
  it("extrai autor composto, título, editora e ano", () => {
    const parsed = parseReference(
      "MANKIW, N. Gregory. Introdução à Economia. São Paulo: Cengage Learning, 2014.",
    );
    expect(parsed.year).toBe(2014);
    expect(parsed.publisher).toBe("Cengage Learning");
    expect(parsed.title).toBe("Introdução à Economia");
    expect(parsed.authors[0]).toContain("MANKIW");
    expect(parsed.authors[0]).toContain("Gregory");
  });

  it("extrai DOI, ISBN e URL quando presentes", () => {
    const parsed = parseReference(
      "SILVA, J. Crescimento económico em Moçambique. Revista de Economia, v. 12, n. 3, p. 45-67, 2019. DOI: 10.1234/abc.2019.001. ISBN 978-85-221-1602-4. https://exemplo.org/artigo",
    );
    expect(parsed.doi).toBe("10.1234/abc.2019.001");
    expect(parsed.isbn).toBe("9788522116024");
    expect(parsed.url).toBe("https://exemplo.org/artigo");
    expect(parsed.pages).toBe("45-67");
    expect(parsed.volume).toBe("12");
  });
});

describe("parseReference — APA", () => {
  it("extrai ano entre parênteses e título", () => {
    const parsed = parseReference(
      "Mankiw, N. G. (2014). Principles of economics. Cengage Learning.",
    );
    expect(parsed.year).toBe(2014);
    expect(parsed.authors.length).toBeGreaterThan(0);
    expect(parsed.authors[0]).toContain("Mankiw");
  });
});

describe("matchSource (§23)", () => {
  it("confirma quando todos os campos coincidem", () => {
    const parsed = parseReference(
      "MANKIW, N. Gregory. Introdução à Economia. São Paulo: Cengage Learning, 2014.",
    );
    const result = matchSource(parsed, source());
    expect(result.confidence).toBeGreaterThanOrEqual(85);
    expect(result.conflicts).toEqual([]);
    expect(result.fieldScores.title).toBe(100);
    expect(result.fieldScores.year).toBe(100);
  });

  it("penaliza divergência de ano sem declarar falso", () => {
    const parsed = parseReference(
      "MANKIW, N. Gregory. Introdução à Economia. São Paulo: Cengage Learning, 2001.",
    );
    const result = matchSource(parsed, source());
    expect(result.fieldScores.year).toBe(0);
    expect(result.conflicts).toContain("Ano difere (referência: 2001; fonte: 2014)");
  });

  it("marca conflito de DOI diferente", () => {
    const parsed = parseReference(
      "SILVA, J. Artigo de teste. Revista X, 2019. DOI: 10.9999/nao-existe",
    );
    const result = matchSource(parsed, source({ doi: "10.1234/existe", title: "Artigo de teste" }));
    expect(result.conflicts).toContain("DOI diferente da fonte encontrada");
    expect(decideStatus(result, true)).toBe("inconsistent");
  });

  it("não confirma quando não há resultados", () => {
    expect(decideStatus(null, false)).toBe("unconfirmed");
    expect(decideStatus(null, true)).toBe("unconfirmed");
  });

  it("classifica como confirmada com confiança alta e sem conflitos", () => {
    const parsed = parseReference(
      "MANKIW, N. Gregory. Introdução à Economia. São Paulo: Cengage Learning, 2014.",
    );
    expect(decideStatus(matchSource(parsed, source()), true)).toBe("confirmed");
  });

  it("classifica como parcialmente confirmada com divergências ligeiras", () => {
    const parsed = parseReference(
      "MANKIW, N. Gregory. Introdução à Economia. Rio de Janeiro: Cengage Learning, 2013.",
    );
    const result = matchSource(
      parsed,
      source({ publisher: "Cenga Learning", year: 2014, isbn: null }),
    );
    const status = decideStatus(result, true);
    expect(["partially_confirmed", "inconsistent"]).toContain(status);
  });
});
