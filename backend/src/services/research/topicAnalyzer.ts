import { tokenize, removeStopwords, normalizeText } from "../../lib/text.js";
import type { TopicAnalysis } from "../../types/index.js";
import { AREA_HINTS, PT_EN_TERMS, PT_EN_TERMS_EXTRA, GEO_DB, SYNONYMS, VARIABLE_HINTS } from "./dictionaries.js";

const ALL_TERMS: Record<string, string> = { ...PT_EN_TERMS, ...PT_EN_TERMS_EXTRA };

export interface AnalyzeTopicInput {
  topic: string;
  area?: string | null;
  countryRegion?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
}

function detectGeo(topic: string, override?: string | null): { pt: string; en: string } | null {
  if (override) {
    const key = normalizeText(override);
    return GEO_DB[key] ?? { pt: override, en: override };
  }
  const normalized = normalizeText(topic);
  const keys = Object.keys(GEO_DB).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (normalized.includes(key)) return GEO_DB[key];
  }
  return null;
}

function detectArea(tokens: string[]): { area: string; subarea?: string } | null {
  const joined = tokens.join(" ");
  for (const hint of AREA_HINTS) {
    for (const term of hint.terms) {
      if (joined.includes(term)) return { area: hint.area, subarea: hint.subarea };
    }
  }
  return null;
}

/**
 * Analisa o tema localmente (sem IA): conceitos, área, geografia, período,
 * keywords PT/EN (apenas termos presentes no dicionário — nunca inventados).
 */
export function analyzeTopicLocally(input: AnalyzeTopicInput): TopicAnalysis {
  const contentTokens = removeStopwords(tokenize(input.topic));
  const normalizedTopic = normalizeText(input.topic);

  // Conceitos: primeiro bigramas/trigramas do dicionário, depois unigramas
  const concepts: string[] = [];
  for (const term of Object.keys(ALL_TERMS)) {
    if (term.includes(" ") && normalizedTopic.includes(term)) concepts.push(term);
  }
  for (const token of contentTokens) {
    if (ALL_TERMS[token] || GEO_DB[token] || token.length > 3) concepts.push(token);
  }
  const uniqueConcepts = [...new Set(concepts)].slice(0, 8);

  // Keywords EN: apenas traduções conhecidas
  const enKeywords: string[] = [];
  for (const concept of uniqueConcepts) {
    const translated = ALL_TERMS[concept];
    if (translated) enKeywords.push(translated);
    else if (GEO_DB[concept]) enKeywords.push(GEO_DB[concept].en.toLowerCase());
  }

  const variables = uniqueConcepts.filter((c) => VARIABLE_HINTS.includes(c)).slice(0, 4);
  const geo = detectGeo(input.topic, input.countryRegion ?? null);

  const yearMatches = normalizedTopic.match(/\b(19|20)\d{2}\b/g);
  const period = {
    from: input.yearFrom ?? (yearMatches ? Number(yearMatches[0]) : null),
    to: input.yearTo ?? (yearMatches && yearMatches.length > 1 ? Number(yearMatches[1]) : null),
  };

  const detected = detectArea(contentTokens);
  const area = input.area || detected?.area || null;
  const subarea = input.area ? null : (detected?.subarea ?? null);

  const synonyms: string[] = [];
  for (const concept of uniqueConcepts) {
    const syns = SYNONYMS[concept];
    if (syns) synonyms.push(...syns);
  }

  return {
    area,
    subarea,
    mainConcepts: uniqueConcepts,
    variables,
    geoContext: geo,
    period:
      period.from || period.to ? { from: period.from ?? undefined, to: period.to ?? undefined } : null,
    keywords: {
      pt: uniqueConcepts.slice(0, 6),
      en: [...new Set(enKeywords)].slice(0, 6),
    },
    synonyms: [...new Set(synonyms)].slice(0, 8),
    aiEnhanced: false,
  };
}
