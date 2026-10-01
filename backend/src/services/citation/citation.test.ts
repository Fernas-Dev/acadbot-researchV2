import { describe, expect, it } from "vitest";
import { formatCitation, formatAll, SUPPORTED_STYLES } from "./formatter.js";
import { splitAuthorName, initials, apaAuthorList, abntAuthorList } from "./parts.js";
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
    isbn: null,
    url: null,
    type: "book",
    citationCount: null,
    keywords: [],
    language: "pt",
    openAccess: false,
    providers: [{ provider: "openalex", externalId: "W1" }],
    metadata: {},
    ...overrides,
  });
}

describe("parts", () => {
  it("divide nomes compostos e iniciais", () => {
    expect(splitAuthorName("N. Gregory Mankiw")).toEqual({ family: "Mankiw", given: "N. Gregory" });
    expect(splitAuthorName("Silva, João")).toEqual({ family: "Silva", given: "João" });
    expect(splitAuthorName("José Silva Júnior")).toEqual({
      family: "Silva Júnior",
      given: "José",
    });
    expect(initials("N. Gregory")).toBe("N. G.");
  });

  it("formata listas de autores", () => {
    expect(apaAuthorList([{ name: "A B", family: "Silva", given: "António" }])).toBe("Silva, A.");
    expect(abntAuthorList([{ name: "A B", family: "Silva", given: "António" }])).toBe("SILVA, A.");
    expect(
      abntAuthorList([
        { name: "a", family: "Silva" },
        { name: "b", family: "Costa" },
        { name: "c", family: "Pereira" },
        { name: "d", family: "Matos" },
      ]),
    ).toBe("SILVA et al.");
  });
});

describe("APA 7 (§28)", () => {
  it("gera referência completa para livro", () => {
    const citation = formatCitation(source(), "apa7");
    expect(citation.full).toContain("Mankiw, N. G.");
    expect(citation.full).toContain("(2014)");
    expect(citation.full).toContain("Introdução à Economia");
    expect(citation.full).toContain("Cengage Learning");
  });

  it("gera referência e citações para artigo com DOI", () => {
    const citation = formatCitation(
      source({
        type: "article",
        journal: "Journal of Development Economics",
        volume: "110",
        issue: "2",
        pages: "1-18",
        doi: "10.1016/j.jdeveco.2014.01.001",
      }),
      "apa7",
    );
    expect(citation.full).toContain("Journal of Development Economics");
    expect(citation.full).toContain("https://doi.org/10.1016/j.jdeveco.2014.01.001");
    expect(citation.narrative).toBe("Mankiw (2014)");
    expect(citation.parenthetical).toBe("(Mankiw, 2014)");
  });

  it("usa [s.d.] quando o ano não existe (nunca inventa data)", () => {
    const citation = formatCitation(source({ year: null }), "apa7");
    expect(citation.full).toContain("[s.d.]");
    expect(citation.narrative).toContain("[s.d.]");
  });

  it("omite campos ausentes sem inventar editora", () => {
    const citation = formatCitation(source({ publisher: null, doi: null }), "apa7");
    expect(citation.full).not.toContain("undefined");
    expect(citation.full).not.toContain("null");
  });
});

describe("ABNT (§28)", () => {
  it("gera referência de livro em maiúsculas com editora", () => {
    const citation = formatCitation(source(), "abnt");
    expect(citation.full).toContain("MANKIW, N. G.");
    expect(citation.full).toContain("Cengage Learning");
    expect(citation.full.endsWith("2014.")).toBe(true);
  });

  it("gera citação autor-data no estilo ABNT", () => {
    const citation = formatCitation(source(), "abnt");
    expect(citation.parenthetical).toBe("(MANKIW, 2014)");
  });

  it("usa et al. com mais de três autores", () => {
    const citation = formatCitation(
      source({
        authors: [
          { name: "A Silva", family: "Silva" },
          { name: "B Costa", family: "Costa" },
          { name: "C Pereira", family: "Pereira" },
          { name: "D Matos", family: "Matos" },
        ],
      }),
      "abnt",
    );
    expect(citation.full.startsWith("SILVA et al.")).toBe(true);
  });
});

describe("registry de estilos", () => {
  it("expõe APA 7 e ABNT e gera ambas", () => {
    expect(SUPPORTED_STYLES).toEqual(["apa7", "abnt"]);
    expect(formatAll(source()).map((c) => c.style)).toEqual(["apa7", "abnt"]);
  });
});
