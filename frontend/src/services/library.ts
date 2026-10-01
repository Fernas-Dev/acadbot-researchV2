import { api } from "@/lib/api.js";
import type {
  AcademicSource,
  CitationOutput,
  CitationStyle,
  LibraryItem,
  LiteratureEntry,
  LiteratureMatrix,
  MatrixColumn,
  ReadingStatus,
} from "@/types";

/* --------------------------------- Biblioteca (§26-27) --------------------------------- */

export interface LibraryQuery {
  search?: string;
  status?: ReadingStatus;
  projectId?: string;
  sort?: "recent" | "year_desc" | "year_asc" | "title";
}

export const libraryApi = {
  list: (params: LibraryQuery = {}) => {
    const search = new URLSearchParams();
    if (params.search) search.set("search", params.search);
    if (params.status) search.set("status", params.status);
    if (params.projectId) search.set("projectId", params.projectId);
    if (params.sort) search.set("sort", params.sort);
    const query = search.toString();
    return api.get<{ items: LibraryItem[] }>(`/api/library${query ? `?${query}` : ""}`);
  },

  save: (input: {
    source?: AcademicSource;
    sourceId?: string | null;
    projectId?: string | null;
    status?: ReadingStatus;
    notes?: string | null;
    tags?: string[];
  }) => api.post<{ item: LibraryItem }>("/api/library", input),

  update: (
    id: string,
    input: { status?: ReadingStatus; notes?: string | null; projectId?: string | null; tags?: string[] },
  ) => api.patch<{ item: LibraryItem }>(`/api/library/${id}`, input),

  remove: (id: string) => api.delete<void>(`/api/library/${id}`),

  tags: () => api.get<{ tags: Array<{ id: string; name: string; color: string | null; count: number }> }>("/api/library/tags"),
};

/* ---------------------------------- Citações (§28) ---------------------------------- */

export const citationsApi = {
  generate: (sourceId: string, styles: CitationStyle[] = ["apa7", "abnt"]) =>
    api.post<{ citations: CitationOutput[]; source: AcademicSource }>("/api/citations", { sourceId, styles }),

  bulk: (sourceIds: string[], style: CitationStyle) =>
    api.post<{ items: Array<{ sourceId: string; citation: CitationOutput; source: AcademicSource }>; style: CitationStyle }>(
      "/api/citations/bulk",
      { sourceIds, style },
    ),

  all: (sourceId: string) =>
    api.get<{ citations: CitationOutput[]; styles: CitationStyle[] }>(`/api/citations/${sourceId}/all`),

  saved: (style?: CitationStyle) =>
    api.get<{
      citations: Array<{
        id: string;
        style: CitationStyle;
        full: string;
        narrative: string | null;
        parenthetical: string | null;
        createdAt: string;
        sourceId: string;
        source: AcademicSource | null;
      }>;
      supportedStyles: CitationStyle[];
    }>(`/api/citations${style ? `?style=${style}` : ""}`),

  remove: (id: string) => api.delete<void>(`/api/citations/${id}`),
};

/* ------------------------------- Matriz (§29-30) ------------------------------- */

export const matrixApi = {
  list: () => api.get<{ matrices: LiteratureMatrix[]; columns: MatrixColumn[] }>("/api/matrix"),

  create: (input: { title: string; description?: string | null; projectId?: string | null }) =>
    api.post<{ matrix: LiteratureMatrix; columns: MatrixColumn[] }>("/api/matrix", input),

  get: (id: string) =>
    api.get<{ matrix: LiteratureMatrix; entries: LiteratureEntry[]; columns: MatrixColumn[] }>(`/api/matrix/${id}`),

  remove: (id: string) => api.delete<void>(`/api/matrix/${id}`),

  addEntry: (matrixId: string, input: { sourceId?: string; source?: AcademicSource; useAi?: boolean }) =>
    api.post<{ entry: LiteratureEntry; aiFilled: boolean; note: string }>(`/api/matrix/${matrixId}/entries`, input),

  updateEntry: (
    matrixId: string,
    entryId: string,
    input: Partial<Omit<LiteratureEntry, "id" | "matrix_id" | "source_id" | "ai_filled" | "confidence">>,
  ) => api.put<{ entry: LiteratureEntry }>(`/api/matrix/${matrixId}/entries/${entryId}`, input),

  removeEntry: (matrixId: string, entryId: string) =>
    api.delete<void>(`/api/matrix/${matrixId}/entries/${entryId}`),

  analyze: (matrixId: string) =>
    api.post<{
      available: boolean;
      message?: string;
      analysis: {
        approaches: string[];
        methodologies: string[];
        variables: string[];
        convergences: string[];
        divergences: string[];
        gaps: string[];
        summary: string;
        basedOnSources: number;
      } | null;
      sourcesUsed?: number;
      disclaimer?: string;
    }>(`/api/matrix/${matrixId}/analyze`),
};
