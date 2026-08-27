const AI_ORDER = ["labs", "lideres", "pesquisa", "imprensa", "builders", "regulacao", "ai-riscos", "novos"];

export const SECTION_TAXONOMY = {
  ai: {
    order: AI_ORDER,
    labels: {
      labs: "Empresas",
      lideres: "CEOs",
      pesquisa: "Cientistas",
      imprensa: "Imprensa",
      builders: "Devs",
      regulacao: "Regulação",
      "ai-riscos": "Riscos",
      novos: "Outros",
    },
    hints: {
      labs: "Contas oficiais das empresas e dos produtos",
      lideres: "Quem comanda as empresas de IA",
      pesquisa: "Pesquisadores e autores de papers",
      imprensa: "Newsletters e quem seleciona o que importa",
      builders: "Engenheiros e makers que constroem com IA",
      regulacao: "Normas, política pública e padrão de IA",
      "ai-riscos": "Incidentes, alinhamento e direitos digitais",
      novos: "Sem grupo definido ou adicionados por você.",
    },
  },
  tech: {
    order: [
      "tech-empresas",
      "tech-imprensa",
      "tech-startups",
      "tech-gadgets",
      "tech-seguranca",
      "tech-devs",
      "tech-opensource",
      "tech-ciencia",
      "novos",
    ],
    labels: {
      "tech-empresas": "Empresas",
      "tech-imprensa": "Imprensa",
      "tech-startups": "Startups",
      "tech-gadgets": "Gadgets",
      "tech-seguranca": "Segurança",
      "tech-devs": "Devs",
      "tech-opensource": "Open source",
      "tech-ciencia": "Ciência",
      novos: "Outros",
    },
    hints: {
      "tech-empresas": "Contas oficiais de produto, hardware e plataformas",
      "tech-imprensa": "Redações que cobrem tecnologia, gadgets e o mercado",
      "tech-startups": "Aceleradoras, fundos e fundadores do ecossistema",
      "tech-gadgets": "Reviews de hardware, celulares e PCs",
      "tech-seguranca": "Jornalismo e pesquisa de segurança da informação",
      "tech-devs": "Engenharia, plataformas e ofício de quem constrói",
      "tech-opensource": "Fundações, kernel e o ecossistema aberto",
      "tech-ciencia": "Pesquisa, espaço e jornalismo científico",
      novos: "Sem grupo definido ou adicionados por você.",
    },
  },
  brasil: {
    order: [
      "br-jornais",
      "br-politica",
      "br-economia",
      "br-colunistas",
      "br-instituicoes",
      "br-ciencia",
      "br-mundo",
      "br-cultura",
      "novos",
    ],
    labels: {
      "br-jornais": "Jornais",
      "br-politica": "Política",
      "br-economia": "Economia",
      "br-colunistas": "Colunistas",
      "br-instituicoes": "Instituições",
      "br-ciencia": "Ciência",
      "br-mundo": "Mundo",
      "br-cultura": "Cultura",
      novos: "Outros",
    },
    hints: {
      "br-jornais": "Redações gerais do noticiário brasileiro",
      "br-politica": "Cobertura de Brasília, Congresso e poder",
      "br-economia": "Mercado, fiscal e negócios no Brasil",
      "br-colunistas": "Assinaturas e análise com nome próprio",
      "br-instituicoes": "Contas oficiais de Estado e órgãos públicos",
      "br-ciencia": "Pesquisa, universidades e divulgação científica",
      "br-mundo": "Internacional em português e América Latina",
      "br-cultura": "Artes, livros, cinema e o caderno cultural",
      novos: "Sem grupo definido ou adicionados por você.",
    },
  },
};

function slugifySection(name) {
  return (
    String(name || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "ai"
  );
}

export function normalizeSection(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.toLowerCase() === "capa") return "ai";
  return slugifySection(raw);
}

export function taxonomyFor(section) {
  const slug = normalizeSection(section);
  return SECTION_TAXONOMY[slug] ?? SECTION_TAXONOMY.ai;
}

export function groupOrderFor(section) {
  return taxonomyFor(section).order;
}

export function labelOfGroup(id, section) {
  if (!id) return taxonomyFor(section).labels.novos;
  const own = taxonomyFor(section).labels[id];
  if (own) return own;
  for (const tax of Object.values(SECTION_TAXONOMY)) {
    if (tax.labels[id]) return tax.labels[id];
  }
  return taxonomyFor(section).labels.novos;
}

export function hintOfGroup(id, section) {
  if (!id) return taxonomyFor(section).hints.novos;
  const own = taxonomyFor(section).hints[id];
  if (own) return own;
  for (const tax of Object.values(SECTION_TAXONOMY)) {
    if (tax.hints[id]) return tax.hints[id];
  }
  return "Grupo criado por você.";
}

export function reservedGroupIds() {
  return new Set(Object.values(SECTION_TAXONOMY).flatMap((tax) => tax.order));
}

export function isReservedGroup(id) {
  return reservedGroupIds().has(String(id || "").trim());
}
