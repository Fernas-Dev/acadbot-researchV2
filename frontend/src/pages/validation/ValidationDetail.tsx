import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Badge, Button, Card, CardContent, Skeleton } from "@/components/ui/primitives.js";
import { ErrorState } from "@/components/common/states.js";
import { ValidationStatusBadge } from "@/components/common/badges.js";
import { useValidation } from "@/hooks/dataQueries.js";
import { formatDate, orNotInformed } from "@/lib/utils.js";
import type { FieldScores } from "@/types";

const FIELD_LABELS: Array<[string, keyof FieldScores]> = [
  ["Autor", "author"],
  ["Título", "title"],
  ["Ano", "year"],
  ["DOI", "doi"],
  ["ISBN", "isbn"],
  ["Revista", "journal"],
  ["Editora", "publisher"],
  ["Volume", "volume"],
  ["Páginas", "pages"],
];

/** Detalhe de uma validação: parsing, estado, confiança por campo e correspondências. */
export default function ValidationDetailPage(): JSX.Element {
  const { id = "" } = useParams();
  const { data, isLoading, isError, error, refetch } = useValidation(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  const record = data.validation;
  const Icon =
    record.status === "confirmed" ? ShieldCheck : record.status === "inconsistent" ? ShieldAlert : ShieldQuestion;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detalhe da validação"
        description={`Validada em ${formatDate(record.createdAt)}`}
        actions={
          <Button variant="ghost" asChild>
            <Link to="/validate">
              <ArrowLeft className="size-4" />
              Nova validação
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <p className="rounded-md bg-secondary/50 p-3 font-mono text-sm">{record.reference}</p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/10">
              <Icon className="size-4 text-primary" aria-hidden />
            </span>
            <ValidationStatusBadge status={record.status} confidence={record.confidence} />
          </div>

          <p className="text-sm">{record.outcome.message}</p>

          {record.outcome.problems.length > 0 ? (
            <ul className="space-y-1 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
              {record.outcome.problems.map((problem) => (
                <li key={problem}>• {problem}</li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            {FIELD_LABELS.map(([label, key]) => {
              const score = record.outcome.fieldScores[key];
              return (
                <div key={key} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{label}</span>
                  {score === null || score === undefined ? (
                    <span className="text-xs italic">não disponível</span>
                  ) : (
                    <Badge
                      variant={score >= 90 ? "success" : score >= 70 ? "default" : score >= 50 ? "warning" : "destructive"}
                    >
                      {score}%
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {record.doiVerification ? (
        <Card>
          <CardContent className="space-y-2 p-5">
            <h2 className="text-sm font-semibold">Verificação de DOI</h2>
            <p className="text-sm text-muted-foreground">{record.doiVerification.message}</p>
            {record.doiVerification.conflicts.length > 0 ? (
              <ul className="text-sm text-destructive">
                {record.doiVerification.conflicts.map((conflict) => (
                  <li key={conflict}>• {conflict}</li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold">Dados interpretados da referência</h2>
          <div className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Autores: </span>
              {record.parsed.authors.join("; ") || "Não informado"}
            </p>
            <p>
              <span className="text-muted-foreground">Título: </span>
              {orNotInformed(record.parsed.title)}
            </p>
            <p>
              <span className="text-muted-foreground">Ano: </span>
              {orNotInformed(record.parsed.year)}
            </p>
            <p>
              <span className="text-muted-foreground">DOI: </span>
              {orNotInformed(record.parsed.doi)}
            </p>
            <p>
              <span className="text-muted-foreground">Editora: </span>
              {orNotInformed(record.parsed.publisher)}
            </p>
            <p>
              <span className="text-muted-foreground">Revista: </span>
              {orNotInformed(record.parsed.journal)}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Providers consultados: {record.providersQueried.join(", ") || "nenhum"}
            {record.providersFailed.length > 0 ? ` · Falharam: ${record.providersFailed.join(", ")}` : ""}
          </p>
        </CardContent>
      </Card>

      {record.matches.length === 0 ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Não foi possível confirmar esta informação nas fontes consultadas. Isto{" "}
            <strong>não significa</strong> que a referência seja falsa — pode não estar indexada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Correspondências ({record.matches.length})</h2>
          {record.matches.map((match) => (
            <Card key={match.source.fingerprint}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{match.source.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {match.source.authors.map((a) => a.name).join("; ") || "Autores não informados"} ·{" "}
                    {match.source.year ?? "Ano não informado"} · {match.provider ?? "provider não informado"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{match.confidence}%</Badge>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/research/source/${match.source.id ?? ""}`}>Ver detalhes</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
