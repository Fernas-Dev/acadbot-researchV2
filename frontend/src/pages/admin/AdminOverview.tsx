import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives.js";
import { Badge } from "@/components/ui/primitives.js";
import { ErrorState } from "@/components/common/states.js";
import { useAdminOverview } from "@/hooks/adminQueries.js";
import { useAuth } from "@/hooks/useAuth.js";
import { formatDateTime } from "@/lib/utils.js";

const TILES: Array<{ key: string; label: string }> = [
  { key: "users", label: "Utilizadores" },
  { key: "jobs", label: "Pesquisas" },
  { key: "validations", label: "Validações" },
  { key: "sources", label: "Fontes únicas" },
  { key: "savedSources", label: "Fontes guardadas" },
  { key: "matrices", label: "Matrizes" },
  { key: "exports", label: "Exportações" },
  { key: "errors", label: "Erros registados" },
];

/** Visão geral administrativa (§42). */
export function AdminOverviewPage(): JSX.Element {
  const { session } = useAuth();
  const { data, isLoading, isError, error, refetch } = useAdminOverview(Boolean(session));

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((tile) => (
          <Card key={tile.key}>
            <CardContent className="p-5">
              <p className="text-2xl font-semibold">{data.counts[tile.key as keyof typeof data.counts] ?? 0}</p>
              <p className="text-xs text-muted-foreground">{tile.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Integrações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {[
              ["Supabase", data.integrations.supabase],
              ["IA", data.integrations.ai],
              ["Crossref (polite pool)", data.integrations.crossrefPolite],
              ["Semantic Scholar (API key)", data.integrations.semanticScholarKeyed],
              ["OpenAlex (polite pool)", data.integrations.openalexPolite],
            ].map(([label, ok]) => (
              <div key={String(label)} className="flex items-center justify-between">
                <span>{label}</span>
                <Badge variant={ok ? "success" : "outline"}>{ok ? "Configurado" : "Não configurado"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limites do plano gratuito</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Pesquisas/dia: </span>
              {data.quotas.researchPerDay}
            </p>
            <p>
              <span className="text-muted-foreground">Validações/dia: </span>
              {data.quotas.validationPerDay}
            </p>
            <p>
              <span className="text-muted-foreground">Máx. por validação em massa: </span>
              {data.quotas.bulkMaxReferences}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividade recente (logs)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem registos recentes.</p>
          ) : (
            <ul className="divide-y text-sm">
              {data.recentLogs.map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate">{log.message}</p>
                    <p className="text-xs text-muted-foreground">{log.endpoint ?? log.provider ?? "—"}</p>
                  </div>
                  <Badge variant={log.level === "error" ? "destructive" : log.level === "warn" ? "warning" : "outline"}>
                    {log.level}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Última atualização: {formatDateTime(new Date().toISOString())}</p>
    </div>
  );
}
