import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Badge, Button, Card, CardContent, Input } from "@/components/ui/primitives.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { Dialog, DialogContent } from "@/components/ui/dialog.js";
import { ExportCard } from "@/components/common/ExportCard.js";
import { useLibrary, useLibraryMutations } from "@/hooks/dataQueries.js";
import { useToast } from "@/hooks/useToast.js";
import type { LibraryItem, ReadingStatus } from "@/types";

const STATUS_LABELS: Record<ReadingStatus, string> = {
  unread: "Não lido",
  reading: "Em leitura",
  read: "Lido",
  important: "Importante",
};

/** Biblioteca pessoal (§26-27): pesquisa, filtros, tags, notas e exportação. */
export default function LibraryPage(): JSX.Element {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<string>("recent");
  const library = useLibrary({
    search: search || undefined,
    status: status === "all" ? undefined : (status as ReadingStatus),
    sort: sort as "recent" | "year_desc" | "year_asc" | "title",
  });
  const mutations = useLibraryMutations();
  const { toast } = useToast();
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [notes, setNotes] = useState("");
  const [deleting, setDeleting] = useState<LibraryItem | null>(null);

  const updateStatus = async (item: LibraryItem, next: ReadingStatus): Promise<void> => {
    try {
      await mutations.update.mutateAsync({ id: item.id, input: { status: next } });
      toast({ title: "Estado atualizado", variant: "success" });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  };

  const saveNotes = async (): Promise<void> => {
    if (!editing) return;
    try {
      await mutations.update.mutateAsync({ id: editing.id, input: { notes } });
      toast({ title: "Notas guardadas", variant: "success" });
      setEditing(null);
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : undefined, variant: "error" });
    }
  };

  const remove = async (): Promise<void> => {
    if (!deleting) return;
    try {
      await mutations.remove.mutateAsync(deleting.id);
      toast({ title: "Fonte removida", variant: "info" });
      setDeleting(null);
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : undefined, variant: "error" });
    }
  };

  const openNotes = (item: LibraryItem): void => {
    setNotes(item.notes ?? "");
    setEditing(item);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biblioteca"
        description="Fontes guardadas com tags, notas e estado de leitura."
        actions={
          <Button asChild>
            <Link to="/research/new">
              <Plus className="size-4" />
              Fazer pesquisa
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar por título, autor ou DOI…"
              className="pl-9"
              aria-label="Pesquisar na biblioteca"
            />
          </div>
          <div className="flex gap-2">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os estados</SelectItem>
                {(["unread", "reading", "read", "important"] as ReadingStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-40" aria-label="Ordenar">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="year_desc">Ano (desc.)</SelectItem>
                <SelectItem value="year_asc">Ano (asc.)</SelectItem>
                <SelectItem value="title">Título</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {library.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : library.isError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {library.error instanceof Error ? library.error.message : "Não foi possível carregar a biblioteca."}
        </p>
      ) : (library.data?.items.length ?? 0) === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-semibold">Ainda não guardaste nenhuma fonte.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Faça uma pesquisa bibliográfica e clique em “Guardar” para enriquecer a sua biblioteca.
          </p>
          <Button asChild className="mt-4">
            <Link to="/research/new">Fazer primeira pesquisa</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {library.data?.items.map((item) => (
            <Card key={item.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{item.source.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.source.authors.map((a) => a.name).join("; ") || "Autores não informados"} ·{" "}
                      {item.source.year ?? "Ano não informado"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Badge variant="secondary">
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Badge>
                    <Badge variant="outline">{item.source.type}</Badge>
                  </div>
                </div>

                {item.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {item.notes ? <p className="text-xs text-muted-foreground">“{item.notes}”</p> : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={item.status} onValueChange={(value) => void updateStatus(item, value as ReadingStatus)}>
                    <SelectTrigger className="h-8 w-36 text-xs" aria-label="Alterar estado">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["unread", "reading", "read", "important"] as ReadingStatus[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {STATUS_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => openNotes(item)}>
                    Notas
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/research/source/${item.source.id ?? ""}`}>Ver detalhes</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(item)}>
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => (!open ? setEditing(null) : undefined)}>
        <DialogContent title="Notas e tags" description="Anotações privadas sobre esta fonte.">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{editing?.source.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {editing?.tags.length ? (
                  editing.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      #{tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs italic text-muted-foreground">Sem tags</span>
                )}
              </div>
            </div>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              className="w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              placeholder="Notas sobre esta fonte…"
              aria-label="Notas"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button onClick={() => void saveNotes()} disabled={mutations.update.isPending}>
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => (!open ? setDeleting(null) : undefined)}>
        <DialogContent title="Remover da biblioteca?" description="Pode voltar a ser guardada mais tarde.">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void remove()} disabled={mutations.remove.isPending}>
              Remover
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ExportCard kind="library" title="Biblioteca AcadBot" />

    </div>
  );
}
