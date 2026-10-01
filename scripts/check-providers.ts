/**
 * Verificação real dos providers académicos (§58 — nenhum mock).
 * Executa uma pesquisa verdadeira em Crossref, OpenAlex e Semantic Scholar
 * e mostra quantos resultados reais cada um devolve.
 *
 * Uso: node --import tsx scripts/check-providers.ts
 */
import { crossrefProvider } from "../backend/src/providers/crossref.js";
import { openalexProvider } from "../backend/src/providers/openalex.js";
import { semanticScholarProvider } from "../backend/src/providers/semanticScholar.js";
import { deduplicateSources } from "../backend/src/services/research/deduplication.js";
import { finalizeSource } from "../backend/src/services/research/normalize.js";

const QUERY = process.argv[2] ?? "inflation economic growth Mozambique";

const providers = [
  { label: "Crossref", instance: crossrefProvider },
  { label: "OpenAlex", instance: openalexProvider },
  { label: "Semantic Scholar", instance: semanticScholarProvider },
];

async function main(): Promise<void> {
  let total = 0;
  const all: ReturnType<typeof finalizeSource>[] = [];

  for (const { label, instance } of providers) {
    const started = Date.now();
    try {
      const results = await instance.search({ query: QUERY, maxResults: 5 });
      total += results.length;
      for (const item of results) all.push(finalizeSource(item));
      console.log(`✓ ${label}: ${results.length} resultado(s) reais em ${Date.now() - started}ms`);
      const first = results[0];
      if (first) {
        console.log(`    ex.: "${first.title.slice(0, 90)}" (${first.year ?? "s.d."})`);
        console.log(`         DOI=${first.doi ?? "não informado"} | autores=${first.authors.length}`);
      }
    } catch (error) {
      console.log(`✗ ${label}: falhou — ${error instanceof Error ? error.message : String(error)}`);
    }
    console.log("");
  }

  const unique = deduplicateSources(all);
  console.log(`Total antes da deduplicação: ${total}`);
  console.log(`Fontes únicas após deduplicação: ${unique.length}`);
  console.log(
    total === 0
      ? "\nATENÇÃO: nenhum provider devolveu dados (verifica a ligação à Internet)."
      : "\nOK: dados reais obtidos de bases académicas externas (nenhum mock).",
  );
}

void main();