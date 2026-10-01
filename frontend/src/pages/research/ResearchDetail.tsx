import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, History } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives.js";
import { ErrorState } from "@/components/common/states.js";
import { JobStatusBadge } from "@/components/common/badges.js";
import { ProgressTracker } from "@/components/research/ProgressTracker.js";
import { ResearchResults } from "@/components/research/ResearchResults.js";
import { TopicPreview } from "@/components/research/TopicPreview.js";
import { useCancelResearch, useResearchJob, useResearchResults } from "@/hooks/queries.js";
import { useToast } from "@/hooks/useToast.js";
import { relativeTime } from "@/lib/utils.js";

export default function ResearchDetailPage(): JSX.Element {
  const { id = "" } = useParams();
  const { data, isLoading, isError, error, refetch } = useResearchJob(id, { poll: true });
  const job = data?.job;
  const running = job?.status === "pending" || job?.status === "processing";
  const completed = job?.status === "completed";
  const results = useResearchResults(id, completed);
  const cancel = useCancelResearch();
  const { toast } = useToast();

  // Garante que a página abre sempre com o estado atualizado.
  useEffect(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError || !job) {
    return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  const handleCancel = async (): Promise<void> => {
    try {
      await cancel.mutateAsync(job.id);
      toast({ title: "Pesquisa cancelada", variant: "info" });
    } catch (err) {
      toast({ title: "Erro ao cancelar", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={job.params.topic}
        description={`Pesquisa iniciada ${relativeTime(job.createdAt)}${job.durationMs ? ` · ${(job.durationMs / 1000).toFixed(1)}s` : ""}`}
        actions={
          <>
            <JobStatusBadge status={job.status} />
            {running ? (
              <Button variant="outline" onClick={handleCancel} disabled={cancel.isPending}>
                <Ban className="size-4" />
                Cancelar
              </Button>
            ) : null}
            <Button variant="ghost" asChild>
              <Link to="/research">
                <History className="size-4" />
                Histórico
              </Link>
            </Button>
          </>
        }
      />

      <Button variant="ghost" size="sm" asChild className="-mt-4">
        <Link to="/research">
          <ArrowLeft className="size-4" />
          Todas as pesquisas
        </Link>
      </Button>

      {running ? (
        <Card>
          <CardContent className="p-5">
            <ProgressTracker steps={job.progress.steps} percent={job.progress.percent} warnings={job.warnings} />
          </CardContent>
        </Card>
      ) : null}

      {job.status === "failed" ? (
        <ErrorState
          title="A pesquisa falhou"
          description={job.error ?? "Não foi possível concluir a pesquisa. Tente novamente."}
          onRetry={() => void refetch()}
        />
      ) : null}

      {job.status === "cancelled" ? (
        <Card>
          <CardContent className="p-5 text-sm text-muted-foreground">
            Esta pesquisa foi cancelada.{" "}
            <Link to="/research/new" className="text-primary hover:underline">
              Iniciar nova pesquisa
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {job.warnings.length > 0 && completed ? (
        <Card className="border-warning/40">
          <CardContent className="space-y-1 p-5">
            {job.warnings.map((warning) => (
              <p key={warning} className="text-sm text-muted-foreground">
                {warning}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {completed ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Consultas executadas ({job.providerStats.length} provider(s))</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {job.providerStats.map((stat) => (
                <Badge key={stat.id} variant={stat.ok ? "success" : "destructive"}>
                  {stat.label}: {stat.ok ? `${stat.count} resultados` : "falhou"}
                </Badge>
              ))}
            </CardContent>
          </Card>

          {results.data?.analysis ? (
            <TopicPreview analysis={results.data.analysis} queries={results.data.queries} />
          ) : (
            <Skeleton className="h-40" />
          )}

          {results.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-56" />
              ))}
            </div>
          ) : results.isError ? (
            <ErrorState
              description={results.error instanceof Error ? results.error.message : undefined}
              onRetry={() => void results.refetch()}
            />
          ) : results.data ? (
            <ResearchResults jobId={job.id} topic={job.params.topic} results={results.data.results} />
          ) : null}
        </div>
      ) : null}

    </div>
  );
}
