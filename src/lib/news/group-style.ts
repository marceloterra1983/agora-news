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

const ALIAS: Record<string, StyleKey> = {
  "tech-empresas": "labs",
  "tech-imprensa": "imprensa",
  "tech-startups": "lideres",
  "tech-gadgets": "pesquisa",
  "tech-seguranca": "builders",
  "tech-devs": "builders",
  "br-jornais": "imprensa",
  "br-politica": "lideres",
  "br-economia": "labs",
  "br-colunistas": "pesquisa",
  "br-instituicoes": "builders",
};

export function hasGroupStyle(id?: string | null): boolean {
  return Boolean(id && (id in GROUP_STYLE || id in ALIAS));
}

export function groupStyle(id?: string | null) {
  const key = (id && (id in GROUP_STYLE ? id : ALIAS[id])) as StyleKey | undefined;
  return GROUP_STYLE[key ?? "novos"];
}
