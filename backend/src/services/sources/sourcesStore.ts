/**
 * Sources — tabela central de fontes académicas (§35).
 * As fontes são deduplicadas por fingerprint e reutilizadas entre
 * pesquisas, biblioteca e matriz via saved_sources.
 */
import type { AcademicSource, ProviderRef, SourceType } from "../../types/index.js";
import { requireDb } from "../../lib/supabase.js";

export type SourceRow = {
  id: string;
  fingerprint: string;
  title: string;
  authors: Array<{ name: string; family?: string | null; given?: string | null }>;
  year: number | null;
  abstract: string | null;
  journal: string | null;
  publisher: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  isbn: string | null;
  url: string | null;
  type: SourceType;
  citation_count: number | null;
  keywords: string[];
  language: string | null;
  open_access: boolean;
  providers: ProviderRef[];
  metadata: Record<string, unknown>;
  created_at: string;
};

export function toRow(source: AcademicSource): Omit<SourceRow, "id" | "created_at"> {
  return {
    fingerprint: source.fingerprint,
    title: source.title.slice(0, 1000),
    authors: source.authors,
    year: source.year ?? null,
    abstract: source.abstract?.slice(0, 6000) ?? null,
    journal: source.journal ?? null,
    publisher: source.publisher ?? null,
    volume: source.volume ?? null,
    issue: source.issue ?? null,
    pages: source.pages ?? null,
    doi: source.doi ?? null,
    isbn: source.isbn ?? null,
    url: source.url ?? null,
    type: source.type,
    citation_count: source.citationCount ?? null,
    keywords: source.keywords.slice(0, 15),
    language: source.language ?? null,
    open_access: source.openAccess,
    providers: source.providers,
    metadata: source.metadata,
  };
}

export function fromRow(row: SourceRow): AcademicSource & { id: string } {
  return {
    id: row.id,
    fingerprint: row.fingerprint,
    title: row.title,
    authors: row.authors ?? [],
    year: row.year,
    abstract: row.abstract,
    journal: row.journal,
    publisher: row.publisher,
    volume: row.volume,
    issue: row.issue,
    pages: row.pages,
    doi: row.doi,
    isbn: row.isbn,
    url: row.url,
    type: row.type,
    citationCount: row.citation_count,
    keywords: row.keywords ?? [],
    language: row.language,
    openAccess: row.open_access,
    providers: row.providers ?? [],
    metadata: row.metadata ?? {},
  };
}

/**
 * Insere ou obtém fontes por fingerprint (idempotente).
 * Devolve o mapa fingerprint → id.
 */
export async function upsertSources(sources: AcademicSource[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (sources.length === 0) return map;
  const db = requireDb();

  const fingerprints = [...new Set(sources.map((s) => s.fingerprint))];

  // 1. Buscar as que já existem
  const existing = new Map<string, string>();
  for (let i = 0; i < fingerprints.length; i += 50) {
    const chunk = fingerprints.slice(i, i + 50);
    const { data, error } = await db
      .from("sources")
      .select("id,fingerprint")
      .in("fingerprint", chunk);
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id: string; fingerprint: string }>) {
      existing.set(row.fingerprint, row.id);
    }
  }

  // 2. Inserir as novas
  const missing = sources.filter((s) => !existing.has(s.fingerprint));
  const uniqueMissing = missing.filter(
    (s, idx) => missing.findIndex((o) => o.fingerprint === s.fingerprint) === idx,
  );
  for (let i = 0; i < uniqueMissing.length; i += 50) {
    const chunk = uniqueMissing.slice(i, i + 50).map(toRow);
    const { data, error } = await db.from("sources").insert(chunk).select("id,fingerprint");
    if (error) throw error;
    for (const row of (data ?? []) as Array<{ id: string; fingerprint: string }>) {
      existing.set(row.fingerprint, row.id);
    }
  }

  for (const source of sources) {
    const id = existing.get(source.fingerprint);
    if (id) map.set(source.fingerprint, id);
  }
  return map;
}

/** Obtém uma fonte por id. */
export async function getSourceById(id: string): Promise<(AcademicSource & { id: string }) | null> {
  const db = requireDb();
  const { data, error } = await db.from("sources").select("*").eq("id", id).single();
  if (error || !data) return null;
  return fromRow(data as SourceRow);
}
