import { describe, expect, it } from "vitest";
import {
  normalizeText,
  tokenize,
  removeStopwords,
  similarity,
  similarityWithContainment,
  jaccard,
  stripHtml,
  truncate,
  normalizeDoi,
  isValidDoiFormat,
  normalizeIsbn,
  firstAuthorSurname,
  uniqueBy,
  levenshtein,
} from "./text.js";

describe("normalizeText", () => {
  it("remove acentos, pontuação e colapsa espaços", () => {
    expect(normalizeText("Inflação e Crescimento Económico!")).toBe(
      "inflacao e crescimento economico",
    );
    expect(normalizeText("  Moçambique — 2024  ")).toBe("mocambique 2024");
  });
});

describe("tokenize / removeStopwords", () => {
  it("tokeniza e remove palavras funcionais", () => {
    const tokens = tokenize("Impacto da inflação no crescimento económico de Moçambique");
    expect(tokens).toContain("inflacao");
    const content = removeStopwords(tokens);
    expect(content).not.toContain("da");
    expect(content).not.toContain("de");
    expect(content).toContain("mocambique");
  });
});

describe("levenshtein / similarity", () => {
  it("calcula distância de edição", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("igual", "igual")).toBe(0);
  });

  it("devolve 1 para textos idênticos (ignorando acentos e caixa)", () => {
    expect(similarity("Introdução à Economia", "introducao a economia")).toBe(1);
  });

  it("nunca pontua abaixo da similaridade simples quando há contenção", () => {
    const base = "Impacto da inflação no crescimento económico";
    const extended = "Impacto da inflação no crescimento económico de Moçambique (2000-2020)";
    const containment = similarityWithContainment(base, extended);
    expect(containment).toBeGreaterThanOrEqual(similarity(base, extended));
    expect(containment).toBeGreaterThan(0.6);
  });

  it("jaccard mede interseção de tokens", () => {
    expect(jaccard(["a", "b", "c"], ["a", "b"])).toBeCloseTo(2 / 3, 5);
    expect(jaccard([], [])).toBe(1);
  });
});

describe("HTML e truncagem", () => {
  it("remove tags e desescapa entidades", () => {
    expect(stripHtml("<jats:p>Economia &amp; política</jats:p>")).toBe("Economia & política");
  });

  it("trunca com reticências", () => {
    expect(truncate("abcdefghij", 5)).toBe("abcd…");
    expect(truncate("abc", 10)).toBe("abc");
  });
});

describe("identificadores", () => {
  it("normaliza DOI de várias formas", () => {
    expect(normalizeDoi("https://doi.org/10.1016/J.JDEVE.2014.01.001")).toBe(
      "10.1016/j.jdeve.2014.01.001",
    );
    expect(normalizeDoi("doi: 10.1000/XYZ")).toBe("10.1000/xyz");
    expect(isValidDoiFormat("10.1016/j.jdeve.2014.01.001")).toBe(true);
    expect(isValidDoiFormat("nao-e-doi")).toBe(false);
  });

  it("normaliza ISBN removendo separadores", () => {
    expect(normalizeIsbn("978-85-221-1602-4")).toBe("9788522116024");
    expect(normalizeIsbn("0 306 40615 2")).toBe("0306406152");
  });
});

describe("autores", () => {
  it("extrai o sobrenome do primeiro autor", () => {
    expect(firstAuthorSurname([{ name: "N. Gregory Mankiw" }])).toBe("mankiw");
    expect(firstAuthorSurname([{ name: "SILVA, João" }])).toBe("silva");
    expect(firstAuthorSurname([{ name: "João Silva", family: "Silva" }])).toBe("silva");
    expect(firstAuthorSurname([])).toBe("");
  });

  it("uniqueBy remove repetidos mantendo a ordem", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "a" }];
    expect(uniqueBy(items, (i) => i.id).map((i) => i.id)).toEqual(["a", "b"]);
  });
});
