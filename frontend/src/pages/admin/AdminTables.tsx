import { useState } from "react";
import { Search } from "lucide-react";
import { Badge, Input, Skeleton } from "@/components/ui/primitives.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.js";
import { ErrorState, EmptyState } from "@/components/common/states.js";
import { ValidationStatusBadge } from "@/components/common/badges.js";
import { useAdminResearch, useAdminUsers, useAdminValidation } from "@/hooks/adminQueries.js";
import { formatDate, relativeTime } from "@/lib/utils.js";

/** Administração → Utilizadores (§42). */
export function AdminUsersPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, error, refetch } = useAdminUsers(search || undefined);

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError) return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar por email…"
          className="pl-9"
          aria-label="Pesquisar utilizadores"
        />
      </div>

      {(data?.users.length ?? 0) === 0 ? (
        <EmptyState title="Sem utilizadores" description="Nenhum utilizador corresponde à pesquisa." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Instituição</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Registo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{user.name ?? "—"}</TableCell>
                <TableCell>{user.institution ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "outline"}>{user.role}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(user.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/** Administração → Pesquisas. */
export function AdminResearchPage(): JSX.Element {
  const { data, isLoading, isError, error, refetch } = useAdminResearch();

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError) return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tema</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Resultados</TableHead>
          <TableHead>Duração</TableHead>
          <TableHead>Quando</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="max-w-md">
              <span className="line-clamp-2">{job.topic}</span>
            </TableCell>
            <TableCell>
              <Badge variant={job.status === "completed" ? "success" : job.status === "failed" ? "destructive" : "warning"}>
                {job.status}
              </Badge>
            </TableCell>
            <TableCell>{job.results_count}</TableCell>
            <TableCell>{job.duration_ms ? `${(job.duration_ms / 1000).toFixed(1)}s` : "—"}</TableCell>
            <TableCell className="text-muted-foreground">{relativeTime(job.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Administração → Validações. */
export function AdminValidationPage(): JSX.Element {
  const { data, isLoading, isError, error, refetch } = useAdminValidation();

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError) return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;

  if ((data?.validations.length ?? 0) === 0) {
    return <EmptyState title="Sem validações" description="Ainda não foram realizadas validações." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Referência</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Confiança</TableHead>
          <TableHead>Quando</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.validations.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="max-w-lg">
              <span className="line-clamp-2">{item.raw_reference}</span>
            </TableCell>
            <TableCell>
              <ValidationStatusBadge status={item.status as never} />
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{item.confidence}%</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{relativeTime(item.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
