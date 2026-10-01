import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader.js";
import { ResearchForm, type ResearchFormValue } from "@/components/research/ResearchForm.js";
import { IntegrationNotice } from "@/components/common/states.js";
import { useProjects, useStartResearch } from "@/hooks/queries.js";
import { useToast } from "@/hooks/useToast.js";
import { useAuth } from "@/hooks/useAuth.js";

export default function NewResearchPage(): JSX.Element {
  const navigate = useNavigate();
  const start = useStartResearch();
  const projects = useProjects();
  const { toast } = useToast();
  const { configured } = useAuth();

  const handleSubmit = async (value: ResearchFormValue): Promise<void> => {
    try {
      const { job } = await start.mutateAsync(value);
      toast({ title: "Pesquisa iniciada", description: "A acompanhar o progresso…", variant: "success" });
      navigate(`/research/${job.id}`);
    } catch (error) {
      toast({
        title: "Não foi possível iniciar a pesquisa",
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nova Pesquisa"
        description="Informe o tema e os filtros. O sistema analisa o tema, gera várias queries e consulta Crossref, OpenAlex e Semantic Scholar."
      />

      {!configured ? (
        <IntegrationNotice
          title="Supabase não configurado"
          description="Sem Supabase, o histórico não é guardado mas a pesquisa nas bases académicas funciona normalmente."
          variant="info"
        />
      ) : null}

      <ResearchForm
        onSubmit={(value) => void handleSubmit(value)}
        submitting={start.isPending}
        projects={projects.data?.projects ?? []}
      />
    </div>
  );
}
