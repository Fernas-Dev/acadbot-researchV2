import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileCheck2, Loader2, ScanSearch } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Badge, Button, Card, CardContent, Label, Textarea } from "@/components/ui/primitives.js";
import { ValidationStatusBadge } from "@/components/common/badges.js";
import { useValidateReference } from "@/hooks/dataQueries.js";
import { useToast } from "@/hooks/useToast.js";
import { relativeTime } from "@/lib/utils.js";
import type { ValidationRecord } from "@/types";

const EXAMPLE = "MANKIW, N. Gregory. Introdução à Economia. São Paulo: Cengage Learning, 2014.";

/** Validação de uma referência (§21-23). */
export default function ValidatePage(): JSX.Element {
  const [reference, setReference] = useState("");
  const validate = useValidateReference();
  const { toast } = useToast();
  const [result, setResult] = useState<ValidationRecord | null>(null);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (reference.trim().length < 10) {
      toast({ title: "Cole uma referência completa (mínimo 10 caracteres).", variant: "warning" });
      return;
    }
    try {
      const data = await validate.mutateAsync({ reference: reference.trim() });
      setResult(data.validation);
    } catch (error) {
      toast({
        title: "Não foi possível validar",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validar Referência"
        description="Cole uma referência bibliográfica. O sistema procura correspondências nas bases académicas e compara campo a campo."
        actions={
          <Button variant="outline" asChild>
            <Link to="/validate/bulk">
              <FileCheck2 className="size-4" />
              Validação em massa
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Label htmlFor="reference">Referência bibliográfica *</Label>
            <Textarea
              id="reference"
              required
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              rows={4}
              placeholder={EXAMPLE}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={validate.isPending}>
                {validate.isPending ? <Loader2 className="size-4 animate-spin" /> : <ScanSearch className="size-4" />}
                Validar referência
              </Button>
              <Button type="button" variant="ghost" onClick={() => setReference(EXAMPLE)}>
                Usar exemplo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ValidationStatusBadge status={result.status} confidence={result.confidence} />
                <Badge variant="outline" title="Confiança de correspondência dos dados — não prova absoluta de autenticidade.">
                  Confiança de correspondência: {result.confidence}%
                </Badge>
              </div>

              <p className="text-sm">{result.outcome.message}</p>

              {result.outcome.problems.length > 0 ? (
                <ul className="space-y-1 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
                  {result.outcome.problems.map((problem) => (
                    <li key={problem}>• {problem}</li>
                  ))}
                </ul>
              ) : null}

              <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {(
                  [
                    ["Autor", result.outcome.fieldScores.author],
                    ["Título", result.outcome.fieldScores.title],
                    ["Ano", result.outcome.fieldScores.year],
                    ["DOI", result.outcome.fieldScores.doi],
                    ["ISBN", result.outcome.fieldScores.isbn],
                    ["Revista", result.outcome.fieldScores.journal],
                    ["Editora", result.outcome.fieldScores.publisher],
                    ["Volume", result.outcome.fieldScores.volume],
                    ["Páginas", result.outcome.fieldScores.pages],
                  ] as Array<[string, number | null | undefined]>
                ).map(([label, score]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>
                      {score === null || score === undefined ? (
                        <span className="text-xs italic">não disponível</span>
                      ) : (
                        <Badge variant={score >= 90 ? "success" : score >= 70 ? "default" : score >= 50 ? "warning" : "destructive"}>
                          {score}%
                        </Badge>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {result.matches.length > 0 ? (
            <Card>
              <CardContent className="space-y-3 p-5">
                <h2 className="text-sm font-semibold">Correspondências encontradas</h2>
                {result.matches.map((match) => (
                  <div key={match.source.fingerprint} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{match.source.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {match.source.authors.map((a) => a.name).join("; ") || "Autores não informados"} ·{" "}
                          {match.source.year ?? "Ano não informado"}
                        </p>
                      </div>
                      <Badge variant="secondary">{match.confidence}%</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Link to={`/research/source/${match.source.id ?? ""}`} className="text-xs text-primary hover:underline">
                        Ver detalhes
                      </Link>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {match.provider ?? "provider não informado"} · registada {relativeTime(result.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">
                Não foram encontradas correspondências nas fontes consultadas. Isto{" "}
                <strong>não significa</strong> que a referência seja falsa — pode simplesmente não estar indexada.
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to={`/validate/${result.id}`}>
                Ver detalhes completos
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="ghost" onClick={() => setResult(null)}>
              Validar outra referência
            </Button>
          </div>
        </div>
      ) : null}

    </div>
  );
}
