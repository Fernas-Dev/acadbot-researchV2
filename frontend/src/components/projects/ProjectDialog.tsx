import { useState } from "react";
import { FolderPlus, Loader2 } from "lucide-react";
import { Button, Input, Label, Textarea } from "@/components/ui/primitives.js";
import { Dialog, DialogContent } from "@/components/ui/dialog.js";
import { useProjectMutations } from "@/hooks/queries.js";
import { useToast } from "@/hooks/useToast.js";

const EMPTY = { title: "", description: "", theme: "", researchProblem: "", objective: "", keywords: "" };

/** Diálogo de criação de projeto (§10). */
export function ProjectDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}): JSX.Element {
  const [form, setForm] = useState(EMPTY);
  const mutations = useProjectMutations();
  const { toast } = useToast();

  const update = (key: keyof typeof EMPTY) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleCreate = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    try {
      await mutations.create.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || null,
        theme: form.theme.trim() || null,
        researchProblem: form.researchProblem.trim() || null,
        objective: form.objective.trim() || null,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      });
      toast({ title: "Projeto criado", variant: "success" });
      setForm(EMPTY);
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast({
        title: "Não foi possível criar o projeto",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Novo projeto" description="Os campos podem ser completados depois.">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="p-title">Título *</Label>
            <Input
              id="p-title"
              required
              value={form.title}
              onChange={update("title")}
              placeholder="Monografia — Impacto da inflação no crescimento económico"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-theme">Tema</Label>
            <Input id="p-theme" value={form.theme} onChange={update("theme")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Descrição</Label>
            <Textarea id="p-desc" value={form.description} onChange={update("description")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-problem">Problema de pesquisa</Label>
              <Textarea id="p-problem" value={form.researchProblem} onChange={update("researchProblem")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-objective">Objetivo geral</Label>
              <Textarea id="p-objective" value={form.objective} onChange={update("objective")} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-keywords">Palavras-chave (separadas por vírgula)</Label>
            <Input id="p-keywords" value={form.keywords} onChange={update("keywords")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutations.create.isPending}>
              {mutations.create.isPending ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
              Criar projeto
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
