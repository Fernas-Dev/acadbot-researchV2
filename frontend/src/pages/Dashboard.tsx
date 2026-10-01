import { Link } from "react-router-dom";
import { ArrowRight, BookMarked, FileCheck2, Library, Plus, Search, Table2, Quote } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Card, CardContent, CardHeader, CardTitle, Button, Progress, Skeleton } from "@/components/ui/primitives.js";
import { EmptyState, ErrorState } from "@/components/common/states.js";
import { JobStatusBadge, ValidationStatusBadge } from "@/components/common/badges.js";
import { useDashboard } from "@/hooks/queries.js";
import { relativeTime, orNotInformed } from "@/lib/utils.js";

const STAT_TILES = [
  { key: "projects", label: "Projetos ativos", to: "/projects", icon: BookMarked },
  { key: "researches", label: "Pesquisas realizadas", to: "/research", icon: Search },
  { key: "savedSources", label: "Fontes salvas", to: "/library", icon: Library },
  { key: "validations", label: "Referências validadas", to: "/validate", icon: FileCheck2 },
  { key: "matrices", label: "Matrizes de literatura", to: "/matrix", icon: Table2 },
  { key: "citations", label: "Citações guardadas", to: "/citations", icon: Quote },
] as const;

export default function DashboardPage(): JSX.Element {
  const { data, isLoading, isError, error, refetch } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
    );
  }

  if (!data) return <ErrorState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral dos teus projetos, pesquisas e fontes guardadas."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/validate">
                <FileCheck2 className="size-4" />
                Validar
              </Link>
            </Button>
            <Button asChild>
              <Link to="/research/new">
                <Plus className="size-4" />
                Nova pesquisa
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_TILES.map((tile) => (
          <Link key={tile.key} to={tile.to} className="group">
            <Card className="transition-colors group-hover:border-primary/50">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex size-10 items-center justify-center rounded-md bg-primary/10">
                  <tile.icon className="size-5 text-primary" aria-hidden />
                </span>
                <div>
                  <p className="text-2xl font-semibold">{orNotInformed(data.counts[tile.key])}</p>
                  <p className="text-xs text-muted-foreground">{tile.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uso e créditos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Pesquisas hoje</span>
              <span className="text-muted-foreground">
                {data.usage.researchToday} / {data.usage.researchLimit}
              </span>
            </div>
            <Progress value={(data.usage.researchToday / Math.max(data.usage.researchLimit, 1)) * 100} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Validações hoje</span>
              <span className="text-muted-foreground">
                {data.usage.validationsToday} / {data.usage.validationLimit}
              </span>
            </div>
            <Progress value={(data.usage.validationsToday / Math.max(data.usage.validationLimit, 1)) * 100} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pesquisas recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentResearch.length === 0 ? (
              <EmptyState
                icon={Search}
                title="Ainda não fizeste pesquisas"
                description="Faz a tua primeira pesquisa bibliográfica com fontes reais."
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
              <ul className="divide-y">
                {data.recentResearch.map((job) => (
                  <li key={job.id} className="py-3">
                    <Link to={`/research/${job.id}`} className="group block">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium group-hover:text-primary">{job.topic}</p>
                        <JobStatusBadge status={job.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {relativeTime(job.createdAt)} · {job.resultCount} resultado(s)
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projetos</CardTitle>
          </CardHeader>
          <CardContent>
            {data.projects.length === 0 ? (
              <EmptyState
                icon={BookMarked}
                title="Sem projetos ainda"
                description="Cria um projeto para organizar pesquisas, fontes e matriz."
                action={
                  <Button variant="outline" asChild>
                    <Link to="/projects">Criar projeto</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {data.projects.map((project) => (
                  <li key={project.id} className="py-3">
                    <Link to={`/projects/${project.id}`} className="group block">
                      <p className="truncate text-sm font-medium group-hover:text-primary">{project.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Atualizado {relativeTime(project.updated_at)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Validações recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentValidations.length === 0 ? (
            <EmptyState
              icon={FileCheck2}
              title="Sem validações"
              description="Cola uma referência para verificar se corresponde a uma obra real."
              action={
                <Button variant="outline" asChild>
                  <Link to="/validate">Validar referência</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {data.recentValidations.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <Link to={`/validate/${item.id}`} className="group min-w-0 flex-1">
                    <p className="truncate text-sm group-hover:text-primary">{item.reference}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{relativeTime(item.createdAt)}</p>
                  </Link>
                  <ValidationStatusBadge status={item.status} confidence={item.confidence} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fontes académicas disponíveis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {data.providers.map((provider) => (
            <span
              key={provider.id}
              title={provider.lastError ?? undefined}
              className={
                provider.enabled
                  ? "inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs"
                  : "inline-flex items-center gap-1.5 rounded-full border bg-secondary px-3 py-1 text-xs text-muted-foreground"
              }
            >
              <span
                className={
                  provider.enabled ? "size-1.5 rounded-full bg-success" : "size-1.5 rounded-full bg-muted-foreground"
                }
              />
              {provider.label} {provider.enabled ? "" : "(desativado)"}
            </span>
          ))}
        </CardContent>
      </Card>


    </div>
  );
}
