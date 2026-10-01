import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookMarked, FolderPlus } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Badge, Button, Card, CardContent, Skeleton } from "@/components/ui/primitives.js";
import { EmptyState, ErrorState } from "@/components/common/states.js";
import { ProjectDialog } from "@/components/projects/ProjectDialog.js";
import { useProjects } from "@/hooks/queries.js";
import { relativeTime } from "@/lib/utils.js";

export default function ProjectsPage(): JSX.Element {
  const { data, isLoading, isError, refetch, error } = useProjects();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meus Projetos"
        description="Organize pesquisas, fontes, matriz e citações por projeto de investigação."
        actions={
          <Button onClick={() => setOpen(true)}>
            <FolderPlus className="size-4" />
            Novo projeto
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      ) : (data?.projects.length ?? 0) === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Ainda não tens projetos"
          description="Crie um projeto para organizar pesquisas, fontes guardadas e matriz de literatura."
          action={
            <Button onClick={() => setOpen(true)}>
              <FolderPlus className="size-4" />
              Criar primeiro projeto
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold leading-snug group-hover:text-primary">{project.title}</h2>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </div>
                  {project.theme ? <p className="text-xs text-muted-foreground">{project.theme}</p> : null}
                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{project.researchCount ?? 0} pesquisa(s)</Badge>
                    <Badge variant="secondary">{project.savedCount ?? 0} fonte(s)</Badge>
                    <Badge variant="outline">{relativeTime(project.updated_at)}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ProjectDialog open={open} onOpenChange={setOpen} onCreated={() => void refetch()} />
    </div>
  );
}
