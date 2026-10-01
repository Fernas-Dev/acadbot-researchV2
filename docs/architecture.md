# Arquitetura

Sistema em três camadas: frontend (SPA em React) comunica apenas com a API do
backend (`/api/*`); o backend orquestra a pesquisa académica, valida dados e
persiste no Supabase; os providers (Crossref, OpenAlex, Semantic Scholar) e a
IA são chamadas **apenas** no servidor — nenhuma API key privada sai do
backend.

```
┌────────────────────┐     HTTPS/JSON      ┌────────────────────┐
│  Frontend (React)  │ ─────────────────▶  │   Backend (API)    │
│  Vite + Tailwind   │ ◀─────────────────  │ Express + TS + zod │
└────────────────────┘   nunca expõe       └─────────┬──────────┘
         │               secrets (só anon      research orchestrator
         │               key do Supabase          ▼  providers  ▼  dedup
         │               Auth)              ┌─────┴─────────────┴─────┐
         ▼                                │ Crossref · OpenAlex · S2  │
┌────────────────────┐                    └─────────┬─────────────────┘
│ Supabase Auth      │                       normalização · relevância
│ (login na app)     │                              ▼
└────────────────────┘                    ┌────────────────────┐
                                          │ Supabase PostgreSQL│
                                          │ Auth · RLS · dados │
                                          └────────────────────┘
```

Rotas servidas pelo backend (`/api/*`):

| Área | Endpoints |
|---|---|
| Saúde/config | `GET /api/health`, `GET /healthz` |
| Auth | `GET /api/auth/public-config`, `GET /api/auth/me`, `PUT /api/auth/profile` |
| Pesquisa | `POST /api/research`, `POST /api/research/topic-preview`, `GET /api/research`, `GET /api/research/:id`, `GET /api/research/:id/results`, `POST /api/research/:id/cancel` |
| Fontes | `GET /api/sources/:id` |
| Validação | `POST /api/validation`, `POST /api/validation/bulk`, `POST /api/validation/doi`, `GET /api/validation`, `GET /api/validation/:id` |
| Projetos | `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id` |
| Biblioteca | `GET/POST /api/library`, `PATCH/DELETE /api/library/:id`, `GET/POST /api/library/tags`, `DELETE /api/library/tags/:tagId` |
| Citações | `POST /api/citations`, `POST /api/citations/bulk`, `GET /api/citations`, `GET /api/citations/:sourceId/all`, `DELETE /api/citations/:id` |
| Matriz | `GET/POST /api/matrix`, `GET/PUT/DELETE /api/matrix/:id`, `POST /api/matrix/:id/entries`, `PUT/DELETE /api/matrix/:id/entries/:entryId`, `POST /api/matrix/:id/analyze` |
| Histórico | `GET /api/history?type=all\|research\|validation\|export` |
| Exportação | `POST /api/exports` (binário), `GET /api/exports` |
| Dashboard | `GET /api/dashboard`, `GET /api/dashboard/notifications`, `POST /api/dashboard/notifications/read` |
| Admin | `GET /api/admin/overview|users|research|validation|providers|usage|logs|settings`, `PUT /api/admin/providers/:id`, `POST /api/admin/providers/health`, `PUT /api/admin/settings` |

Pesquisas correm em background (jobs `pending → processing → completed|failed|cancelled`);
o frontend consulta o progresso por polling (`refetchInterval` de 1,5s enquanto
o job está ativo).

A autenticação usa Supabase Auth (JWT). Em cada pedido, o backend valida o
token, carrega o perfil e aplica escopo por utilizador em **todas** as
consultas (`user_id = auth.uid()`). Rotas `/api/admin/*` exigem `role=admin`.

## Frontend — páginas e rotas

| Rota | Página | Descrição |
|---|---|---|
| `/` | Landing | Hero, funcionalidades, como funciona, preços, FAQ, CTA |
| `/login` `/register` | Auth | Login e registo (perfil criado pelo trigger) |
| `/forgot-password` `/reset-password` `/verify-email` | Auth | Recuperação, redefinição e confirmação de email |
| `/dashboard` | Dashboard | Métricas, uso, recentes, providers |
| `/projects` `/projects/:id` | Projetos | Lista/criação e detalhe com pesquisas e fontes |
| `/research/new` | Nova Pesquisa | Tema, filtros, análise do tema e queries previstas |
| `/research` `/research/:id` | Pesquisas | Histórico e detalhe com progresso e resultados |
| `/research/source/:id` | Fonte | Detalhe completo com “Não informado” quando ausente |
| `/validate` `/validate/bulk` `/validate/:id` | Validação | Individual, em massa e detalhe com confiança por campo |
| `/library` | Biblioteca | Pesquisa, filtros, estado de leitura, tags, notas |
| `/citations` | Citações | APA 7 / ABNT (referência, narrativa, parentética) |
| `/matrix` `/matrix/:id` | Matriz | Entradas, preenchimento IA e análise comparativa |
| `/history` | Histórico | Pesquisas, validações e exportações (reabrir) |
| `/settings` | Configurações | Perfil, palavra-passe, tema, integrações |
| `/admin/*` | Administração | Overview, utilizadores, pesquisas, validações, providers, uso, logs, settings |

## Princípios aplicados

- **Nunca inventar**: toda a informação exibida vem de fontes externas. É
  exibido “Não informado” / “Não identificado na fonte” /
  “Não foi possível confirmar esta informação nas fontes consultadas.”
  quando o dado não existe.
- **Relevância estimada**: heurística (tema, geografia, recência, tipo,
  metadados, citações), apresentada como estimativa — nunca como métrica
  científica.
- **Confiança de validação**: correspondência ponderada de campos, não prova
  de autenticidade. “Não confirmada” ≠ “falsa”.
- **Segurança**: `service_role` só no backend; RLS em todas as tabelas;
  Helmet, CORS, rate limiting centralizado, validação zod, logs sem segredos.
- **Mocks**: nenhum mock apresentado como dado real — a app informa
  claramente quando uma integração não está configurada (comprovado pelo
  teste `src/routes/api.test.ts`).
