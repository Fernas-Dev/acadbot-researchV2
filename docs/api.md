# API REST

Base: `http://localhost:4000/api`. Autenticação por `Authorization: Bearer <JWT do Supabase>`
em todas as rotas exceto `/health`, `/healthz` e `/auth/public-config`.

## Convenções

- Erros seguem o formato `{ "error": { "code": "CODIGO", "message": "..." } }`
  (nunca stack traces nem detalhes técnicos).
- `401 UNAUTHORIZED` sem token; `403 FORBIDDEN` em áreas admin;
  `429 RATE_LIMITED` em excesso de pedidos;
  `503 SERVICE_UNAVAILABLE` quando uma integração (Supabase/DB) não está
  configurada — com mensagem clara do que falta configurar.
- Validação de inputs com `zod` → `400 BAD_REQUEST` com os campos inválidos.
- Paginação simples por `limit` (máx. 200) onde aplicável.

## Endpoints

Ver tabela completa em `docs/architecture.md` (secção “Rotas servidas pelo
backend”).

Notas relevantes:

- `POST /api/research` — cria o job (`201`) com `{ topic, area, workType,
  countryRegion, yearFrom, yearTo, languages, sourceTypes, maxResults,
  projectId? }`. Polling em `GET /api/research/:id`; resultados completos em
  `GET /api/research/:id/results`; cancelamento em `POST /api/research/:id/cancel`.
- `POST /api/validation` — `{ reference, projectId? }` → validação completa.
- `POST /api/validation/bulk` — `{ references: string[] }` → itens
  processados + `skipped` + `quotaRemaining`.
- `POST /api/validation/doi` — `{ doi, reference? }` → verificação direta.
- `POST /api/library` — aceita `sourceId` (fonte existente) **ou** `source`
  (objeto completo, inserido por fingerprint) + `status/notes/tags/projectId`.
- `POST /api/citations` — `{ sourceId, styles, persist? }`.
- `POST /api/matrix/:id/entries` — `{ sourceId?, source?, useAi? }`; `useAi`
  preenche campos a partir do conteúdo da fonte (sem IA: tudo fica
  “Não identificado na fonte”).
- `POST /api/matrix/:id/analyze` — análise comparativa grounded (requer IA;
  caso contrário devolve `available: false` com explicação).
- `POST /api/exports` — devolve o ficheiro binário (`Content-Disposition:
  attachment`) e regista em `exports`.
- `GET /api/admin/*` — exige `role = admin` (verificado no JWT + perfil).

## Rate limiting (centralizado em `middleware/rateLimit.ts`)

| Âmbito | Janela | Máx. |
|---|---|---|
| global | 1 min | 300 |
| research | 1 min | 10 |
| validation | 1 min | 30 |
| bulk | 1 min | 5 |
| citation | 1 min | 60 |
| admin | 1 min | 60 |

Quotas diárias configuráveis via `.env`
(`FREE_RESEARCH_LIMIT`, `FREE_VALIDATION_LIMIT`, `FREE_BULK_MAX_REFERENCES`).
