import { finalizeSource } from "./normalize.js";
import { deduplicateSources } from "./deduplication.js";
import { analyzeTopicLocally } from "./topicAnalyzer.js";
import { generateQueries } from "./queryGenerator.js";
import { calculateRelevance } from "./relevance.js";
import { providerRegistry, ensureRegistryLoaded } from "../../providers/registry.js";
import { providerFailMessage } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import type {
  AcademicSource,
  GeneratedQuery,
  ProgressStep,
  ProviderSearchResult,
  RelevanceResult,
  ResearchParams,
  TopicAnalysis,
} from "../../types/index.js";

export interface RankedSource {
  source: AcademicSource;
  relevance: RelevanceResult;
}

export interface ProviderRunStat {
  id: string;
  label: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface OrchestratorOutput {
  analysis: TopicAnalysis;
  queries: GeneratedQuery[];
  ranked: RankedSource[];
  providerStats: ProviderRunStat[];
  warnings: string[];
  durationMs: number;
}

export type StepReporter = (steps: ProgressStep[], percent: number) => void;

function baseSteps(): ProgressStep[] {
  return [
    { key: "analyze", label: "Tema analisado", state: "pending" },
    { key: "queries", label: "Queries geradas", state: "pending" },
    { key: "crossref", label: "Crossref pesquisado", state: "pending" },
    { key: "openalex", label: "OpenAlex pesquisado", state: "pending" },
    { key: "semantic_scholar", label: "Semantic Scholar pesquisado", state: "pending" },
    { key: "dedupe", label: "Duplicados removidos", state: "pending" },
    { key: "relevance", label: "Analisando relevância", state: "pending" },
    { key: "finalize", label: "Finalização", state: "pending" },
  ];
}

function setStep(
  steps: ProgressStep[],
  key: string,
  state: ProgressStep["state"],
  detail?: string,
): ProgressStep[] {
  return steps.map((s) => (s.key === key ? { ...s, state, ...(detail ? { detail } : {}) } : s));
}

function percentFor(steps: ProgressStep[]): number {
  const done = steps.filter((s) => s.state === "done").length;
  const active = steps.filter((s) => s.state === "active").length;
  return Math.min(99, Math.round((done / steps.length) * 100 + (active ? 100 / steps.length / 2 : 0)));
}

/**
 * Research Orchestrator (§14): tema → análise → queries → providers →
 * normalização → deduplicação → relevância.
 * Continua a funcionar se um provider falhar (§47).
 */
export async function runResearch(
  params: ResearchParams,
  onStep?: StepReporter,
): Promise<OrchestratorOutput> {
  const start = Date.now();
  let steps = baseSteps();
  const warnings: string[] = [];
  const providerStats: ProviderRunStat[] = [];
  const report: StepReporter = (next, percent) => {
    steps = next;
    onStep?.(steps, percent);
  };

  await ensureRegistryLoaded();

  // 1. Topic Analyzer
  report(setStep(steps, "analyze", "active"), 4);
  const analysis = analyzeTopicLocally({
    topic: params.topic,
    area: params.area ?? null,
    countryRegion: params.countryRegion ?? null,
    yearFrom: params.yearFrom ?? null,
    yearTo: params.yearTo ?? null,
  });
  report(setStep(steps, "analyze", "done"), percentFor(steps));

  // 2. Query Generator
  report(setStep(steps, "queries", "active"), percentFor(steps));
  const queries = generateQueries(analysis, 8);
  report(setStep(steps, "queries", "done", `${queries.length} queries`), percentFor(steps));

  // 3. Providers — até 4 queries por provider, execução concorrente
  const enabledStates = providerRegistry.enabled();
  const resultsPerQuery = Math.max(5, Math.ceil(params.maxResults / Math.max(queries.length, 1)) + 5);
  const typeFilters = params.sourceTypes.includes("all")
    ? undefined
    : (params.sourceTypes.filter((t) => t !== "all") as ProviderSearchResult["type"][]);

  const collected = new Map<string, ProviderSearchResult[]>();
  await Promise.all(
    enabledStates.map(async (state): Promise<void> => {
      const providerKey = state.instance.id;
      steps = setStep(steps, providerKey, "active");
      report(steps, percentFor(steps));
      const batch: ProviderSearchResult[] = [];
      let ok = true;
      let errorMessage: string | undefined;
      try {
        for (const q of queries.slice(0, 4)) {
          const results = await state.instance.search({
            query: q.query,
            maxResults: resultsPerQuery,
            yearFrom: params.yearFrom ?? null,
            yearTo: params.yearTo ?? null,
            sourceTypes: typeFilters,
          });
          batch.push(...results);
          if (batch.length >= params.maxResults * 2) break;
        }
        providerRegistry.markOk(state.instance.id);
      } catch (error) {
        ok = false;
        errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn({ provider: providerKey, err: errorMessage }, "provider falhou na pesquisa");
        providerRegistry.markError(providerKey, errorMessage);
        warnings.push(`${state.instance.label}: ${providerFailMessage}`);
      }
      collected.set(providerKey, batch);
      providerStats.push({
        id: providerKey,
        label: state.instance.label,
        ok,
        count: batch.length,
        ...(errorMessage ? { error: errorMessage } : {}),
      });
      steps = setStep(steps, providerKey, ok ? "done" : "failed");
      report(steps, percentFor(steps));
    }),
  );

  // 4. Normalização + deduplicação
  report(setStep(steps, "dedupe", "active"), percentFor(steps));
  const normalized: AcademicSource[] = [];
  for (const results of collected.values()) {
    for (const item of results) normalized.push(finalizeSource(item));
  }
  const unique = deduplicateSources(normalized);
  report(setStep(steps, "dedupe", "done", `${unique.length} fontes únicas`), percentFor(steps));

  // 5. Relevância
  report(setStep(steps, "relevance", "active"), percentFor(steps));
  const ranked: RankedSource[] = unique.map((source) => ({
    source,
    relevance: calculateRelevance({
      source,
      analysis,
      topic: params.topic,
      workType: params.workType,
      yearFrom: params.yearFrom ?? null,
      yearTo: params.yearTo ?? null,
    }),
  }));
  ranked.sort((a, b) => b.relevance.score - a.relevance.score);
  const limited = ranked.slice(0, params.maxResults * 2);
  report(setStep(steps, "relevance", "done"), percentFor(steps));

  // 6. Finalização
  report(setStep(steps, "finalize", "active"), percentFor(steps));
  report(setStep(steps, "finalize", "done"), 100);

  return { analysis, queries, ranked: limited, providerStats, warnings, durationMs: Date.now() - start };
}

