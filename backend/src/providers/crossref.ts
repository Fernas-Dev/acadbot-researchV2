import { fetchJson } from "../lib/http.js";
import { env } from "../config/index.js";
import { stripHtml, normalizeDoi } from "../lib/text.js";
import type {
  AcademicSearchProvider,
  ProviderHealth,
  ProviderId,
  ProviderSearchInput,
  ProviderSearchResult,
  SourceType,
} from "../types/index.js";

const API_BASE = "https://api.crossref.org";

interface CrossrefWork {
  DOI?: string;
  title?: string[];
  subtitle?: string[];
  author?: Array<{ given?: string; family?: string; name?: string }>;
  issued?: { "date-parts"?: Array<Array<number | null>> };
  "published-online"?: { "date-parts"?: Array<Array<number | null>> };
  "published-print"?: { "date-parts"?: Array<Array<number | null>> };
  "container-title"?: string[];
  publisher?: string;
  abstract?: string;
  type?: string;
  URL?: string;
  ISSN?: string[];
  ISBN?: string[];
  "is-referenced-by-count"?: number;
  subject?: string[];
  license?: Array<{ URL?: string }>;
  volume?: string;
  issue?: string;
  page?: string;
  language?: string;
}

function mapType(crossrefType?: string): SourceType {
  const t = crossrefType ?? "";
  if (t === "journal-article" || t === "editorial" || t === "brief-report") return "article";
  if (t === "book" || t === "monograph" || t === "edited-volume" || t === "book-part") return "book";
  if (t === "proceedings-article" || t === "proceedings-series") return "conference";
  if (t === "report" || t === "report-component") return "report";
  if (t === "thesis") return "thesis";
  if (t === "dissertation") return "dissertation";
  if (t === "posted-content") return "working_paper";
  return "other";
}

function extractYear(work: CrossrefWork): number | null {
  const from = (parts?: Array<Array<number | null>>): number | null => {
    const first = parts?.[0]?.[0];
    return typeof first === "number" ? first : null;
  };
  return (
    from(work.issued?.["date-parts"]) ??
    from(work["published-online"]?.["date-parts"]) ??
    from(work["published-print"]?.["date-parts"])
  );
}

export function mapCrossrefWork(work: CrossrefWork): ProviderSearchResult | null {
  const title = work.title?.[0]?.trim();
  if (!title) return null; // sem título não é utilizável — nunca inventamos

  const authors = (work.author ?? [])
    .map((a) => {
      if (a.family || a.given) {
        return {
          name: [a.given, a.family].filter(Boolean).join(" ").trim(),
          family: a.family ?? null,
          given: a.given ?? null,
        };
      }
      return a.name ? { name: a.name, family: a.name, given: null } : null;
    })
    .filter((a): a is { name: string; family: string | null; given: string | null } =>
      Boolean(a?.name),
    );

  const year = extractYear(work);
  const doi = work.DOI ? normalizeDoi(work.DOI) : null;
  const openAccess = (work.license ?? []).some((l) => (l.URL ?? "").includes("creativecommons"));

  const metadata: Record<string, unknown> = {};
  if (work.ISSN?.length) metadata.issn = work.ISSN;
  if (work.subtitle?.length) metadata.subtitle = work.subtitle[0];
  if (work.language) metadata.language = work.language;
  if (work.subject?.length) metadata.subjects = work.subject.slice(0, 8);

  const externalId = doi ?? work.URL ?? title;

  return {
    title,
    authors,
    year,
    abstract: work.abstract ? stripHtml(work.abstract) : null,
    journal: work["container-title"]?.[0] ?? null,
    publisher: work.publisher ?? null,
    volume: work.volume ?? null,
    issue: work.issue ?? null,
    pages: work.page ?? null,
    doi,
    isbn: work.ISBN?.[0] ?? null,
    url: work.URL ?? (doi ? `https://doi.org/${doi}` : null),
    type: mapType(work.type),
    citationCount:
      typeof work["is-referenced-by-count"] === "number" ? work["is-referenced-by-count"] : null,
    keywords: (work.subject ?? []).slice(0, 8),
    language: work.language ?? null,
    openAccess,
    providers: [{ provider: "crossref" as ProviderId, externalId }],
    metadata,
  };
}

export class CrossrefProvider implements AcademicSearchProvider {
  readonly id = "crossref" as const;
  readonly label = "Crossref";

  private politeParams(): string {
    return env.CROSSREF_MAILTO ? `&mailto=${encodeURIComponent(env.CROSSREF_MAILTO)}` : "";
  }

  async search(input: ProviderSearchInput): Promise<ProviderSearchResult[]> {
    const params = new URLSearchParams();
    params.set("query.bibliographic", input.query);
    params.set("rows", String(Math.min(Math.max(input.maxResults, 1), 100)));
    params.set(
      "select",
      [
        // Nota: "language" não é aceite pelo parâmetro `select` da API do
        // Crossref (devolve HTTP 400) — é omitido e o campo fica por preencher,
        // sendo apresentado como "Não informado" (nunca inventamos dados).
        "DOI", "title", "subtitle", "author", "issued", "published-online", "published-print",
        "container-title", "publisher", "abstract", "type", "URL", "ISSN", "ISBN",
        "is-referenced-by-count", "subject", "license", "volume", "issue", "page",
      ].join(","),
    );

    const filters: string[] = [];
    if (input.yearFrom) filters.push(`from-pub-date:${input.yearFrom}-01-01`);
    if (input.yearTo) filters.push(`until-pub-date:${input.yearTo}-12-31`);
    for (const st of input.sourceTypes ?? []) {
      if (st === "article") filters.push("type:journal-article");
      if (st === "book") filters.push("type:book");
      if (st === "conference") filters.push("type:proceedings-article");
      if (st === "report") filters.push("type:report");
      if (st === "thesis" || st === "dissertation") filters.push("type:thesis");
    }
    if (filters.length) params.set("filter", filters.join(","));

    const url = `${API_BASE}/works?${params.toString()}${this.politeParams()}`;
    const data = await fetchJson<{ message?: { items?: CrossrefWork[] } }>(url, {
      label: "crossref",
    });
    const items = data.message?.items ?? [];
    return items.map(mapCrossrefWork).filter((w): w is ProviderSearchResult => w !== null);
  }

  async getById(externalId: string): Promise<ProviderSearchResult | null> {
    const query = this.politeParams().replace("&", "?");
    const url = `${API_BASE}/works/${encodeURIComponent(externalId)}${query}`;
    try {
      const data = await fetchJson<{ message?: CrossrefWork }>(url, { label: "crossref" });
      return data.message ? mapCrossrefWork(data.message) : null;
    } catch {
      return null;
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      await fetchJson<unknown>(`${API_BASE}/works?rows=1${this.politeParams()}`, {
        timeoutMs: 8000,
        retries: 0,
        label: "crossref",
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

export const crossrefProvider = new CrossrefProvider();

