import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FolderPlus, Loader2, Table2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Badge, Button, Card, CardContent, Input, Label, Skeleton, Textarea } from "@/components/ui/primitives.js";
import { Dialog, DialogContent } from "@/components/ui/dialog.js";
import { EmptyState, ErrorState } from "@/components/common/states.js";
import { useMatrixMutations, useMatrices } from "@/hooks/dataQueries.js";
import { useToast } from "@/hooks/useToast.js";
import { relativeTime } from "@/lib/utils.js";

/** Lista de matrizes de revisão da literatura (§29). */
export default function MatrixPage(): JSX.Element {
  const { data, isLoading, isError, error, refetch } = useMatrices();
  const mutations = useMatrixMutations();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    try {
      const { matrix } = await mutations.create.mutateAsync({
        title: title.trim(),
        description: description.trim() || null,
      });
      toast({ title: "Matriz criada", variant: "success" });
      setOpen(false);
      setTitle("");
      setDescription("");
      window.location.assign(`/matrix/${matrix.id}`);
    } catch (err) {
      toast({ title: "Erro ao criar matriz", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Matriz de Literatura"
        description="Tabela com autor, ano, tema, objetivo, metodologia, amostra, variáveis, resultados e limitações."
        actions={
          <Button onClick={() => setOpen(true)}>
            <FolderPlus className="size-4" />
            Nova matriz
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : isError ? (
        <ErrorState description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />
      ) : (data?.matrices.length ?? 0) === 0 ? (
        <EmptyState
          icon={Table2}
          title="Ainda não tens matrizes"
          description="Crie uma matriz e adicione fontes da sua biblioteca para organizar a revisão da literatura."
          action={
            <Button onClick={() => setOpen(true)}>
              <FolderPlus className="size-4" />
              Criar primeira matriz
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data?.matrices.map((matrix) => (
            <Link key={matrix.id} to={`/matrix/${matrix.id}`} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50">
                <CardContent className="flex h-full flex-col gap-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold group-hover:text-primary">{matrix.title}</h2>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                  </div>
                  {matrix.description ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{matrix.description}</p>
                  ) : null}
                  <div className="mt-auto flex gap-1.5 pt-2">
                    <Badge variant="secondary">{matrix.entriesCount ?? 0} fonte(s)</Badge>
                    <Badge variant="outline">{relativeTime(matrix.updated_at)}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Nova matriz" description="Dê um nome ao trabalho de revisão da literatura.">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-title">Título *</Label>
              <Input
                id="m-title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Revisão da literatura — Inflação em Moçambique"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-desc">Descrição</Label>
              <Textarea id="m-desc" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutations.create.isPending}>
                {mutations.create.isPending ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
                Criar matriz
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
