import { Badge } from "@/components/ui/primitives.js";
import type { ProviderId, ReadingStatus, RelevanceResult, SourceType, ValidationStatus } from "@/types";

/* ------------------------------ Relevância estimada (§18) ------------------------------ */

const RELEVANCE_VARIANT: Record<RelevanceResult["label"], "success" | "default" | "warning" | "outline"> = {
  alta: "success",
  relevante: "default",
  moderada: "warning",
  baixa: "outline",
};

export const RELEVANCE_LABEL: Record<RelevanceResult["label"], string> = {
  alta: "Alta relevância",
  relevante: "Relevante",
  moderada: "Relevância moderada",
  baixa: "Baixa relevância",
};

export function RelevanceBadge({ relevance }: { relevance: RelevanceResult }): JSX.Element {
  return (
    <Badge variant={RELEVANCE_VARIANT[relevance.label]} title="Relevância estimada — heurística, não é uma métrica científica">
      {relevance.score}% · {RELEVANCE_LABEL[relevance.label]}
    </Badge>
  );
}

/* -------------------------------- Estados de validação -------------------------------- */

const VALIDATION_LABELS: Record<ValidationStatus, string> = {
  confirmed: "Confirmada",
  partially_confirmed: "Parcialmente confirmada",
  unconfirmed: "Não confirmada",
  inconsistent: "Inconsistente",
};

const VALIDATION_VARIANTS: Record<ValidationStatus, "success" | "warning" | "outline" | "destructive"> = {
  confirmed: "success",
  partially_confirmed: "warning",
  unconfirmed: "outline",
  inconsistent: "destructive",
};

export function ValidationStatusBadge({
  status,
  confidence,
}: {
  status: ValidationStatus;
  confidence?: number;
}): JSX.Element {
  return (
    <Badge variant={VALIDATION_VARIANTS[status]}>
      {VALIDATION_LABELS[status]}
      {typeof confidence === "number" ? ` · ${confidence}%` : ""}
    </Badge>
  );
}

/* ------------------------------------ Providers ------------------------------------ */

const PROVIDER_LABELS: Record<ProviderId, string> = {
  crossref: "Crossref",
  openalex: "OpenAlex",
  semantic_scholar: "Semantic Scholar",
};

export function ProviderBadges({ providers }: { providers: Array<{ provider: ProviderId }> }): JSX.Element {
  const unique = [...new Set(providers.map((p) => p.provider))];
  if (unique.length === 0) return <Badge variant="outline">Origem não informada</Badge>;
  return (
    <span className="flex flex-wrap gap-1">
      {unique.map((provider) => (
        <Badge key={provider} variant="outline">
          {PROVIDER_LABELS[provider] ?? provider}
        </Badge>
      ))}
    </span>
  );
}

/* --------------------------------- Tipos de fonte --------------------------------- */

const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  article: "Artigo",
  book: "Livro",
  thesis: "Tese",
  dissertation: "Dissertação",
  report: "Relatório",
  conference: "Conferência",
  working_paper: "Working paper",
  other: "Outro",
};

export function SourceTypeBadge({ type }: { type: SourceType }): JSX.Element {
  return <Badge variant="secondary">{SOURCE_TYPE_LABELS[type] ?? type}</Badge>;
}

export const sourceTypeLabel = (type: SourceType): string => SOURCE_TYPE_LABELS[type] ?? type;

/* ------------------------------ Estado de leitura (§26) ------------------------------ */

export const READING_STATUS_LABELS: Record<ReadingStatus, string> = {
  unread: "Não lido",
  reading: "Em leitura",
  read: "Lido",
  important: "Importante",
};

export function ReadingStatusBadge({ status }: { status: ReadingStatus }): JSX.Element {
  const variant = status === "important" ? "destructive" : status === "read" ? "success" : status === "reading" ? "warning" : "outline";
  return <Badge variant={variant}>{READING_STATUS_LABELS[status]}</Badge>;
}

/* ---------------------------------- Estado do job ---------------------------------- */

const JOB_LABELS: Record<string, string> = {
  pending: "Em espera",
  processing: "Em curso",
  completed: "Concluída",
  failed: "Falhou",
  cancelled: "Cancelada",
};

export function JobStatusBadge({ status }: { status: string }): JSX.Element {
  const variant =
    status === "completed" ? "success" : status === "failed" ? "destructive" : status === "cancelled" ? "outline" : "warning";
  return <Badge variant={variant}>{JOB_LABELS[status] ?? status}</Badge>;
}
