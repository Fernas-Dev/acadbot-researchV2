import { useState } from "react";
import { Link } from "react-router-dom";
import { BookmarkPlus, ExternalLink, Info, Quote, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives.js";
import { ProviderBadges, RelevanceBadge, SourceTypeBadge } from "@/components/common/badges.js";
import { orNotInformed, cn } from "@/lib/utils.js";
import type { AcademicSource, RelevanceResult } from "@/types";

export function authorsLine(source: AcademicSource): string {
  if (source.authors.length === 0) return "Autores não informados";
  const names = source.authors.map((author) => author.name);
  if (names.length <= 3) return names.join("; ");
  return `${names.slice(0, 3).join("; ")} et al.`;
}

export interface SourceCardActions {
  onSave?: (source: AcademicSource) => void;
  onCite?: (source: AcademicSource) => void;
  onAddToProject?: (source: AcademicSource) => void;
  saving?: boolean;
}

/**
 * Cartão de resultado académico (§19). Todos os dados provêm das fontes
 * externas; campos ausentes aparecem como "Não informado".
 */
export function SourceCard({
  source,
  relevance,
  actions,
  detailHref,
  saved,
}: {
  source: AcademicSource;
  relevance?: RelevanceResult;
  actions?: SourceCardActions;
  detailHref?: string;
  saved?: boolean;
}): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const abstract = source.abstract?.trim();

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="max-w-3xl leading-snug">{source.title}</CardTitle>
          {relevance ? <RelevanceBadge relevance={relevance} /> : null}
        </div>
        <p className="text-sm text-muted-foreground">{authorsLine(source)}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{orNotInformed(source.year)}</span>
          <span aria-hidden>•</span>
          <span>{source.journal ?? source.publisher ?? "Veículo não informado"}</span>
          <SourceTypeBadge type={source.type} />
          {source.openAccess ? <Badge variant="success">Acesso aberto</Badge> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <dl className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="flex gap-1">
            <dt className="font-medium text-foreground/80">DOI:</dt>
            <dd className="truncate">{orNotInformed(source.doi)}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-medium text-foreground/80">Citações:</dt>
            <dd>{source.citationCount ?? "Não informado"}</dd>
          </div>
        </dl>

        {abstract ? (
          <div className="space-y-1">
            <p className={cn("text-sm text-muted-foreground", !expanded && "line-clamp-3")}>{abstract}</p>
            {abstract.length > 220 ? (
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setExpanded((v) => !v)}>
                {expanded ? "Mostrar menos" : "Ver resumo completo"}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            Resumo não disponível — não foi possível confirmar esta informação nas fontes consultadas.
          </p>
        )}

        {relevance ? (
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
            <span>{relevance.reasons.join(" · ") || "Correspondência geral limitada com o tema"}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <ProviderBadges providers={source.providers} />
          <div className="flex flex-wrap items-center gap-1.5">
            {source.url ? (
              <Button variant="ghost" size="sm" asChild>
                <a href={source.url} target="_blank" rel="noreferrer noopener">
                  <ExternalLink className="size-3.5" />
                  Abrir fonte
                </a>
              </Button>
            ) : null}
            {detailHref ? (
              <Button variant="ghost" size="sm" asChild>
                <Link to={detailHref}>
                  <Info className="size-3.5" />
                  Ver detalhes
                </Link>
              </Button>
            ) : null}
            {actions?.onCite ? (
              <Button variant="ghost" size="sm" onClick={() => actions.onCite?.(source)}>
                <Quote className="size-3.5" />
                Citar
              </Button>
            ) : null}
            {actions?.onSave ? (
              <Button
                variant={saved ? "secondary" : "default"}
                size="sm"
                onClick={() => actions.onSave?.(source)}
                disabled={actions.saving}
              >
                <BookmarkPlus className="size-3.5" />
                {saved ? "Guardada" : "Guardar"}
              </Button>
            ) : null}
          </div>
        </div>

        <p className="flex items-center gap-1.5 border-t pt-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3" aria-hidden />
          Dados obtidos de bases académicas externas. Relevância estimada por heurística — não é uma métrica científica
          universal.
        </p>
      </CardContent>
    </Card>
  );
}
