import { tokenize, removeStopwords, normalizeText } from "../../lib/text.js";
import type { AcademicSource, RelevanceResult, TopicAnalysis, WorkType } from "../../types/index.js";

const CURRENT_YEAR = new Date().getFullYear();

interface ScoreInput {
  source: AcademicSource;
  analysis: TopicAnalysis;
  topic: string;
  workType: WorkType;
  yearFrom?: number | null;
  yearTo?: number | null;
}

/**
 * Ranking de relevância (§18) — "Relevância estimada".
 * Componentes ponderados: keywords (0.40), resumo (0.15), geografia (0.15),
 * recência (0.10), tipo (0.08), metadados (0.07), citações (0.05).
 * É uma estimativa heurística — nunca uma métrica científica universal.
 */
export function calculateRelevance(input: ScoreInput): RelevanceResult {
  const { source, analysis, topic } = input;
  const reasons: string[] = [];
  const matchedKeywords: string[] = [];

  const titleLower = normalizeText(source.title);
  const abstractLower = normalizeText(source.abstract ?? "");
  const journalLower = normalizeText(source.journal ?? "");
  const keywordsLower = source.keywords.map(normalizeText).join(" ");
  const haystack = `${titleLower} ${abstractLower} ${journalLower} ${keywordsLower}`;

  // 1. Correspondência de keywords (0.40)
  // Um tema bilingue não deve penalizar uma fonte por estar numa só língua:
  // calcula-se a cobertura por grupo (PT, EN e termos do próprio tema) e
  // usa-se a melhor — o que se mede é se a fonte cobre o tema.
  const normalizeList = (terms: string[]): string[] =>
    [...new Set(terms.map(normalizeText))].filter((t) => t.length > 2);

  const ptTerms = normalizeList([...analysis.keywords.pt, ...analysis.synonyms]);
  const enTerms = normalizeList(analysis.keywords.en);
  const topicTerms = normalizeList(removeStopwords(tokenize(topic)));

  const coverage = (terms: string[]): { ratio: number; matched: string[] } => {
    const hits = terms.filter((t) => haystack.includes(t));
    return { ratio: terms.length ? hits.length / terms.length : 0, matched: hits };
  };

  const ptCoverage = coverage(ptTerms);
  const enCoverage = coverage(enTerms);
  const topicCoverage = coverage(topicTerms);
  const keywordScore = Math.max(ptCoverage.ratio, enCoverage.ratio, topicCoverage.ratio, 0.2);

  const matched = [...new Set([...ptCoverage.matched, ...enCoverage.matched, ...topicCoverage.matched])];
  const bestTerms =
    ptCoverage.ratio >= enCoverage.ratio && ptCoverage.ratio >= topicCoverage.ratio
      ? ptTerms
      : enCoverage.ratio >= topicCoverage.ratio
        ? enTerms
        : topicTerms;

  if (matched.length > 0) {
    matchedKeywords.push(...matched.slice(0, 6));
    reasons.push(`Correspondência com ${matched.length} palavra(s)-chave do tema`);
  } else {
    reasons.push("Sem correspondência direta com as palavras-chave do tema");
  }

  // 2. Correspondência no título (peso extra dentro da componente de tema)
  const titleMatches = bestTerms.filter((k) => titleLower.includes(k)).length;
  const titleBoost = bestTerms.length ? titleMatches / bestTerms.length : 0;

  // 3. Geografia (0.15)
  let geoScore = 0.5; // neutro quando não há contexto geográfico definido
  if (analysis.geoContext) {
    const geoTerms = [analysis.geoContext.pt, analysis.geoContext.en].map(normalizeText);
    const geoMatch = geoTerms.some((g) => haystack.includes(g));
    geoScore = geoMatch ? 1 : 0.15;
    if (geoMatch) reasons.push(`Contexto geográfico correspondente (${analysis.geoContext.pt})`);
  }

  // 4. Recência (0.10) — prefere últimos 10 anos, sem punir clássicos demais
  let recencyScore = 0.5;
  if (source.year) {
    const age = CURRENT_YEAR - source.year;
    if (age <= 2) recencyScore = 1;
    else if (age <= 5) recencyScore = 0.85;
    else if (age <= 10) recencyScore = 0.65;
    else if (age <= 20) recencyScore = 0.4;
    else recencyScore = 0.2;
    if (input.yearFrom && source.year < input.yearFrom) recencyScore *= 0.2;
    if (input.yearTo && source.year > input.yearTo) recencyScore *= 0.2;
  }

  // 5. Tipo de publicação (0.08)
  let typeScore = 0.6;
  if (source.type === "article") typeScore = 1;
  else if (source.type === "book") typeScore = 0.85;
  else if (source.type === "conference") typeScore = 0.8;
  else if (source.type === "thesis" || source.type === "dissertation") typeScore = 0.75;
  else if (source.type === "report" || source.type === "working_paper") typeScore = 0.7;
  if (input.workType === "artigo" && source.type === "article") typeScore = 1;

  // 6. Qualidade dos metadados (0.07)
  let filled = 0;
  const checks = [source.authors.length > 0, Boolean(source.year), Boolean(source.doi), Boolean(source.journal || source.publisher), Boolean(source.abstract), Boolean(source.url)];
  for (const c of checks) if (c) filled++;
  const metadataScore = filled / checks.length;
  if (metadataScore >= 0.8) reasons.push("Metadados completos");

  // 7. Citações (0.05) — log scale
  const citationScore =
    source.citationCount && source.citationCount > 0
      ? Math.min(Math.log10(source.citationCount + 1) / 3, 1)
      : 0.3;

  const composite =
    keywordScore * 0.28 +
    titleBoost * 0.12 +
    geoScore * 0.15 +
    recencyScore * 0.10 +
    typeScore * 0.08 +
    metadataScore * 0.07 +
    citationScore * 0.05 +
    (abstractLower ? 0.15 * keywordScore : 0);

  const score = Math.round(Math.min(Math.max(composite * 100, 0), 100));
  const label =
    score >= 85 ? "alta" : score >= 70 ? "relevante" : score >= 50 ? "moderada" : "baixa";

  if (!reasons.length) reasons.push("Correspondência geral limitada com o tema");

  return {
    score,
    label,
    reasons: reasons.slice(0, 4),
    matchedKeywords: [...new Set(matchedKeywords)].slice(0, 6),
  };
}
