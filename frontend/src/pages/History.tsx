import { useState } from "react";
import { Link } from "react-router-dom";
import { History as HistoryIcon, Search, ShieldCheck, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Badge, Button, Card, CardContent, Skeleton } from "@/components/ui/primitives.js";
import { EmptyState, ErrorState } from "@/components/common/states.js";
import { JobStatusBadge, ValidationStatusBadge } from "@/components/common/badges.js";
import { useHistory } from "@/hooks/queries.js";
import { relativeTime } from "@/lib/utils.js";

type Filter = "all" | "research" | "validation" | "export";

const FILTER_LABELS: Record<Filter, string> = {
  all: "Tudo",
  research: "Pesquisas",
  validation: "Validações",
  export: "Exportações",
};

/** Histórico (§31): pesquisas, validações e exportações com reabertura. */
export default function HistoryPage(): JSX.Element {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading, isError, error, refetch } = useHistory(filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico"
        description="Todas as pesquisas, validações e exportações realizadas."
        actions={
          <div className="flex flex-wrap gap-1">
            {(Object.keys(FILTER_LABELS) as Filter[]).map((key) => (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
              >
                {FILTER_LABELS[key]}
              </Button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      ) : (data?.entries.length ?? 0) === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Sem atividade registada"
          description="Assim que realizar pesquisas e validações, aparecerão aqui."
          action={
            <Button asChild>
              <Link to="/research/new">Fazer primeira pesquisa</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {data?.entries.map((entry) => {
            const Icon = entry.type === "research" ? Search : entry.type === "validation" ? ShieldCheck : FileText;
            const href =
              entry.type === "research"
                ? `/research/${entry.id}`
                : entry.type === "validation"
                  ? `/validate/${entry.id}`
                  : "/history";

            return (
              <Card key={`${entry.type}-${entry.id}`}>
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary">
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <Link to={href} className="group block">
                      <p className="truncate text-sm font-medium group-hover:text-primary">{entry.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {relativeTime(entry.createdAt)}
                        {entry.resultCount !== null ? ` · ${entry.resultCount} resultado(s)` : ""}
                      </p>
                    </Link>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{FILTER_LABELS[entry.type]}</Badge>
                    {entry.type === "research" ? (
                      <JobStatusBadge status={entry.status} />
                    ) : entry.type === "validation" ? (
                      <ValidationStatusBadge status={entry.status as never} confidence={entry.confidence ?? undefined} />
                    ) : (
                      <Badge variant="success">Concluída</Badge>
                    )}
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={href}>Reabrir</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
