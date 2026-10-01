import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookMarked, Loader2, Search, Table2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Skeleton,
  Textarea,
} from "@/components/ui/primitives.js";
import { ConfirmDialog } from "@/components/ui/dialog.js";
import { EmptyState, ErrorState } from "@/components/common/states.js";
import { useProject, useProjectMutations, useResearchJobs } from "@/hooks/queries.js";
import { useLibrary } from "@/hooks/dataQueries.js";
import { useToast } from "@/hooks/useToast.js";
import { formatDate } from "@/lib/utils.js";

export default function ProjectDetailPage(): JSX.Element {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useProject(id);
  const mutations = useProjectMutations();
  const jobs = useResearchJobs();
  const library = useLibrary({ projectId: id });
  const { toast } = useToast();
  const [objective, setObjective] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  const project = data.project;
  const projectJobs = (jobs.data?.jobs ?? []).filter((job) => job.projectId === project.id);

  const saveObjective = async (): Promise<void> => {
    try {
      await mutations.update.mutateAsync({ id: project.id, input: { objective: objective ?? project.objective } });
      toast({ title: "Objetivo atualizado", variant: "success" });
    } catch (err) {
      toast({ title: "Erro ao guardar", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  const handleDelete = async (): Promise<void> => {
    try {
      await mutations.remove.mutateAsync(project.id);
      toast({ title: "Projeto removido", variant: "info" });
      navigate("/projects", { replace: true });
    } catch (err) {
      toast({ title: "Erro ao remover", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.title}
        description={project.description ?? "Projeto de investigação"}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/research/new">
                <Search className="size-4" />
                Nova pesquisa
              </Link>
            </Button>
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
              <Trash2 className="size-4" />
              Remover
            </Button>
          </>
        }
      />

      <Button variant="ghost" size="sm" asChild className="-mt-4">
        <Link to="/projects">
          <ArrowLeft className="size-4" />
          Voltar aos projetos
        </Link>
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Definições do projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Tema</dt>
                <dd className="mt-1">{project.theme ?? "Não informado"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Palavras-chave</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {project.keywords?.length ? (
                    project.keywords.map((keyword) => (
                      <Badge key={keyword} variant="secondary">
                        {keyword}
                      </Badge>
                    ))
                  ) : (
                    <span>Não informado</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Problema de pesquisa</dt>
                <dd className="mt-1">{project.research_problem ?? "Não informado"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Criado</dt>
                <dd className="mt-1">{formatDate(project.created_at)}</dd>
              </div>
            </dl>

            <div className="space-y-1.5">
              <Label htmlFor="objective">Objetivo geral</Label>
              <Textarea
                id="objective"
                value={objective ?? project.objective ?? ""}
                onChange={(event) => setObjective(event.target.value)}
                placeholder="Descreva o objetivo geral do trabalho…"
              />
              <Button size="sm" variant="outline" onClick={saveObjective} disabled={mutations.update.isPending}>
                {mutations.update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Guardar objetivo
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pesquisas do projeto</CardTitle>
            </CardHeader>
            <CardContent>
              {projectJobs.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="Sem pesquisas"
                  description="Inicie uma pesquisa associada a este projeto."
                />
              ) : (
                <ul className="divide-y text-sm">
                  {projectJobs.slice(0, 6).map((job) => (
                    <li key={job.id} className="py-2">
                      <Link to={`/research/${job.id}`} className="truncate hover:text-primary">
                        {job.params.topic}
                      </Link>
                      <p className="text-xs text-muted-foreground">{job.resultCount} resultado(s)</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fontes guardadas</CardTitle>
            </CardHeader>
            <CardContent>
              {(library.data?.items.length ?? 0) === 0 ? (
                <EmptyState
                  icon={BookMarked}
                  title="Biblioteca vazia"
                  description="Guarde fontes a partir dos resultados de pesquisa."
                />
              ) : (
                <ul className="space-y-2 text-sm">
                  {library.data?.items.slice(0, 6).map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      <span className="line-clamp-2">{item.source.title}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link to="/matrix">
                  <Table2 className="size-3.5" />
                  Ver matriz
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remover projeto?"
        description="As pesquisas, fontes e matrizes associadas deixam de estar disponíveis neste projeto. Esta ação não pode ser desfeita."
        confirmLabel="Remover projeto"
        loading={mutations.remove.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
