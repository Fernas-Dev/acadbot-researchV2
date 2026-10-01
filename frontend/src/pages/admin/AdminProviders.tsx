import { Activity, RefreshCw } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives.js";
import { Switch } from "@/components/ui/switch.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.js";
import { ErrorState, EmptyState } from "@/components/common/states.js";
import { useAdminMutations, useAdminProviders, useAdminUsage } from "@/hooks/adminQueries.js";
import { useToast } from "@/hooks/useToast.js";
import { formatDate } from "@/lib/utils.js";

/** Administração → Providers académicos (§43). Nunca expõe API keys. */
export function AdminProvidersPage(): JSX.Element {
  const { data, isLoading, isError, error, refetch } = useAdminProviders();
  const mutations = useAdminMutations();
  const { toast } = useToast();

  const toggle = async (id: string, enabled: boolean): Promise<void> => {
    try {
      await mutations.updateProvider.mutateAsync({ id, input: { enabled } });
      toast({ title: "Provider atualizado", variant: "success" });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  const check = async (): Promise<void> => {
    try {
      const { results } = await mutations.checkProviders.mutateAsync();
      const failed = results.filter((r) => !r.ok);
      toast({
        title: failed.length === 0 ? "Todos os providers responderam" : `${failed.length} provider(s) com falha`,
        description: results.map((r) => `${r.label}: ${r.ok ? `${r.latencyMs ?? "?"}ms` : "falhou"}`).join(" · "),
        variant: failed.length === 0 ? "success" : "warning",
      });
    } catch (err) {
      toast({ title: "Erro ao verificar", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError) return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => void check()} disabled={mutations.checkProviders.isPending}>
          <RefreshCw className={mutations.checkProviders.isPending ? "size-4 animate-spin" : "size-4"} />
          Verificar estado agora
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Providers académicos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Último erro</TableHead>
                <TableHead>Última verificação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell className="font-medium">{provider.label}</TableCell>
                  <TableCell>
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={(checked) => void toggle(provider.id, checked)}
                      aria-label={`Ativar ${provider.label}`}
                    />
                  </TableCell>
                  <TableCell>{provider.priority}</TableCell>
                  <TableCell className="max-w-xs">
                    <span className="line-clamp-2 text-xs text-destructive">{provider.lastError ?? "—"}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {provider.lastCheckedAt ? formatDate(provider.lastCheckedAt) : "Nunca"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            As API keys nunca são mostradas aqui — ficam apenas no servidor.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/** Administração → Uso de APIs/IA. */
export function AdminUsagePage(): JSX.Element {
  const { data, isLoading, isError, error, refetch } = useAdminUsage();

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError) return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;

  if (!data || data.total === 0) {
    return <EmptyState icon={Activity} title="Sem registos de uso" description="O uso será registado à medida que as funcionalidades são usadas." />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Por tipo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.byKind.map((entry) => (
            <div key={entry.kind} className="flex items-center justify-between">
              <span>{entry.kind}</span>
              <Badge variant="secondary">{entry.amount}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Por dia (últimos 30)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.byDay.map((entry) => (
            <div key={entry.day} className="flex items-center justify-between">
              <span>{entry.day}</span>
              <Badge variant="outline">{entry.amount}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
