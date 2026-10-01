import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
} from "@/components/ui/primitives.js";
import { Switch } from "@/components/ui/switch.js";
import { ErrorState } from "@/components/common/states.js";
import { useAdminMutations, useAdminSettings } from "@/hooks/adminQueries.js";
import { useToast } from "@/hooks/useToast.js";

/** Administração → Configurações do sistema (§42). */
export function AdminSettingsPage(): JSX.Element {
  const { data, isLoading, isError, error, refetch } = useAdminSettings();
  const mutations = useAdminMutations();
  const { toast } = useToast();
  const [key, setKey] = useState("maintenance_mode");
  const [enabled, setEnabled] = useState(false);

  const save = async (): Promise<void> => {
    try {
      await mutations.updateSetting.mutateAsync({ key: key.trim(), value: { enabled } });
      toast({ title: "Configuração guardada", variant: "success" });
      void refetch();
    } catch (err) {
      toast({ title: "Erro ao guardar", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError) {
    return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Configuração do servidor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Ambiente: </span>
            {data?.serverConfig.env}
          </p>
          <p>
            <span className="text-muted-foreground">URL da app: </span>
            {data?.serverConfig.appUrl}
          </p>
          <p>
            <span className="text-muted-foreground">IA: </span>
            {data?.serverConfig.aiModel ?? "não configurada"}
          </p>
          <p>
            <span className="text-muted-foreground">Limites: </span>
            {data?.serverConfig.quotas.researchPerDay} pesquisas/dia · {data?.serverConfig.quotas.validationPerDay}{" "}
            validações/dia
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Definições guardadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(data?.settings.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Sem definições guardadas.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data?.settings.map((setting) => (
                <li key={setting.key} className="flex items-center justify-between gap-3">
                  <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{setting.key}</code>
                  <span className="truncate text-xs text-muted-foreground">
                    {JSON.stringify(setting.value)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 border-t pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="set-key">Chave</Label>
              <Input id="set-key" value={key} onChange={(event) => setKey(event.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="set-value">Valor booleano</Label>
              <Switch id="set-value" checked={enabled} onCheckedChange={setEnabled} />
            </div>
            <Button onClick={() => void save()} disabled={mutations.updateSetting.isPending}>
              Guardar definição
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
