/**
 * Dicionários heurísticos do Topic Analyzer.
 * Cobrem termos académicos comuns (PT↔EN), áreas, geografia e sinónimos.
 * Extensíveis — a IA pode enriquecer, mas nunca substituir fontes reais.
 */

export interface AreaHint {
  area: string;
  subarea?: string;
  terms: string[];
}

export const AREA_HINTS: AreaHint[] = [
  { area: "Economia", subarea: "Macroeconomia", terms: ["inflacao", "pib", "crescimento economico", "politica monetaria", "taxa de juro", "juros", "desemprego", "macroeconomia", "economia", "moeda", "cambio", "divida publica", "balanca comercial", "exportacoes", "importacoes"] },
  { area: "Economia", subarea: "Desenvolvimento", terms: ["desenvolvimento", "pobreza", "desigualdade", "pib per capita", "economia emergente", "ajuda externa"] },
  { area: "Educação", terms: ["educacao", "escola", "ensino", "aprendizagem", "professor", "aluno", "universidade", "curriculo", "evasao", "literacia"] },
  { area: "Saúde", terms: ["saude", "doenca", "hospital", "malaria", "hiv", "sida", "nutricao", "vacina", "saude publica", "mortalidade"] },
  { area: "Direito", terms: ["direito", "lei", "constituicao", "justica", "tribunal", "legislacao", "contrato"] },
  { area: "Agronomia", terms: ["agricultura", "agronegocio", "solo", "safra", "pecuaria", "rural", "alimentacao"] },
  { area: "Engenharia", terms: ["engenharia", "construcao", "infraestrutura", "energia", "estrada"] },
  { area: "Gestão", terms: ["gestao", "empresa", "empreendedorismo", "marketing", "recursos humanos", "pme", "financas"] },
  { area: "Sociologia", terms: ["sociedade", "social", "genero", "familia", "migracao", "juventude", "cultura"] },
  { area: "Ambiente", terms: ["ambiente", "clima", "mudancas climaticas", "sustentabilidade", "poluicao", "biodiversidade"] },
  { area: "Tecnologia", terms: ["tecnologia", "informatica", "digital", "software", "inteligencia artificial", "dados"] },
  { area: "Psicologia", terms: ["psicologia", "comportamento", "ansiedade", "depressao", "cognicao"] },
];

/** Dicionário PT→EN de termos académicos (chaves normalizadas sem acentos). */
export const PT_EN_TERMS: Record<string, string> = {
  inflacao: "inflation", "crescimento economico": "economic growth", pib: "gdp",
  "produto interno bruto": "gross domestic product", "politica monetaria": "monetary policy",
  "politica fiscal": "fiscal policy", desemprego: "unemployment", moeda: "currency",
  cambio: "exchange rate", "taxa de juro": "interest rate", juros: "interest rates",
  "divida publica": "public debt", "balanca comercial": "trade balance",
  exportacoes: "exports", importacoes: "imports", pobreza: "poverty",
  desigualdade: "inequality", desenvolvimento: "development",
  "desenvolvimento economico": "economic development", economia: "economy",
  educacao: "education", escola: "school", ensino: "teaching", aprendizagem: "learning",
  professor: "teacher", aluno: "student", universidade: "university", curriculo: "curriculum",
  evasao: "dropout", literacia: "literacy", saude: "health", doenca: "disease",
  hospital: "hospital", malaria: "malaria", hiv: "hiv", sida: "aids", nutricao: "nutrition",
  vacina: "vaccine", "saude publica": "public health", mortalidade: "mortality",
};

export const PT_EN_TERMS_EXTRA: Record<string, string> = {
  agricultura: "agriculture", rural: "rural", alimentacao: "food", solo: "soil",
  gestao: "management", empresa: "firm", empreendedorismo: "entrepreneurship",
  marketing: "marketing", "recursos humanos": "human resources", pme: "smes",
  "pequenas e medias empresas": "small and medium enterprises", financas: "finance",
  genero: "gender", familia: "family", migracao: "migration", juventude: "youth",
  ambiente: "environment", clima: "climate", "mudancas climaticas": "climate change",
  sustentabilidade: "sustainability", poluicao: "pollution", tecnologia: "technology",
  digital: "digital", "inteligencia artificial": "artificial intelligence",
  dados: "data", psicologia: "psychology", comportamento: "behavior",
  energia: "energy", agua: "water", habitacao: "housing", transporte: "transport",
  investimento: "investment", "investimento estrangeiro": "foreign investment",
  remessas: "remittances", corrupcao: "corruption", "setor informal": "informal sector",
  microfinancas: "microfinance", "inclusao financeira": "financial inclusion",
  produtividade: "productivity", comercio: "trade",
  "integracao regional": "regional integration", metodologia: "methodology",
  "estudo de caso": "case study", inquerito: "survey", "revisao de literatura": "literature review",
};

/** Geografia: chave normalizada → {pt, en}. Procurar por tamanho decrescente. */
export const GEO_DB: Record<string, { pt: string; en: string }> = {
  mocambique: { pt: "Moçambique", en: "Mozambique" },
  angola: { pt: "Angola", en: "Angola" },
  portugal: { pt: "Portugal", en: "Portugal" },
  brasil: { pt: "Brasil", en: "Brazil" },
  "cabo verde": { pt: "Cabo Verde", en: "Cape Verde" },
  "guinea bissau": { pt: "Guiné-Bissau", en: "Guinea-Bissau" },
  "sao tome": { pt: "São Tomé e Príncipe", en: "São Tomé and Príncipe" },
  "timor leste": { pt: "Timor-Leste", en: "East Timor" },
  "africa do sul": { pt: "África do Sul", en: "South Africa" },
  zimbabue: { pt: "Zimbabué", en: "Zimbabwe" },
  tanzania: { pt: "Tanzânia", en: "Tanzania" },
  quenia: { pt: "Quénia", en: "Kenya" },
  nigeria: { pt: "Nigéria", en: "Nigeria" },
  "africa subsariana": { pt: "África Subsaariana", en: "Sub-Saharan Africa" },
  africa: { pt: "África", en: "Africa" },
  "uniao europeia": { pt: "União Europeia", en: "European Union" },
  "america latina": { pt: "América Latina", en: "Latin America" },
  global: { pt: "Global", en: "Global" },
};

export const SYNONYMS: Record<string, string[]> = {
  pib: ["produto interno bruto", "gdp"],
  inflacao: ["nivel de precos", "aumento de precos"],
  desemprego: ["taxa de desemprego", "unemployment"],
  "crescimento economico": ["desenvolvimento economico", "expansao economica"],
  "politica monetaria": ["taxas de juro", "banco central", "massa monetaria"],
  remessas: ["remittances", "transferencias dos emigrantes"],
};

/** Conceitos que tipicamente funcionam como variáveis de estudo. */
export const VARIABLE_HINTS = [
  "inflacao", "pib", "desemprego", "crescimento economico", "pobreza", "investimento",
  "remessas", "exportacoes", "produtividade", "taxa de juro", "cambio", "desigualdade",
];

