# Motor de pesquisa

Pipeline (sempre nesta ordem, ver `backend/src/services/research/orchestrator.ts`):

```
tema
  → topicAnalyzer (local, determinístico; IA opcional só refina keywords)
  → queryGenerator (até 8 queries PT/EN/ES/FR)
  → providers em paralelo (Crossref → OpenAlex → Semantic Scholar, por prioridade)
  → normalize (formato interno AcademicSource + fingerprint)
  → deduplicate (DOI → ISBN → título+autor+ano; fuzzy title+autor+ano)
  → relevance (heurística 0–100 + razões)
  → persist (sources / research_results / research_queries)
```

- **Assíncrono**: `POST /api/research` cria o job e devolve `201`
  imediatamente; o frontend faz polling de `GET /api/research/:id`.
  Estados: `pending → processing → completed | failed | cancelled`.
- **Resiliência**: se um provider falha, os outros continuam e o job regista
  `warnings` com mensagem amigável (nunca o erro técnico).
- **Fingerprint**: `doi:<doi>` → `isbn:<isbn>` → `ta:<sha256(título|autor|ano)>`.
- **Deduplicação**: merge de `providers`, preenchimento de campos em falta
  (nunca sobrescreve), citações pelo máximo.
- **Relevância**: cobertura de keywords por grupo de língua (PT/EN/tema — a
  melhor cobertura vence, sem penalizar a língua da fonte), título, geografia,
  recência, tipo, metadados e citações (escala log). Ver `relevance.ts`.
- **Limites**: `resultsPerQuery` por provider/query, `maxResults × 2` finais.
- **Cache**: camada `CacheService` (memória, TTL) para queries e health
  checks; pronta para Redis (interface `ICache`).

Testes: `research.test.ts` (topic analyzer, queries, dedup, relevância),
`text.test.ts` (normalização/similaridade).
