import { Link } from "react-router-dom";
import { ArrowRight, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Button, Card, CardContent, Skeleton } from "@/components/ui/primitives.js";
import { EmptyState, ErrorState } from "@/components/common/states.js";
import { JobStatusBadge } from "@/components/common/badges.js";
import { useResearchJobs } from "@/hooks/queries.js";
import { relativeTime } from "@/lib/utils.js";

export default function ResearchListPage(): JSX.Element {
  const { data, isLoading, isError, error, refetch } = useResearchJobs();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pesquisas"
        description="Histórico de pesquisas bibliográficas realizadas."
        actions={
          <Button asChild>
            <Link to="/research/new">
              <Plus className="size-4" />
              Nova pesquisa
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      ) : (data?.jobs.length ?? 0) === 0 ? (
        <EmptyState
          icon={Search}
          title="Ainda não existem pesquisas"
          description="Faça a sua primeira pesquisa bibliográfica com fontes académicas reais."
          action={
            <Button asChild>
              <Link to="/research/new">
                Fazer primeira pesquisa
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {data?.jobs.map((job) => (
            <Link key={job.id} to={`/research/${job.id}`}>
              <Card className="mb-3 transition-colors hover:border-primary/50">
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{job.params.topic}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {relativeTime(job.createdAt)} · {job.resultCount} resultado(s)
                      {job.durationMs ? ` · ${(job.durationMs / 1000).toFixed(1)}s` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <JobStatusBadge status={job.status} />
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
