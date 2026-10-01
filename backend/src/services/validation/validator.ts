import { parseReference } from "./referenceParser.js";
import { matchSource, decideStatus, type MatchResult } from "./matcher.js";
import { verifyDOI } from "./doiValidator.js";
import { finalizeSource, computeFingerprint } from "../research/normalize.js";
import { deduplicateSources } from "../research/deduplication.js";
import { providerRegistry, ensureRegistryLoaded } from "../../providers/registry.js";
import { firstAuthorSurname } from "../../lib/text.js";
import type {
  AcademicSource,
  ParsedReference,
  ProviderSearchResult,
  ValidationMatch,
  ValidationOutcome,
  ValidationStatus,
} from "../../types/index.js";

const STATUS_MESSAGES: Record<ValidationStatus, string> = {
  confirmed:
    "Referência confirmada: foram encontradas correspondências fortes nas fontes académicas consultadas.",
  partially_confirmed:
    "Referência parcialmente confirmada: a obra foi encontrada, mas existem divergências em alguns campos.",
  unconfirmed:
    "Não foi possível confirmar esta referência nas fontes consultadas. Isto não significa que seja falsa — pode não estar indexada.",
  inconsistent:
    "Referência inconsistente: os dados indicados entram em conflito com as fontes encontradas.",
};

export interface ValidationDetail {
  parsed: ParsedReference;
  status: ValidationStatus;
  confidence: number;
  outcome: ValidationOutcome;
  matches: ValidationMatch[];
  providersQueried: string[];
  providersFailed: string[];
  doiVerification: Awaited<ReturnType<typeof verifyDOI>> | null;
}

/** Constrói a query de pesquisa a partir da referência parseada. */
function buildQuery(ref: ParsedReference): string {
  const parts: string[] = [];
  if (ref.title) parts.push(ref.title);
  else if (ref.authors.length > 0) parts.push(ref.authors.join(" "));
  if (!ref.title && ref.raw) parts.push(ref.raw.slice(0, 200));
  const surname = ref.authors.length ? firstAuthorSurname([{ name: ref.authors[0] }]) : "";
  const base = parts.join(" ").trim();
  return surname && ref.title ? `${ref.title} ${surname}` : base;
}

async function searchProviders(
  query: string,
  maxResults: number,
): Promise<{ sources: AcademicSource[]; ok: string[]; failed: string[] }> {
  await ensureRegistryLoaded();
  const states = providerRegistry.enabled();
  const ok: string[] = [];
  const failed: string[] = [];
  const results = await Promise.all(
    states.map(async (state): Promise<ProviderSearchResult[]> => {
      try {
        const batch = await state.instance.search({
          query,
          maxResults,
          sourceTypes: undefined,
        });
        ok.push(state.instance.label);
        providerRegistry.markOk(state.instance.id);
        return batch;
      } catch {
        failed.push(state.instance.label);
        providerRegistry.markError(state.instance.id, "falha na validação");
        return [];
      }
    }),
  );
  const normalized = results.flat().map(finalizeSource);
  return { sources: deduplicateSources(normalized), ok, failed };
}

/**
 * Validação de referência (§21-23): parser → pesquisa nos providers →
 * matching campo a campo → estado final. Nunca usa "FALSA" quando apenas
 * não foi encontrada (§22).
 */
export async function validateReference(raw: string): Promise<ValidationDetail> {
  const parsed = parseReference(raw);

  // 1. DOI explícito → verificação direta primeiro
  let doiVerification: Awaited<ReturnType<typeof verifyDOI>> | null = null;
  const doiSources: AcademicSource[] = [];
  if (parsed.doi) {
    doiVerification = await verifyDOI(parsed.doi, parsed);
    if (doiVerification.found && doiVerification.source) {
      doiSources.push(doiVerification.source);
    }
  }

  // 2. Pesquisa nos providers (query por título/autor; DOI lookup adicional)
  const query = buildQuery(parsed);
  const { sources, ok, failed } = query
    ? await searchProviders(query, 10)
    : { sources: [], ok: [], failed: [] };

  // 3. Lookup adicional por DOI nos providers via getById (quando não veio de verifyDOI)
  const pool: AcademicSource[] = [...doiSources, ...sources];
  if (parsed.doi && !doiSources.length) {
    for (const state of providerRegistry.enabled()) {
      try {
        const hit = await state.instance.getById(parsed.doi);
        if (hit) pool.push(finalizeSource(hit));
      } catch {
        /* provider falhou — segue com os restantes */
      }
    }
  }

  // 4. Matching campo a campo — top 5 correspondências
  const seenFingerprints = new Set<string>();
  const matches: ValidationMatch[] = [];
  const matchResults = new Map<string, MatchResult>();
  for (const source of pool) {
    const fp = computeFingerprint(source);
    if (seenFingerprints.has(fp)) continue;
    seenFingerprints.add(fp);
    const result = matchSource(parsed, source);
    matchResults.set(fp, result);
    matches.push({
      source,
      provider: source.providers[0]?.provider ?? null,
      confidence: result.confidence,
      fieldScores: result.fieldScores,
    });
  }
  matches.sort((a, b) => b.confidence - a.confidence);
  const top = matches.slice(0, 5);

  const bestFp = top[0] ? computeFingerprint(top[0].source) : null;
  const bestMatch = bestFp ? (matchResults.get(bestFp) ?? null) : null;

  // 5. Estado final — DOI verificado e compatível reforça a confiança
  let status = decideStatus(bestMatch, pool.length > 0);
  if (doiVerification?.found && doiVerification.conflicts.length === 0 && status === "partially_confirmed") {
    status = "confirmed";
  }
  if (doiVerification?.found && doiVerification.conflicts.length > 0) {
    status = "inconsistent";
  }

  const confidence = top[0]?.confidence ?? 0;
  const problems = [...(bestMatch?.conflicts ?? []), ...(doiVerification?.conflicts ?? [])];
  if (failed.length > 0) {
    problems.push(`Não foi possível consultar: ${failed.join(", ")}.`);
  }

  return {
    parsed,
    status,
    confidence,
    outcome: {
      status,
      confidence,
      fieldScores: top[0]?.fieldScores ?? {},
      problems,
      message: STATUS_MESSAGES[status],
    },
    matches: top,
    providersQueried: ok,
    providersFailed: failed,
    doiVerification,
  };
}

