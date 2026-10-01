import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Plus, Sparkles, Table2, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Button, Skeleton } from "@/components/ui/primitives.js";
import { useLibrary, useMatrix, useMatrixMutations } from "@/hooks/dataQueries.js";
import { Dialog, DialogContent } from "@/components/ui/dialog.js";
import { ErrorState, EmptyState } from "@/components/common/states.js";
import { ExportCard } from "@/components/common/ExportCard.js";
import { useToast } from "@/hooks/useToast.js";
import { cellLabel, matrixRowFromEntry } from "./matrixUtils.js";


/**
 * Detalhe da matriz (§29): colunas da revisão da literatura, adição de
 * fontes da biblioteca, preenchimento com IA (grounded) e análise (§30).
 */
export default function MatrixDetailPage(): JSX.Element {
  const { id = "" } = useParams();
  const { data, isLoading, isError, error, refetch } = useMatrix(id);
  const mutations = useMatrixMutations(id);
  const library = useLibrary({});
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const addSource = async (sourceId: string): Promise<void> => {
    try {
      const response = await mutations.addEntry.mutateAsync({ sourceId, useAi: true });
      toast({ title: "Fonte adicionada", description: response.note, variant: "success" });
      setAddOpen(false);
    } catch (err) {
      toast({ title: "Erro ao adicionar", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  const analyze = async (): Promise<void> => {
    try {
      const response = await mutations.analyze.mutateAsync();
      setAnalysis(
        response.available && response.analysis
          ? `${response.analysis.summary}\n\nConvergências: ${response.analysis.convergences.join("; ") || "—"}. Divergências: ${response.analysis.divergences.join("; ") || "—"}. Lacunas: ${response.analysis.gaps.join("; ") || "—"}.\n\n${response.disclaimer ?? ""}`
          : response.message ?? "Análise não disponível.",
      );
    } catch (err) {
      toast({ title: "Erro na análise", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (isError || !data) {
    return <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  const columns = data.columns;
  const entries = data.entries;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.matrix.title}
        description={data.matrix.description ?? "Matriz de revisão da literatura"}
        actions={
          <>
            <Button variant="outline" onClick={() => void analyze()} disabled={mutations.analyze.isPending}>
              {mutations.analyze.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Analisar literatura selecionada
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Adicionar fonte
            </Button>
          </>
        }
      />

      <Button variant="ghost" size="sm" asChild className="-mt-4">
        <Link to="/matrix">
          <ArrowLeft className="size-4" />
          Todas as matrizes
        </Link>
      </Button>

      {entries.length === 0 ? (
        <EmptyState
          icon={Table2}
          title="Matriz sem fontes"
          description="Adicione fontes da sua biblioteca para preencher a tabela da revisão da literatura. Campos sem informação ficam como “Não identificado na fonte”."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Adicionar primeira fonte
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50">
                <tr className="border-b">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground"
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const row = matrixRowFromEntry(entry);
                  return (
                    <tr key={entry.id} className="border-b align-top last:border-0 hover:bg-secondary/30">
                      {columns.map((column) => (
                        <td key={column.key} className="max-w-52 px-3 py-3">
                          <span className="line-clamp-4">{cellLabel(row[column.key])}</span>
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-3 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void mutations.removeEntry.mutateAsync(entry.id)}
                          aria-label={`Remover ${entry.title ?? "entrada"}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            {entries.filter((entry) => entry.ai_filled).length} entrada(s) preenchida(s) com IA a partir do conteúdo da
            fonte. Campos sem informação explícita permanecem como “Não identificado na fonte”.
          </p>
        </>
      )}

      <ExportCard kind="matrix" title={data.matrix.title} matrixId={data.matrix.id} />


      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent
          title="Adicionar fonte da biblioteca"
          description="Escolha uma fonte guardada. Os campos são preenchidos com base no conteúdo da fonte — sem inventar dados."
        >
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {(library.data?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                A sua biblioteca está vazia.{" "}
                <Link to="/research/new" className="text-primary hover:underline">
                  Faça uma pesquisa
                </Link>{" "}
                e guarde fontes primeiro.
              </p>
            ) : (
              library.data?.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.source.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.source.authors[0]?.name ?? "Autor não informado"} · {item.source.year ?? "s.d."}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => void addSource(item.source.id ?? item.id)}
                    disabled={mutations.addEntry.isPending}
                  >
                    {mutations.addEntry.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    Adicionar
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={analysis !== null} onOpenChange={(open) => (!open ? setAnalysis(null) : undefined)}>
        <DialogContent title="Análise da literatura selecionada" description="Gerada apenas a partir das fontes desta matriz.">
          <div className="space-y-3 text-sm">
            {analysis?.split("\n\n").map((paragraph) => (
              <p key={paragraph.slice(0, 40)} className="text-muted-foreground">
                {paragraph}
              </p>
            ))}
            <Button variant="outline" onClick={() => setAnalysis(null)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
