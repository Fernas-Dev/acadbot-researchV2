import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Quote, Save } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { SourceCard } from "./SourceCard.js";
import { EmptyState } from "@/components/common/states.js";
import { ExportCard } from "@/components/common/ExportCard.js";
import { useLibraryMutations, useGenerateCitations } from "@/hooks/dataQueries.js";
import { useToast } from "@/hooks/useToast.js";
import type { AcademicSource, RankedSource } from "@/types";

type SortKey = "relevance" | "year_desc" | "citations";

/** Lista de resultados com guardar (§19) e citar (§28). */
export function ResearchResults({
  jobId,
  topic,
  results,
}: {
  jobId: string;
  topic: string;
  results: RankedSource[];
}): JSX.Element {
  const [sort, setSort] = useState<SortKey>("relevance");
  const save = useLibraryMutations();
  const cite = useGenerateCitations();
  const { toast } = useToast();
  const savedTitles = useMemo(() => new Set<string>(), []);

  const ordered = useMemo(() => {
    const copy = [...results];
    if (sort === "year_desc") copy.sort((a, b) => (b.source.year ?? 0) - (a.source.year ?? 0));
    else if (sort === "citations") copy.sort((a, b) => (b.source.citationCount ?? 0) - (a.source.citationCount ?? 0));
    else copy.sort((a, b) => b.relevance.score - a.relevance.score);
    return copy;
  }, [results, sort]);

  const handleSave = async (source: AcademicSource): Promise<void> => {
    try {
      await save.save.mutateAsync({ source });
      savedTitles.add(source.title);
      toast({ title: "Fonte guardada na biblioteca", variant: "success" });
    } catch (error) {
      toast({
        title: "Não foi possível guardar a fonte",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  };

  const handleCite = async (source: AcademicSource): Promise<void> => {
    try {
      const response = await cite.mutateAsync({
        sourceId: source.id ?? "",
        styles: ["apa7", "abnt"],
      });
      const apa = response.citations.find((item) => item.style === "apa7");
      if (apa) await navigator.clipboard.writeText(apa.full);
      toast({
        title: "Referência APA 7 copiada",
        description: response.citations.length > 1 ? "Também podes gerar ABNT na página de Citações." : undefined,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Não foi possível gerar a citação",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  };

  if (results.length === 0) {
    return (
      <EmptyState
        title="Nenhum resultado encontrado"
        description="Não foram encontradas fontes para estas condições. Experimente alargar os anos, mudar idioma ou simplificar o tema."
        action={
          <Button variant="outline" asChild>
            <Link to="/research/new">Nova pesquisa</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Resultados ({results.length})</CardTitle>
          <div className="w-48">
            <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
              <SelectTrigger aria-label="Ordenar resultados">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevância estimada</SelectItem>
                <SelectItem value="year_desc">Mais recentes</SelectItem>
                <SelectItem value="citations">Mais citados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/library">
                <Save className="size-3.5" />
                Ver biblioteca
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/citations">
                <Quote className="size-3.5" />
                Ver citações
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {ordered.map((item) => (
          <SourceCard
            key={item.source.fingerprint}
            source={item.source}
            relevance={item.relevance}
            saved={savedTitles.has(item.source.title)}
            detailHref={item.source.id ? `/research/source/${item.source.id}` : undefined}
            actions={{
              onSave: (source) => void handleSave(source),
              onCite: (source) => void handleCite(source),
              saving: save.save.isPending,
            }}
          />
        ))}
      </div>

      <ExportCard kind="research" title={topic} jobId={jobId} />
    </div>
  );
}
