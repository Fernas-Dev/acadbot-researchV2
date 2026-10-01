# Motor de validação

Fluxo (`backend/src/services/validation/validator.ts`):

```
referência colada
  → referenceParser (ABNT/APA/DOI/ISBN/URL/ano/páginas/volume)
  → verifyDOI (se houver DOI: resolução direta + comparação com a referência)
  → pesquisa nos providers (título/autor + lookup por DOI)
  → matchSource campo a campo (autor/título/ano/DOI/ISBN/revista/editora/volume/páginas)
  → decideStatus → confirmed | partially_confirmed | unconfirmed | inconsistent
```

## Estados (§22)

- **confirmed** — correspondências fortes sem conflitos.
- **partially_confirmed** — obra encontrada com divergências.
- **unconfirmed** — sem evidência suficiente (**não** significa “falsa”).
- **inconsistent** — conflito explícito (DOI/ISBN errado, múltiplas
  divergências): a referência contradiz as fontes encontradas.

## Confiança (§23)

Pesos: DOI 26, título 26, autor 20, ano 14, ISBN 6, revista 4, editora 2,
volume 1, páginas 1. Campos ausentes são redistribuídos (não penalizam).
Apresentada como “Confiança de correspondência: N%” — é correspondência de
dados, **não** prova de autenticidade.

## Verificação de DOI (§25)

`verifyDOI()` resolve o DOI nos providers e compara DOI/título/autor/ano.
Em divergência: “DOI encontrado, mas os dados não correspondem completamente
à referência informada.”

## Validação em massa (§24)

`POST /api/validation/bulk` processa sequencialmente (limite por pedido de
`FREE_BULK_MAX_REFERENCES`), respeitando a quota diária; apresenta tabela
número/referência/estado/confiança/problemas com ações e exportação CSV.

Testes: `validation.test.ts` (parser ABNT/APA, matching, estados, DOI).
