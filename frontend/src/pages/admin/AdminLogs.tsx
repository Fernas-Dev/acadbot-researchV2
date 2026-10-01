import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { Badge, Card, CardContent, Skeleton } from "@/components/ui/primitives.js";
import { EmptyState, ErrorState } from "@/components/common/states.js";
import { useAdminLogs } from "@/hooks/adminQueries.js";
import { formatDateTime } from "@/lib/utils.js";

type Level = "all" | "error" | "warn" | "info";

/** Administração → Logs do sistema (§41). Os segredos nunca aparecem aqui. */
export function AdminLogsPage(): JSX.Element {
  const [level, setLevel] = useState<Level>("all");
  const { data, isLoading, isError, error, refetch } = useAdminLogs(level === "all" ? undefined : level);

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError) {
    return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="w-44">
        <Select value={level} onValueChange={(value) => setLevel(value as Level)}>
          <SelectTrigger aria-label="Filtrar por nível">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="error">Erros</SelectItem>
            <SelectItem value="warn">Avisos</SelectItem>
            <SelectItem value="info">Informação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(data?.logs.length ?? 0) === 0 ? (
        <EmptyState title="Sem logs" description="Nenhum registo para o filtro selecionado." />
      ) : (
        <div className="space-y-2">
          {data?.logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate text-sm">{log.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {log.endpoint ?? log.provider ?? "—"}
                    {log.duration_ms ? ` · ${log.duration_ms}ms` : ""} · {formatDateTime(log.created_at)}
                  </p>
                </div>
                <Badge variant={log.level === "error" ? "destructive" : log.level === "warn" ? "warning" : "outline"}>
                  {log.level}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
