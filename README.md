# AcadBot Research

> Encontre, verifique e organize referências académicas com inteligência.

Plataforma de pesquisa académica para estudantes e investigadores: pesquisa bibliográfica profunda em fontes reais (Crossref, OpenAlex, Semantic Scholar), validação de referências, biblioteca pessoal, citações APA 7 / ABNT, matriz de revisão da literatura e exportação.

**Princípio fundamental:** o sistema nunca inventa referências. Toda a informação provém de fontes externas verificáveis (Crossref, OpenAlex, Semantic Scholar). Quando algo não pode ser confirmado, é apresentado como *"Não foi possível confirmar esta informação nas fontes consultadas."*

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), React Router, TanStack Query, Lucide Icons |
| Backend | Node.js, Express, TypeScript |
| Base de dados | Supabase (PostgreSQL + Auth + Row Level Security) |
| Providers académicos | Crossref, OpenAlex, Semantic Scholar (arquitetura plugável) |
| IA (opcional) | API compatível com OpenAI — apenas no backend, com prompts anti-alucinação e validação JSON |
| Exportação | DOCX, PDF, CSV (+ BibTeX, RIS) |

## Estrutura

```
├── frontend/          # React app (Vite)
│   └── src/           # components/ pages/ hooks/ services/ lib/ types/
├── backend/           # API Express
│   └── src/
│       ├── routes/    # auth, research, validation, library, citations, matrix, projects, history, admin, exports
│       ├── services/  # research/, validation/, citation/, ai/, exports/, admin/, dashboard/
│       ├── providers/ # crossref, openalex, semanticScholar + registry
│       ├── middleware/# auth, rate limit, erros, logs, validação
│       └── lib/       # logger, cache, http, erros, supabase, text utils
├── supabase/
│   └── migrations/    # SQL completo com RLS
└── docs/              # architecture.md, database.md, api.md, research-engine.md, validation-engine.md
```

## Instalação

```bash
# 1. Instalar dependências (raiz, workspaces)
npm install

# 2. Configurar ambiente
cp .env.example .env
#   → preencha SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
#   → opcional: CROSSREF_MAILTO, AI_API_KEY

# 3. Criar a base de dados no Supabase
#   → SQL Editor: executar os ficheiros de supabase/migrations/ por ordem

# 4. Executar em desenvolvimento (API + Web)
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000/api/health

Sem Supabase configurado, pesquisa e validação continuam a funcionar nas
bases académicas — mas autenticação, histórico e biblioteca ficam
indisponíveis (a app informa isso em vez de mostrar dados fictícios).

## Scripts

```bash
npm run dev         # backend + frontend em concurrently
npm run build       # build backend + frontend
npm run start       # produção (backend a partir de dist/)
npm run test        # testes unitários (vitest)
npm run lint        # eslint (backend + frontend)
npm run typecheck   # tsc --noEmit (backend + frontend)
```

## Configuração do Supabase

1. Crie um projeto em https://supabase.com
2. Em *Settings → API*, copie `Project URL`, `anon key` e `service_role key` para o `.env`
3. No *SQL Editor*, execute as migrações em `supabase/migrations/` **por ordem numérica**
4. Para produção, verifique que o *Site URL* nas definições de Auth aponta para o seu domínio

As migrações criam todas as tabelas, índices, trigger de criação automática de perfil (`profiles`) e políticas **Row Level Security**.

> Sem Supabase configurado, a aplicação arranca e informa claramente que o serviço de dados não está configurado — nenhum dado fictício é apresentado.

## Testes

```bash
npm run test
```

Cobrem: normalização, deduplicação, ranking de relevância, parsing de referências,
matching/confiança, verificação de DOI, formatação APA/ABNT, geradores de query,
exportação (CSV/BibTeX/RIS/DOCX/PDF), utilitários de texto, tratamento de erros
assíncronos nas rotas e segurança dos endpoints (supertest).

## Verificação de integrações reais

```bash
# Confirmar que os providers devolvem dados reais (nenhum mock é usado)
npm run check:providers "inflation economic growth Mozambique"
```

Este script consulta Crossref, OpenAlex e Semantic Scholar ao vivo e mostra
quantos resultados reais cada um devolve, além do efeito da deduplicação.
Se um provider falhar, a pesquisa continua com os restantes.

Notas sobre limites das APIs públicas:

- **Crossref** funciona sem key (use `CROSSREF_MAILTO` para o *polite pool*).
- **OpenAlex** funciona sem key (use `OPENALEX_MAILTO`/`OPENALEX_API_KEY`).
- **Semantic Scholar** sem key partilha um limite muito restrito e pode
  devolver HTTP 429 — define `SEMANTIC_SCHOLAR_API_KEY` para limites estáveis.
  A falha é tratada de forma graciosa (a pesquisa continua noutras fontes).

## Segurança

- `service_role` apenas no backend; frontend usa apenas o `anon key` (público por design) para Auth
- Todas as tabelas com **RLS**; o backend valida o JWT em cada pedido e aplica escopo por utilizador
- Helmet, CORS restrito, rate limiting centralizado, validação de inputs (zod), sanitização, logs sem segredos
- API keys de IA/providers nunca chegam ao frontend

## Documentação

- `docs/architecture.md` — arquitetura do sistema
- `docs/database.md` — schema e RLS
- `docs/api.md` — endpoints REST
- `docs/research-engine.md` — pipeline de pesquisa (topic analyzer → query generator → providers → dedup → relevância)
- `docs/validation-engine.md` — parsing, matching, estados de validação e DOI

## Roadmap (arquitetura já preparada)

Análise de PDFs, chat com artigos, revisão de literatura assistida por IA, mapas de citações, integração WhatsApp, planos pagos/créditos, app mobile.
