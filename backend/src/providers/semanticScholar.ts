import { fetchJson, sleep } from "../lib/http.js";
import { env } from "../config/index.js";
import { normalizeDoi } from "../lib/text.js";
import type {
  AcademicSearchProvider,
  ProviderHealth,
  ProviderId,
  ProviderSearchInput,
  ProviderSearchResult,
  SourceType,
} from "../types/index.js";

const API_BASE = "https://api.semanticscholar.org/graph/v1";

interface S2Paper {
  paperId?: string;
  title?: string;
  abstract?: string | null;
  year?: number;
  venue?: string;
  authors?: Array<{ name?: string }>;
  externalIds?: { DOI?: string; ArXiv?: string; CorpusId?: number };
  citationCount?: number;
  referenceCount?: number;
  publicationTypes?: string[];
  journal?: { name?: string; volume?: string; pages?: string };
  openAccessPdf?: { url?: string } | null;
  url?: string;
  publicationDate?: string;
}

function mapType(publicationTypes?: string[]): SourceType {
  const types = publicationTypes ?? [];
  if (types.includes("Conference")) return "conference";
  if (types.includes("Book") || types.includes("BookChapter")) return "book";
  if (types.includes("Thesis")) return "thesis";
  if (types.includes("Report")) return "report";
  if (types.includes("JournalArticle") || types.includes("Review")) return "article";
  return "other";
}

function mapPaper(paper: S2Paper): ProviderSearchResult | null {
  const title = paper.title?.trim();
  if (!title) return null;

  const authors = (paper.authors ?? [])
    .map((a) => a.name)
    .filter((n): n is string => Boolean(n))
    .map((name) => ({ name, family: null, given: null }));

  const doi = paper.externalIds?.DOI ? normalizeDoi(paper.externalIds.DOI) : null;
  const oaUrl = paper.openAccessPdf?.url ?? null;

  const metadata: Record<string, unknown> = {};
  if (paper.externalIds?.ArXiv) metadata.arxiv = paper.externalIds.ArXiv;
  if (paper.referenceCount !== undefined) metadata.referenceCount = paper.referenceCount;
  if (paper.publicationDate) metadata.publicationDate = paper.publicationDate;
  if (paper.venue) metadata.venue = paper.venue;

  const externalId = paper.paperId ?? doi ?? title;

  return {
    title,
    authors,
    year: paper.year ?? null,
    abstract: paper.abstract ?? null,
    journal: paper.journal?.name ?? (paper.venue ? paper.venue : null),
    publisher: null, // Semantic Scholar não fornece editora — nunca inventamos
    volume: paper.journal?.volume ?? null,
    issue: null,
    pages: paper.journal?.pages ?? null,
    doi,
    isbn: null,
    url: doi ? `https://doi.org/${doi}` : (oaUrl ?? paper.url ?? null),
    type: mapType(paper.publicationTypes),
    citationCount: typeof paper.citationCount === "number" ? paper.citationCount : null,
    keywords: [],
    language: null,
    openAccess: Boolean(oaUrl),
    providers: [{ provider: "semantic_scholar" as ProviderId, externalId }],
    metadata,
  };
}

/**
 * Throttle client-side: a API pública do Semantic Scholar tem limites
 * severos sem key (~1 req/segundo partilhado). Chamadas ficam em fila.
 */
class Throttler {
  private lastRequestAt = 0;
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly minIntervalMs: number) {}

  async gate(): Promise<void> {
    const run = this.chain.then(async () => {
      const now = Date.now();
      const wait = this.lastRequestAt + this.minIntervalMs - now;
      if (wait > 0) await sleep(wait);
      this.lastRequestAt = Date.now();
    });
    this.chain = run.catch(() => undefined);
    await run;
  }
}

export class SemanticScholarProvider implements AcademicSearchProvider {
  readonly id = "semantic_scholar" as const;
  readonly label = "Semantic Scholar";
  private throttler = new Throttler(env.SEMANTIC_SCHOLAR_API_KEY ? 200 : 1100);

  private headers(): Record<string, string> {
    return env.SEMANTIC_SCHOLAR_API_KEY
      ? { "x-api-key": env.SEMANTIC_SCHOLAR_API_KEY }
      : {};
  }

  private async throttledFetch<T>(url: string, timeoutMs = 15000): Promise<T> {
    await this.throttler.gate();
    return fetchJson<T>(url, {
      headers: this.headers(),
      label: "semantic_scholar",
      timeoutMs,
      retries: 1,
    });
  }

  async search(input: ProviderSearchInput): Promise<ProviderSearchResult[]> {
    const params = new URLSearchParams();
    params.set("query", input.query);
    params.set("limit", String(Math.min(Math.max(input.maxResults, 1), 100)));
    params.set(
      "fields",
      "title,abstract,year,authors,externalIds,citationCount,referenceCount,publicationTypes,journal,openAccessPdf,url,publicationDate,venue",
    );
    if (input.yearFrom && input.yearTo) params.set("year", `${input.yearFrom}-${input.yearTo}`);
    else if (input.yearFrom) params.set("year", `${input.yearFrom}-`);
    else if (input.yearTo) params.set("year", `-${input.yearTo}`);

    const url = `${API_BASE}/paper/search?${params.toString()}`;
    const data = await this.throttledFetch<{ data?: S2Paper[] }>(url);
    return (data.data ?? []).map(mapPaper).filter((w): w is ProviderSearchResult => w !== null);
  }

  async getById(externalId: string): Promise<ProviderSearchResult | null> {
    const fields =
      "title,abstract,year,authors,externalIds,citationCount,referenceCount,publicationTypes,journal,openAccessPdf,url,publicationDate,venue";
    try {
      const data = await this.throttledFetch<S2Paper>(
        `${API_BASE}/paper/${encodeURIComponent(externalId)}?fields=${fields}`,
      );
      return mapPaper(data);
    } catch {
      return null;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      await this.throttledFetch<unknown>(
        `${API_BASE}/paper/search?query=test&limit=1&fields=title`,
        8000,
      );
      return { ok: true, latencyMs: Date.now() - start };
    } catch (error) {
      return {
        ok: false,
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export const semanticScholarProvider = new SemanticScholarProvider();

