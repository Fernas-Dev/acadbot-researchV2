import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives.js";
import type { GeneratedQuery, TopicAnalysis } from "@/types";

/** Pré-visualização do Topic Analyzer e das queries geradas (§12-13). */
export function TopicPreview({
  analysis,
  queries,
}: {
  analysis: TopicAnalysis;
  queries: GeneratedQuery[];
}): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise do tema</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Palavras-chave (PT)</p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.keywords.pt.length === 0 ? (
                <span className="text-sm text-muted-foreground">Não identificado</span>
              ) : (
                analysis.keywords.pt.map((keyword) => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                  </Badge>
                ))
              )}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Palavras-chave (EN)</p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.keywords.en.length === 0 ? (
                <span className="text-sm text-muted-foreground">Não identificado</span>
              ) : (
                analysis.keywords.en.map((keyword) => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <p>
            <span className="text-muted-foreground">Área: </span>
            {analysis.area ?? "Não identificada"}
          </p>
          <p>
            <span className="text-muted-foreground">Contexto geográfico: </span>
            {analysis.geoContext?.pt ?? "Não identificado"}
          </p>
          <p>
            <span className="text-muted-foreground">Período: </span>
            {analysis.period ? `${analysis.period.from ?? "—"} a ${analysis.period.to ?? "—"}` : "Não identificado"}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Queries que serão executadas ({queries.length})
          </p>
          <ul className="space-y-1.5">
            {queries.map((query) => (
              <li key={query.query} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{query.language.toUpperCase()}</Badge>
                <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{query.query}</code>
                <span className="text-xs text-muted-foreground">{query.purpose}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
