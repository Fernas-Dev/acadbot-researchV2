import { useState } from "react";
import { Loader2, Search, Wand2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@/components/ui/primitives.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.js";
import { TopicPreview } from "./TopicPreview.js";
import { researchApi } from "@/services/research.js";
import { useToast } from "@/hooks/useToast.js";
import type { GeneratedQuery, ResearchParams, TopicAnalysis, WorkType } from "@/types";

const WORK_TYPES: Array<{ value: WorkType; label: string }> = [
  { value: "monografia", label: "Monografia" },
  { value: "projeto", label: "Projeto" },
  { value: "artigo", label: "Artigo" },
  { value: "dissertacao", label: "Dissertação" },
  { value: "tese", label: "Tese" },
  { value: "trabalho_academico", label: "Trabalho académico" },
  { value: "pesquisa_geral", label: "Pesquisa geral" },
];

const LANGUAGES = [
  { value: "all", label: "Todos" },
  { value: "pt", label: "Português" },
  { value: "en", label: "Inglês" },
  { value: "es", label: "Espanhol" },
  { value: "fr", label: "Francês" },
];

const SOURCE_TYPES = [
  { value: "all", label: "Todos" },
  { value: "article", label: "Artigo" },
  { value: "book", label: "Livro" },
  { value: "thesis", label: "Tese" },
  { value: "dissertation", label: "Dissertação" },
  { value: "report", label: "Relatório" },
  { value: "conference", label: "Conferência" },
  { value: "working_paper", label: "Working paper" },
];

const RESULT_COUNTS = ["10", "20", "50", "100"] as const;

export interface ResearchFormValue extends Omit<ResearchParams, "languages" | "sourceTypes"> {
  languages: string[];
  sourceTypes: string[];
  projectId?: string | null;
}

/** Formulário de pesquisa bibliográfica (§11) + pré-visualização do tema (§12-13). */
export function ResearchForm({
  onSubmit,
  submitting,
  projects,
  defaultProjectId,
}: {
  onSubmit: (value: ResearchFormValue) => void;
  submitting: boolean;
  projects?: Array<{ id: string; title: string }>;
  defaultProjectId?: string | null;
}): JSX.Element {
  const [topic, setTopic] = useState("");
  const [area, setArea] = useState("");
  const [workType, setWorkType] = useState<WorkType>("monografia");
  const [countryRegion, setCountryRegion] = useState("");
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [language, setLanguage] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [maxResults, setMaxResults] = useState<(typeof RESULT_COUNTS)[number]>("20");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "none");
  const [preview, setPreview] = useState<{ analysis: TopicAnalysis; queries: GeneratedQuery[] } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const { toast } = useToast();

  const handlePreview = async (): Promise<void> => {
    if (topic.trim().length < 5) {
      toast({ title: "Indica um tema com pelo menos 5 caracteres.", variant: "warning" });
      return;
    }
    setPreviewing(true);
    try {
      const data = await researchApi.previewTopic({
        topic: topic.trim(),
        area: area.trim() || null,
        countryRegion: countryRegion.trim() || null,
      });
      setPreview(data);
    } catch (error) {
      toast({
        title: "Não foi possível analisar o tema",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (topic.trim().length < 5) {
      toast({ title: "O tema é obrigatório (mínimo 5 caracteres).", variant: "warning" });
      return;
    }
    onSubmit({
      topic: topic.trim(),
      area: area.trim() || null,
      workType,
      countryRegion: countryRegion.trim() || null,
      yearFrom: yearFrom ? Number(yearFrom) : null,
      yearTo: yearTo ? Number(yearTo) : null,
      languages: [language],
      sourceTypes: [sourceType],
      maxResults: Number(maxResults) as ResearchParams["maxResults"],
      projectId: projectId === "none" ? null : projectId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Tema e contexto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="topic">Tema da pesquisa *</Label>
            <Textarea
              id="topic"
              required
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ex.: Impacto da inflação no crescimento económico de Moçambique"
            />
            <p className="text-xs text-muted-foreground">
              O sistema analisa o tema, gera várias queries e consulta Crossref, OpenAlex e Semantic Scholar.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="area">Área (opcional)</Label>
              <Input
                id="area"
                value={area}
                onChange={(event) => setArea(event.target.value)}
                placeholder="Ex.: Economia Monetária"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="country">País/região (opcional)</Label>
              <Input
                id="country"
                value={countryRegion}
                onChange={(event) => setCountryRegion(event.target.value)}
                placeholder="Ex.: Moçambique"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="work-type">Tipo de trabalho</Label>
              <Select value={workType} onValueChange={(value) => setWorkType(value as WorkType)}>
                <SelectTrigger id="work-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year-from">Ano inicial</Label>
              <Input
                id="year-from"
                type="number"
                min={1500}
                max={2100}
                value={yearFrom}
                onChange={(event) => setYearFrom(event.target.value)}
                placeholder="2015"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year-to">Ano final</Label>
              <Input
                id="year-to"
                type="number"
                min={1500}
                max={2100}
                value={yearTo}
                onChange={(event) => setYearTo(event.target.value)}
                placeholder="2025"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language">Idiomas</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="source-type">Tipos de fonte</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger id="source-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-results">Quantidade de resultados</Label>
              <Select value={maxResults} onValueChange={(value) => setMaxResults(value as typeof maxResults)}>
                <SelectTrigger id="max-results">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESULT_COUNTS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {projects && projects.length > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="project">Projeto (opcional)</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="project">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem projeto</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <div className="sr-only" aria-hidden>
            <Badge variant="outline">Formulário de pesquisa</Badge>
          </div>

        </CardContent>
      </Card>

      {preview ? <TopicPreview analysis={preview.analysis} queries={preview.queries} /> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={handlePreview} disabled={previewing}>
          {previewing ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
          Analisar tema e ver queries
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          Iniciar pesquisa
        </Button>
        <p className="text-xs text-muted-foreground">
          As fontes vêm de bases académicas reais. O sistema nunca inventa referências.
        </p>
      </div>
    </form>
  );
}
