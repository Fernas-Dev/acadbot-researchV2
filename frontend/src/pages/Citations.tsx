import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Quote, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Badge, Button, Card, CardContent, Skeleton } from "@/components/ui/primitives.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { EmptyState, ErrorState } from "@/components/common/states.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.js";
import { useSavedCitations } from "@/hooks/dataQueries.js";
import { useToast } from "@/hooks/useToast.js";
import { api } from "@/lib/api.js";
import type { CitationStyle } from "@/types";

/** Citações (§28): APA 7 e ABNT, com citação narrativa e parentética. */
export default function CitationsPage(): JSX.Element {
  const [style, setStyle] = useState<CitationStyle>("apa7");
  const { data, isLoading, isError, error, refetch } = useSavedCitations();
  const { toast } = useToast();

  const citations = (data?.citations ?? []).filter((item) => item.style === style);

  const copy = async (text: string): Promise<void> => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copiado para a área de transferência", variant: "success" });
  };

  const remove = async (id: string): Promise<void> => {
    try {
      await api.delete<void>(`/api/citations/${id}`);
      toast({ title: "Citação removida", variant: "info" });
      void refetch();
    } catch (err) {
      toast({ title: "Erro ao remover", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Citações"
        description="Referências completas e citações em APA 7 e ABNT, prontas para copiar."
        actions={
          <div className="w-44">
            <Select value={style} onValueChange={(value) => setStyle(value as CitationStyle)}>
              <SelectTrigger aria-label="Estilo de citação">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apa7">APA 7</SelectItem>
                <SelectItem value="abnt">ABNT</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {citations.length === 0 ? (
        <EmptyState
          icon={Quote}
          title="Sem citações guardadas"
          description="Abra uma fonte e clique em “Citar” para gerar referências em APA 7 ou ABNT."
          action={
            <Button asChild>
              <Link to="/research/new">Fazer pesquisa</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {citations.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{style === "apa7" ? "APA 7" : "ABNT"}</Badge>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => void copy(item.full)}>
                      <Copy className="size-3.5" />
                      Copiar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void remove(item.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue="full">
                  <TabsList>
                    <TabsTrigger value="full">Referência</TabsTrigger>
                    <TabsTrigger value="narrative">Narrativa</TabsTrigger>
                    <TabsTrigger value="parenthetical">Parentética</TabsTrigger>
                  </TabsList>
                  <TabsContent value="full" className="text-sm">
                    {item.full}
                  </TabsContent>
                  <TabsContent value="narrative" className="text-sm">
                    {item.narrative ?? "Não informado"}
                  </TabsContent>
                  <TabsContent value="parenthetical" className="text-sm">
                    {item.parenthetical ?? "Não informado"}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
