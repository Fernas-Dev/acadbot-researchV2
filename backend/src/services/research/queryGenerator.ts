import type { GeneratedQuery, TopicAnalysis } from "../../types/index.js";

/**
 * Query Generator (§13): nunca executa uma única pesquisa.
 * Deriva múltiplas queries do tema em PT e EN, combinando conceitos,
 * variáveis, sinónimos e contexto geográfico.
 */
export function generateQueries(analysis: TopicAnalysis, maxQueries = 8): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];
  const seen = new Set<string>();

  const push = (query: string, language: GeneratedQuery["language"], purpose: string): void => {
    const q = query.replace(/\s+/g, " ").trim();
    const key = q.toLowerCase();
    if (!q || seen.has(key)) return;
    seen.add(key);
    queries.push({ query: q, language, purpose });
  };

  const geoPt = analysis.geoContext?.pt ?? null;
  const geoEn = analysis.geoContext?.en ?? null;
  const pt = analysis.keywords.pt;
  const en = analysis.keywords.en;
  const concepts = analysis.mainConcepts.filter((c) => c.length > 2);

  // 1. Query principal PT: conceitos + geografia
  if (pt.length >= 2) {
    push([...pt.slice(0, 3), geoPt].filter(Boolean).join(" "), "pt", "Tema principal (PT)");
  } else if (concepts.length) {
    push([...concepts.slice(0, 3), geoPt].filter(Boolean).join(" "), "pt", "Tema principal (PT)");
  }

  // 2. Query principal EN
  if (en.length >= 1) {
    push([...en.slice(0, 3), geoEn].filter(Boolean).join(" "), "en", "Tema principal (EN)");
  }

  // 3. Pares conceito×variável (relações de estudo)
  const vars = analysis.variables.length
    ? analysis.variables
    : concepts.filter((c) => !geoPt || normalize(c) !== normalize(geoPt)).slice(0, 2);
  for (const v of vars.slice(0, 2)) {
    const others = concepts.filter((c) => c !== v).slice(0, 1);
    for (const o of others) {
      push(`${v} ${o}${geoPt ? ` ${geoPt}` : ""}`, "pt", `Relação ${v} × ${o}`);
      const enV = en[pt.indexOf(v)] ?? null;
      const enO = en[pt.indexOf(o)] ?? null;
      if (enV && enO) {
        push(`${enV} ${enO}${geoEn ? ` ${geoEn}` : ""}`, "en", `Relação EN ${enV} × ${enO}`);
      }
    }
  }

  // 4. Sinónimos
  for (const syn of analysis.synonyms.slice(0, 2)) {
    push(`${syn}${geoPt ? ` ${geoPt}` : ""}`, "pt", `Sinónimo: ${syn}`);
  }

  // 5. Geografia + conceito isolado (contexto local)
  if (geoPt && concepts.length) {
    push(`${geoPt} ${concepts[0]}`, "pt", "Contexto geográfico");
  }
  if (geoEn && en.length) {
    push(`${geoEn} ${en[0]}`, "en", "Contexto geográfico (EN)");
  }

  // 6. Tema completo como fallback
  if (queries.length === 0) push(analysis.mainConcepts.join(" ") || "pesquisa académica", "pt", "Tema completo");

  return queries.slice(0, maxQueries);
}

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
