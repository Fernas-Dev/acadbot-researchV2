/**
 * Tipos partilhados do domínio AcadBot Research (§55).
 * TypeScript rigoroso — sem `any`.
 */

// ============================================================
// Fontes académicas
// ============================================================

export type ProviderId = "crossref" | "semantic_scholar" | "openalex";

export type SourceType =
  | "article"
  | "book"
  | "thesis"
  | "dissertation"
  | "report"
  | "conference"
  | "working_paper"
  | "other";

export interface Author {
  name: string;
  family?: string | null;
  given?: string | null;
}

export interface ProviderRef {
  provider: ProviderId;
  externalId: string;
}

/** Formato interno normalizado (§16). */
export interface AcademicSource {
  fingerprint: string;
  title: string;
  authors: Author[];
  year?: number | null;
  abstract?: string | null;
  journal?: string | null;
  publisher?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
  isbn?: string | null;
  url?: string | null;
  type: SourceType;
  citationCount?: number | null;
  keywords: string[];
  language?: string | null;
  openAccess: boolean;
  providers: ProviderRef[];
  metadata: Record<string, unknown>;
}

/** Resultado de provider antes da normalização final (sem fingerprint). */
export type ProviderSearchResult = Omit<AcademicSource, "fingerprint">;

// ============================================================
// Providers
// ============================================================

export interface ProviderSearchInput {
  query: string;
  maxResults: number;
  yearFrom?: number | null;
  yearTo?: number | null;
  sourceTypes?: SourceType[];
  languages?: string[];
}

export interface ProviderHealth {
  ok: boolean;
  latencyMs?: number;
  error?: string;
}

/** Interface de provider académico (§15). */
export interface AcademicSearchProvider {
  readonly id: ProviderId;
  readonly label: string;
  search(input: ProviderSearchInput): Promise<ProviderSearchResult[]>;
  getById(externalId: string): Promise<ProviderSearchResult | null>;
  healthCheck(): Promise<ProviderHealth>;
}

// ============================================================
// Pesquisa
// ============================================================

export type WorkType =
  | "monografia"
  | "projeto"
  | "artigo"
  | "dissertacao"
  | "tese"
  | "trabalho_academico"
  | "pesquisa_geral";

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface ProgressStep {
  key: string;
  label: string;
  state: "pending" | "active" | "done" | "failed";
  detail?: string;
}

export interface ResearchProgress {
  steps: ProgressStep[];
  percent: number;
}

export interface TopicAnalysis {
  area?: string | null;
  subarea?: string | null;
  mainConcepts: string[];
  variables: string[];
  geoContext?: { pt: string; en: string } | null;
  period?: { from?: number; to?: number } | null;
  keywords: { pt: string[]; en: string[] };
  synonyms: string[];
  aiEnhanced?: boolean;
}

export interface GeneratedQuery {
  query: string;
  language: "pt" | "en" | "es" | "fr";
  purpose: string;
}

export interface RelevanceResult {
  score: number; // 0..100
  label: "alta" | "relevante" | "moderada" | "baixa";
  reasons: string[];
  matchedKeywords: string[];
}

export type ResearchLanguageOption = "pt" | "en" | "es" | "fr" | "all";

export type SourceTypeFilterOption =
  | "article"
  | "book"
  | "thesis"
  | "dissertation"
  | "report"
  | "conference"
  | "working_paper"
  | "all";

export interface ResearchParams {
  topic: string;
  area?: string | null;
  workType: WorkType;
  countryRegion?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  languages: ResearchLanguageOption[];
  sourceTypes: SourceTypeFilterOption[];
  maxResults: 10 | 20 | 50 | 100;
}

// ============================================================
// Validação
// ============================================================

export type ValidationStatus =
  | "confirmed"
  | "partially_confirmed"
  | "unconfirmed"
  | "inconsistent";

export interface ParsedReference {
  raw: string;
  type?: SourceType | null;
  authors: string[];
  title?: string | null;
  year?: number | null;
  publisher?: string | null;
  place?: string | null;
  journal?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
  isbn?: string | null;
  url?: string | null;
  edition?: string | null;
}

export interface FieldScores {
  author?: number | null;
  title?: number | null;
  year?: number | null;
  doi?: number | null;
  isbn?: number | null;
  journal?: number | null;
  publisher?: number | null;
  volume?: number | null;
  pages?: number | null;
}

export interface ValidationOutcome {
  status: ValidationStatus;
  confidence: number; // 0..100 — confiança de correspondência
  fieldScores: FieldScores;
  problems: string[];
  message: string;
}

export interface ValidationMatch {
  source: AcademicSource;
  provider: ProviderId | null;
  confidence: number;
  fieldScores: FieldScores;
}

export interface DoiVerification {
  found: boolean;
  message: string;
  source?: AcademicSource | null;
  conflicts: string[];
}

// ============================================================
// Citações
// ============================================================

export type CitationStyle = "apa7" | "abnt";

export interface CitationOutput {
  style: CitationStyle;
  full: string;
  narrative: string;
  parenthetical: string;
}

// ============================================================
// Biblioteca / Matriz / Exportações
// ============================================================

export type ReadingStatus = "unread" | "reading" | "read" | "important";

export type ExportFormat = "docx" | "pdf" | "csv" | "bibtex" | "ris";

export type ExportKind = "research" | "library" | "matrix" | "citations";

export interface ExportedFile {
  fileName: string;
  mimeType: string;
  content: Buffer;
}

