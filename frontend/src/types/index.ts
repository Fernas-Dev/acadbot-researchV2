/** Tipos partilhados com o backend (§55) — sincronizados com backend/src/types. */

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

export interface AcademicSource {
  id?: string;
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

export interface RelevanceResult {
  score: number;
  label: "alta" | "relevante" | "moderada" | "baixa";
  reasons: string[];
  matchedKeywords: string[];
}

export interface RankedSource {
  source: AcademicSource;
  relevance: RelevanceResult;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface ProgressStep {
  key: string;
  label: string;
  state: "pending" | "active" | "done" | "failed";
  detail?: string;
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
}

export interface GeneratedQuery {
  query: string;
  language: "pt" | "en" | "es" | "fr";
  purpose: string;
}

export interface ProviderRunStat {
  id: string;
  label: string;
  ok: boolean;
  count: number;
  error?: string;
}

export type WorkType =
  | "monografia"
  | "projeto"
  | "artigo"
  | "dissertacao"
  | "tese"
  | "trabalho_academico"
  | "pesquisa_geral";

export interface ResearchParams {
  topic: string;
  area?: string | null;
  workType: WorkType;
  countryRegion?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  languages: string[];
  sourceTypes: string[];
  maxResults: 10 | 20 | 50 | 100;
}

export interface ResearchJob {
  id: string;
  projectId: string | null;
  status: JobStatus;
  params: ResearchParams;
  progress: { steps: ProgressStep[]; percent: number };
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  error: string | null;
  warnings: string[];
  providerStats: ProviderRunStat[];
  resultCount: number;
  durationMs: number | null;
}

// ============================================================
// Validação
// ============================================================

export type ValidationStatus = "confirmed" | "partially_confirmed" | "unconfirmed" | "inconsistent";

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

export interface ValidationMatch {
  source: AcademicSource;
  provider: ProviderId | null;
  confidence: number;
  fieldScores: FieldScores;
}

export interface ValidationRecord {
  id: string;
  reference: string;
  createdAt: string;
  status: ValidationStatus;
  confidence: number;
  outcome: {
    status: ValidationStatus;
    confidence: number;
    fieldScores: FieldScores;
    problems: string[];
    message: string;
  };
  parsed: ParsedReference;
  matches: ValidationMatch[];
  providersQueried: string[];
  providersFailed: string[];
  doiVerification: {
    found: boolean;
    message: string;
    conflicts: string[];
    source?: AcademicSource | null;
  } | null;
}

export interface BulkValidationItem {
  number: number;
  id: string | null;
  reference: string;
  status: ValidationStatus;
  confidence: number;
  problems: string[];
  message: string;
}

// ============================================================
// Citações, biblioteca, projetos, matriz, histórico
// ============================================================

export type CitationStyle = "apa7" | "abnt";

export interface CitationOutput {
  style: CitationStyle;
  full: string;
  narrative: string;
  parenthetical: string;
}

export type ReadingStatus = "unread" | "reading" | "read" | "important";

export interface LibraryItem {
  id: string;
  status: ReadingStatus;
  notes: string | null;
  projectId: string | null;
  savedAt: string;
  tags: string[];
  source: AcademicSource;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  theme: string | null;
  research_problem: string | null;
  objective: string | null;
  keywords: string[];
  created_at: string;
  updated_at: string;
  savedCount?: number;
  researchCount?: number;
}

export interface MatrixColumn {
  key: string;
  label: string;
}

export interface LiteratureEntry {
  id: string;
  matrix_id: string;
  source_id: string | null;
  author: string | null;
  year: number | null;
  title: string | null;
  theme: string | null;
  objective: string | null;
  methodology: string | null;
  sample: string | null;
  variables: string | null;
  results: string | null;
  limitations: string | null;
  ai_filled: boolean;
  confidence: number;
  source?: { id: string; title: string } | null;
}

export interface LiteratureMatrix {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
  entriesCount?: number;
}

export interface HistoryEntry {
  id: string;
  type: "research" | "validation" | "export";
  title: string;
  status: string;
  createdAt: string;
  projectId: string | null;
  resultCount: number | null;
  confidence: number | null;
  detail?: string | null;
}

export interface DashboardData {
  counts: {
    projects: number;
    researches: number;
    savedSources: number;
    validations: number;
    citations: number;
    matrices: number;
  };
  projects: Array<{ id: string; title: string; updated_at: string }>;
  recentResearch: Array<{
    id: string;
    topic: string;
    status: JobStatus;
    createdAt: string;
    resultCount: number;
    projectId: string | null;
  }>;
  recentValidations: Array<{
    id: string;
    reference: string;
    status: ValidationStatus;
    confidence: number;
    createdAt: string;
  }>;
  usage: {
    researchToday: number;
    researchLimit: number;
    validationsToday: number;
    validationLimit: number;
  };
  providers: Array<{ id: string; label: string; enabled: boolean; lastError: string | null }>;
}

export type ExportFormat = "docx" | "pdf" | "csv" | "bibtex" | "ris";
export type ExportKind = "research" | "library" | "matrix" | "citations";

export interface Profile {
  id: string;
  email: string;
  name: string | null;
  institution: string | null;
  study_area: string | null;
  role: "user" | "admin";
  created_at?: string;
}

