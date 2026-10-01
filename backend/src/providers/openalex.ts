import { fetchJson } from "../lib/http.js";
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

const API_BASE = "https://api.openalex.org";

interface OpenAlexWork {
  id?: string;
  doi?: string;
  title?: string;
  display_name?: string;
  authorships?: Array<{ author?: { display_name?: string } }>;
  publication_year?: number;
  abstract_inverted_index?: Record<string, number[]>;
  primary_location?: {
    source?: { display_name?: string; host_organization_name?: string } | null;
    landing_page_url?: string;
  };
  type?: string;
  cited_by_count?: number;
  keywords?: Array<{ display_name?: string }>;
  concepts?: Array<{ display_name?: string; score?: number }>;
  open_access?: { is_oa?: boolean; oa_url?: string };
  language?: string;
  biblio?: { volume?: string; issue?: string; first_page?: string; last_page?: string };
  type_crossref?: string;
}

function mapType(openalexType?: string): SourceType {
  const t = openalexType ?? "";
  if (t === "article" || t === "editorial" || t === "letter") return "article";
  if (t === "book" || t === "book-chapter" || t === "book-series") return "book";
  if (t === "dissertation") return "thesis";
  if (t === "report" || t === "standard") return "report";
  if (t === "preprint") return "working_paper";
  if (t === "proceedings-article") return "conference";
  return "other";
}

/** Reconstrói o resumo do formato inverted index do OpenAlex. */
function reconstructAbstract(inverted?: Record<string, number[]>): string | null {
  if (!inverted) return null;
  const words: Array<{ pos: number; word: string }> = [];
  for (const [word, positions] of Object.entries(inverted)) {
    for (const pos of positions) words.push({ pos, word });
  }
  words.sort((a, b) => a.pos - b.pos);
  const text = words.map((w) => w.word).join(" ").trim();
  return text.length > 0 ? text : null;
}

export function mapOpenAlexWork(work: OpenAlexWork): ProviderSearchResult | null {
  const title = (work.display_name ?? work.title ?? "").trim();
  if (!title) return null;

  const authors = (work.authorships ?? [])
    .map((a) => a.author?.display_name)
    .filter((n): n is string => Boolean(n))
    .map((name) => ({ name, family: null, given: null }));

  const doi = work.doi ? normalizeDoi(work.doi) : null;

  const biblio = work.biblio ?? {};
  const pages =
    biblio.first_page && biblio.last_page
      ? `${biblio.first_page}-${biblio.last_page}`
      : (biblio.first_page ?? null);

  const keywords = [
    ...(work.keywords ?? []).map((k) => k.display_name),
    ...(work.concepts ?? [])
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5)
      .map((c) => c.display_name),
  ].filter((k): k is string => Boolean(k));

  const oaUrl = work.open_access?.oa_url ?? null;
  const externalId = work.id ?? doi ?? title;

  const metadata: Record<string, unknown> = {};
  if (work.type_crossref) metadata.type_crossref = work.type_crossref;
  if (oaUrl) metadata.oa_url = oaUrl;
  if (work.primary_location?.landing_page_url)
    metadata.landing_page_url = work.primary_location.landing_page_url;

  return {
    title,
    authors,
    year: work.publication_year ?? null,
    abstract: reconstructAbstract(work.abstract_inverted_index),
    journal: work.primary_location?.source?.display_name ?? null,
    publisher: work.primary_location?.source?.host_organization_name ?? null,
    volume: biblio.volume ?? null,
    issue: biblio.issue ?? null,
    pages,
    doi,
    isbn: null,
    url: doi
      ? `https://doi.org/${doi}`
      : (oaUrl ?? work.primary_location?.landing_page_url ?? null),
    type: mapType(work.type),
    citationCount: typeof work.cited_by_count === "number" ? work.cited_by_count : null,
    keywords: keywords.slice(0, 10),
    language: work.language ?? null,
    openAccess: Boolean(work.open_access?.is_oa),
    providers: [{ provider: "openalex" as ProviderId, externalId }],
    metadata,
  };
}

function typeFilter(types: SourceType[]): string {
  const map: Record<string, string> = {
    article: "article",
    book: "book|book-chapter",
    thesis: "dissertation",
    dissertation: "dissertation",
    report: "report",
    conference: "proceedings-article",
    working_paper: "preprint",
  };
  return types.map((t) => map[t]).filter(Boolean).join("|");
}

export class OpenAlexProvider implements AcademicSearchProvider {
  readonly id = "openalex" as const;
  readonly label = "OpenAlex";

  private politeParams(): string {
    const params: string[] = [];
    if (env.OPENALEX_MAILTO) params.push(`mailto=${encodeURIComponent(env.OPENALEX_MAILTO)}`);
    if (env.OPENALEX_API_KEY) params.push(`api_key=${encodeURIComponent(env.OPENALEX_API_KEY)}`);
    return params.length ? `&${params.join("&")}` : "";
  }

  async search(input: ProviderSearchInput): Promise<ProviderSearchResult[]> {
    const params = new URLSearchParams();
    params.set("search", input.query);
    params.set("per-page", String(Math.min(Math.max(input.maxResults, 1), 200)));

    const filters: string[] = [];
    if (input.yearFrom) filters.push(`from_publication_date:${input.yearFrom}-01-01`);
    if (input.yearTo) filters.push(`to_publication_date:${input.yearTo}-12-31`);
    const tf = typeFilter(input.sourceTypes ?? []);
    if (tf) filters.push(`type:${tf}`);
    if (filters.length) params.set("filter", filters.join(","));

    const url = `${API_BASE}/works?${params.toString()}${this.politeParams()}`;
    const data = await fetchJson<{ results?: OpenAlexWork[] }>(url, { label: "openalex" });
    return (data.results ?? []).map(mapOpenAlexWork).filter((w): w is ProviderSearchResult => w !== null);
  }

  async getById(externalId: string): Promise<ProviderSearchResult | null> {
    const cleanId = externalId.replace(/^https?:\/\/openalex\.org\//, "");
    try {
      const data = await fetchJson<OpenAlexWork>(
        `${API_BASE}/works/${encodeURIComponent(cleanId)}${this.politeParams()}`,
        { label: "openalex" },
      );
      return mapOpenAlexWork(data);
    } catch {
      return null;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      await fetchJson<unknown>(`${API_BASE}/works?per-page=1${this.politeParams()}`, {
        timeoutMs: 8000,
        retries: 0,
        label: "openalex",
      });
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

export const openalexProvider = new OpenAlexProvider();

