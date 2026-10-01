import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookmarkPlus, ExternalLink, Loader2, Quote } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { Badge, Button, Card, CardContent, Skeleton } from "@/components/ui/primitives.js";
import { Dialog, DialogContent } from "@/components/ui/dialog.js";
import { ErrorState } from "@/components/common/states.js";
import { ProviderBadges, SourceTypeBadge } from "@/components/common/badges.js";
import { useLibraryMutations, useGenerateCitations } from "@/hooks/dataQueries.js";
import { useToast } from "@/hooks/useToast.js";
import { orNotInformed } from "@/lib/utils.js";
import { authorsLine } from "@/components/research/SourceCard.js";
import type { AcademicSource, CitationOutput } from "@/types";
import { api } from "@/lib/api.js";

/**
 * Detalhes da fonte (§20): todos os campos, com "Não informado" quando o
 * dado não existe — nunca inventamos informação.
 */
export default function SourceDetailPage(): JSX.Element {
  const { id = "" } = useParams();
  const [source, setSource] = useState<AcademicSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [citations, setCitations] = useState<CitationOutput[] | null>(null);
  const [citeOpen, setCiteOpen] = useState(false);
  const save = useLibraryMutations();
  const cite = useGenerateCitations();
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get<{ source: AcademicSource }>(`/api/sources/${id}`)
      .then((data) => {
        if (active) setSource(data.source);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Fonte não encontrada.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const handleSave = async (): Promise<void> => {
    if (!source) return;
    try {
      await save.save.mutateAsync({ sourceId: source.id ?? undefined, source });
      toast({ title: "Fonte guardada na biblioteca", variant: "success" });
    } catch (err) {
      toast({ title: "Erro ao guardar", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  const handleCite = async (): Promise<void> => {
    if (!source?.id) return;
    try {
      const data = await cite.mutateAsync({ sourceId: source.id, styles: ["apa7", "abnt"] });
      setCitations(data.citations);
      setCiteOpen(true);
    } catch (err) {
      toast({ title: "Erro ao citar", description: err instanceof Error ? err.message : undefined, variant: "error" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !source) {
    return <ErrorState title="Fonte não encontrada" description={error ?? undefined} />;
  }

  const fields: Array<[string, string | number | null | undefined]> = [
    ["Autores", source.authors.length ? authorsLine(source) : null],
    ["Ano", source.year],
    ["Revista", source.journal],
    ["Editora", source.publisher],
    ["Volume", source.volume],
    ["Número", source.issue],
    ["Páginas", source.pages],
    ["DOI", source.doi],
    ["ISBN", source.isbn],
    ["Idioma", source.language],
    ["Citações", source.citationCount],
    ["URL", source.url],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={source.title}
        description={authorsLine(source)}
        actions={
          <>
            <Button variant="outline" onClick={handleSave} disabled={save.save.isPending}>
              {save.save.isPending ? <Loader2 className="size-4 animate-spin" /> : <BookmarkPlus className="size-4" />}
              Guardar
            </Button>
            <Button variant="outline" onClick={handleCite} disabled={cite.isPending}>
              {cite.isPending ? <Loader2 className="size-4 animate-spin" /> : <Quote className="size-4" />}
              Citar
            </Button>
            {source.url ? (
              <Button asChild>
                <a href={source.url} target="_blank" rel="noreferrer noopener">
                  <ExternalLink className="size-4" />
                  Abrir fonte
                </a>
              </Button>
            ) : null}
          </>
        }
      />

      <Button variant="ghost" size="sm" asChild className="-mt-4">
        <Link to="/research">
          <ArrowLeft className="size-4" />
          Voltar
        </Link>
      </Button>

      <Card>
        <CardContent className="grid gap-x-8 gap-y-3 p-5 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-3 text-sm">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="max-w-[65%] break-words text-right">
                {value === null || value === undefined || value === "" ? (
                  <span className="italic text-muted-foreground">Não informado</span>
                ) : label === "URL" ? (
                  <a href={String(value)} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">
                    {orNotInformed(value)}
                  </a>
                ) : (
                  orNotInformed(value)
                )}
              </dd>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <h2 className="mb-2 text-sm font-semibold">Resumo</h2>
            {source.abstract ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{source.abstract}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">
                Resumo não informado — não foi possível confirmar esta informação nas fontes consultadas.
              </p>
            )}
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold">Palavras-chave</h2>
            {source.keywords.length ? (
              <div className="flex flex-wrap gap-1.5">
                {source.keywords.map((keyword) => (
                  <Badge key={keyword} variant="secondary">
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-muted-foreground">Não informado</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SourceTypeBadge type={source.type} />
            <ProviderBadges providers={source.providers} />
            {source.openAccess ? <Badge variant="success">Acesso aberto</Badge> : null}
            <Badge variant="outline">Metadados verificados nas fontes consultadas</Badge>
          </div>
        </CardContent>
      </Card>


      <Dialog open={citeOpen} onOpenChange={setCiteOpen}>
        <DialogContent title="Citações geradas" description="Escolhe o estilo e copia.">
          <div className="space-y-4">
            {citations?.map((citation) => (
              <div key={citation.style} className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{citation.style === "apa7" ? "APA 7" : "ABNT"}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(citation.full);
                      toast({ title: "Copiado", variant: "success" });
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <p className="text-sm">{citation.full}</p>
                <p className="text-xs text-muted-foreground">Narrativa: {citation.narrative}</p>
                <p className="text-xs text-muted-foreground">Parentética: {citation.parenthetical}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
