import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, FileCheck2, HelpCircle, Moon, Search, ShieldCheck, Sparkles, Sun } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives.js";
import { BookMarked, Quote, Table2 } from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Pesquisa bibliográfica",
    text: "Consulta Crossref, OpenAlex e Semantic Scholar com queries geradas a partir do teu tema, em vários idiomas.",
  },
  {
    icon: FileCheck2,
    title: "Validação de referências",
    text: "Confirma autoria, ano, revista e DOI. Estados claros: confirmada, parcialmente confirmada, não confirmada ou inconsistente.",
  },
  {
    icon: BookMarked,
    title: "Biblioteca pessoal",
    text: "Guarda fontes com tags, notas, estado de leitura e associação a projetos de investigação.",
  },
  {
    icon: Quote,
    title: "Citações APA 7 e ABNT",
    text: "Referências completas, citações narrativas e parentéticas em um clique — prontas para copiar.",
  },
  {
    icon: Table2,
    title: "Matriz de literatura",
    text: "Organiza autor, ano, temática, metodologia, amostra, resultados e limitações para a revisão da literatura.",
  },
  {
    icon: ShieldCheck,
    title: "Nada é inventado",
    text: "Quando um dado não é confirmado nas fontes consultadas, dizemos exatamente isso. Nunca criamos referências fictícias.",
  },
];

export default function LandingPage(): JSX.Element {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  const toggleTheme = (): void => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("acadbot-theme", next ? "dark" : "light");
    } catch {
      /* armazenamento indisponível — tema mantém-se na sessão */
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              AR
            </span>
            <span className="text-sm font-semibold">AcadBot Research</span>
          </div>
          <nav aria-label="Navegação da página" className="flex flex-wrap items-center justify-end gap-1">
            <Button variant="ghost" size="sm" asChild>
              <a href="#funcionalidades">Funcionalidades</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#precos">Preços</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#faq">FAQ</a>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/register">Começar</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Badge className="mb-4" variant="secondary">
          <Sparkles className="size-3" aria-hidden />
          Pesquisa académica verificável
        </Badge>
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
          Encontre, verifique e organize referências académicas com inteligência.
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Pesquisa bibliográfica profunda em bases reais, validação de referências com correspondência por campo,
          biblioteca pessoal, citações APA 7 e ABNT e matriz de revisão da literatura — sem inventar dados.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button size="lg" asChild>
            <Link to="/register">
              Criar conta grátis
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/login">Já tenho conta</Link>
          </Button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Bases académicas", value: "3 providers", note: "Crossref · OpenAlex · Semantic Scholar" },
            { label: "Estados de validação", value: "4 níveis", note: "Com confiança por campo" },
            { label: "Exportação", value: "5 formatos", note: "DOCX · PDF · CSV · BibTeX · RIS" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="scroll-mt-20 border-t bg-secondary/30 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold">Funcionalidades</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-md bg-primary/10">
                    <feature.icon className="size-4 text-primary" aria-hidden />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="precos" className="scroll-mt-20 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold">Como funciona</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              "Cria um projeto e define o tema da pesquisa",
              "O sistema analisa o tema e gera várias queries",
              "Consulta múltiplas bases académicas em paralelo",
              "Remove duplicados e calcula a relevância estimada",
              "Valida referências, cita em APA 7/ABNT e exporta",
            ].map((step, index) => (
              <li key={step} className="rounded-lg border bg-card p-4">
                <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Blocos específicos */}
      <section id="faq" className="scroll-mt-20 border-t bg-secondary/30 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3">
          {[
            {
              title: "Pesquisa bibliográfica",
              text: "Tema → análise → múltiplas queries → normalização → deduplicação → relevância estimada, com progresso em tempo real e tolerância a falhas de providers.",
            },
            {
              title: "Validação",
              text: "Cola uma referência e compara autor, título, ano, DOI, ISBN, revista e editora com as fontes. Também valida em massa e verifica DOIs.",
            },
            {
              title: "Biblioteca & Matriz",
              text: "Guarda, filtra e etiqueta fontes; monta a matriz da revisão da literatura e exporta tudo em DOCX, PDF ou CSV.",
            },
          ].map((block) => (
            <Card key={block.title}>
              <CardHeader>
                <CardTitle>{block.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{block.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Preços */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold">Preços</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { name: "Grátis", price: "Grátis", features: ["20 pesquisas/dia", "100 validações/dia", "Biblioteca e projetos", "Exportação DOCX/PDF/CSV"] },
              { name: "Investigador", price: "Em breve", features: ["Pesquisas ilimitadas", "Validação em massa ampliada", "Análise de literatura por IA", "Créditos adicionais"] },
              { name: "Instituições", price: "Em breve", features: ["Vários utilizadores", "Administração dedicada", "Suporte prioritário", "Integrações avançadas"] },
            ].map((plan) => (
              <Card key={plan.name} className={plan.name === "Grátis" ? "border-primary" : undefined}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-2xl font-bold">{plan.price}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plan.features.map((item) => (
                    <p key={item} className="flex items-start gap-2 text-sm">
                      <span className="text-success" aria-hidden>✓</span>
                      {item}
                    </p>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t bg-secondary/30 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <HelpCircle className="size-5 text-primary" aria-hidden />
            Perguntas frequentes
          </h2>
          <div className="mt-6 space-y-4">
            {[
              {
                q: "O AcadBot cria referências?",
                a: "Não. Todo o conteúdo vem de bases académicas externas (Crossref, OpenAlex, Semantic Scholar). Se um dado não puder ser confirmado, é apresentado como “Não informado”.",
              },
              {
                q: "O que significa “Relevância estimada”?",
                a: "É uma heurística que combina correspondência temática, geografia, recência e qualidade dos metadados. Não é uma métrica científica universal.",
              },
              {
                q: "A validação prova que uma referência é verdadeira?",
                a: "Mostra o grau de correspondência dos dados (autor, título, ano, DOI, editora) com fontes reais. Não é uma prova absoluta de autenticidade.",
              },
              {
                q: "Os meus dados são privados?",
                a: "Sim. Cada utilizador só acede aos próprios projetos, biblioteca e pesquisas (Row Level Security). As chaves de API nunca chegam ao navegador.",
              },
            ].map((item) => (
              <Card key={item.q}>
                <CardHeader>
                  <CardTitle className="text-sm">{item.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + rodapé */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold">Pronto para começar a sua pesquisa?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Crie a sua conta, crie um projeto e realize a primeira pesquisa bibliográfica em minutos.
          </p>
          <Button size="lg" className="mt-6" asChild>
            <Link to="/register">
              Começar agora
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <span className="text-sm font-semibold">AcadBot Research</span>
          <p className="text-xs text-muted-foreground">
            Encontre, verifique e organize referências académicas com inteligência. Fontes: Crossref, OpenAlex e
            Semantic Scholar.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link to="/login" className="hover:text-foreground">Entrar</Link>
            <Link to="/register" className="hover:text-foreground">Criar conta</Link>
          </div>
        </div>
      </footer>


    </div>
  );
}
