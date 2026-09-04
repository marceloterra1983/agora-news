type StyleKey = "labs" | "lideres" | "pesquisa" | "imprensa" | "builders" | "novos";

/** Joia do dock: só o token de hue. Cor fica em [data-jewel] no tema. */
export const GROUP_STYLE: Record<
  StyleKey,
  { chip: string; chipOn: string; tag: string }
> = {
  labs: {
    chip: "[--chip-hue:var(--agora-hue-labs)]",
    chipOn: "[--chip-hue:var(--agora-hue-labs)]",
    tag: "[--chip-hue:var(--agora-hue-labs)]",
  },
  lideres: {
    chip: "[--chip-hue:var(--agora-hue-lideres)]",
    chipOn: "[--chip-hue:var(--agora-hue-lideres)]",
    tag: "[--chip-hue:var(--agora-hue-lideres)]",
  },
  pesquisa: {
    chip: "[--chip-hue:var(--agora-hue-pesquisa)]",
    chipOn: "[--chip-hue:var(--agora-hue-pesquisa)]",
    tag: "[--chip-hue:var(--agora-hue-pesquisa)]",
  },
  imprensa: {
    chip: "[--chip-hue:var(--agora-hue-imprensa)]",
    chipOn: "[--chip-hue:var(--agora-hue-imprensa)]",
    tag: "[--chip-hue:var(--agora-hue-imprensa)]",
  },
  builders: {
    chip: "[--chip-hue:var(--agora-hue-builders)]",
    chipOn: "[--chip-hue:var(--agora-hue-builders)]",
    tag: "[--chip-hue:var(--agora-hue-builders)]",
  },
  novos: {
    chip: "[--chip-hue:var(--agora-hue-novos)]",
    chipOn: "[--chip-hue:var(--agora-hue-novos)]",
    tag: "[--chip-hue:var(--agora-hue-novos)]",
  },
};

export const GROUP_STYLE_ALIAS: Record<string, StyleKey> = {
  "tech-empresas": "labs",
  "tech-imprensa": "imprensa",
  "tech-startups": "lideres",
  "tech-gadgets": "pesquisa",
  "tech-seguranca": "builders",
  "tech-devs": "builders",
  "tech-opensource": "builders",
  "tech-ciencia": "pesquisa",
  "br-analise": "lideres",
  "br-jornais": "imprensa",
  "br-politica": "lideres",
  "br-economia": "labs",
  "br-colunistas": "pesquisa",
  "br-instituicoes": "builders",
  "br-ciencia": "pesquisa",
  "br-mundo": "imprensa",
  "br-cultura": "pesquisa",
  regulacao: "lideres",
  "ai-riscos": "builders",
  agentes: "builders",
  modelos: "labs",
  local: "pesquisa",
  engenharia: "imprensa",
  entrevistas: "imprensa",
  debates: "lideres",
  especialistas: "pesquisa",
  commodities: "labs",
  macro: "imprensa",
  financas: "builders",
  negocios: "lideres",
};

export function hasGroupStyle(id?: string | null): boolean {
  return Boolean(id && (id in GROUP_STYLE || id in GROUP_STYLE_ALIAS));
}

export function groupStyle(id?: string | null) {
  const key = (id && (id in GROUP_STYLE ? id : GROUP_STYLE_ALIAS[id])) as StyleKey | undefined;
  return GROUP_STYLE[key ?? "novos"];
}
