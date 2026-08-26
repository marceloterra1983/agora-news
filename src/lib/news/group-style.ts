type StyleKey = "labs" | "lideres" | "pesquisa" | "imprensa" | "builders" | "novos";

/** Cores sóbrias dos chips/tags — hue vem do tema, joia no dock. */
export const GROUP_STYLE: Record<
  StyleKey,
  { chip: string; chipOn: string; tag: string }
> = {
  labs: {
    chip: "bg-[color-mix(in_oklab,var(--agora-hue-labs)_42%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-labs)_45%,#f0e9e0)]",
    chipOn: "bg-[color-mix(in_oklab,var(--agora-hue-labs)_58%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-labs)_28%,#f0e9e0)] ring-1 ring-[color-mix(in_oklab,var(--agora-hue-labs)_40%,transparent)]",
    tag: "bg-[color-mix(in_oklab,var(--agora-hue-labs)_42%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-labs)_45%,#f0e9e0)]",
  },
  lideres: {
    chip: "bg-[color-mix(in_oklab,var(--agora-hue-lideres)_42%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-lideres)_45%,#f0e9e0)]",
    chipOn: "bg-[color-mix(in_oklab,var(--agora-hue-lideres)_58%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-lideres)_28%,#f0e9e0)] ring-1 ring-[color-mix(in_oklab,var(--agora-hue-lideres)_40%,transparent)]",
    tag: "bg-[color-mix(in_oklab,var(--agora-hue-lideres)_42%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-lideres)_45%,#f0e9e0)]",
  },
  pesquisa: {
    chip: "bg-[color-mix(in_oklab,var(--agora-hue-pesquisa)_42%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-pesquisa)_45%,#f0e9e0)]",
    chipOn: "bg-[color-mix(in_oklab,var(--agora-hue-pesquisa)_58%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-pesquisa)_28%,#f0e9e0)] ring-1 ring-[color-mix(in_oklab,var(--agora-hue-pesquisa)_40%,transparent)]",
    tag: "bg-[color-mix(in_oklab,var(--agora-hue-pesquisa)_42%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-pesquisa)_45%,#f0e9e0)]",
  },
  imprensa: {
    chip: "bg-[color-mix(in_oklab,var(--agora-hue-imprensa)_42%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-imprensa)_45%,#f0e9e0)]",
    chipOn: "bg-[color-mix(in_oklab,var(--agora-hue-imprensa)_58%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-imprensa)_28%,#f0e9e0)] ring-1 ring-[color-mix(in_oklab,var(--agora-hue-imprensa)_40%,transparent)]",
    tag: "bg-[color-mix(in_oklab,var(--agora-hue-imprensa)_42%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-imprensa)_45%,#f0e9e0)]",
  },
  builders: {
    chip: "bg-[color-mix(in_oklab,var(--agora-hue-builders)_42%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-builders)_45%,#f0e9e0)]",
    chipOn: "bg-[color-mix(in_oklab,var(--agora-hue-builders)_58%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-builders)_28%,#f0e9e0)] ring-1 ring-[color-mix(in_oklab,var(--agora-hue-builders)_40%,transparent)]",
    tag: "bg-[color-mix(in_oklab,var(--agora-hue-builders)_42%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-builders)_45%,#f0e9e0)]",
  },
  novos: {
    chip: "bg-[color-mix(in_oklab,var(--agora-hue-novos)_42%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-novos)_45%,#f0e9e0)]",
    chipOn: "bg-[color-mix(in_oklab,var(--agora-hue-novos)_58%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-novos)_28%,#f0e9e0)] ring-1 ring-[color-mix(in_oklab,var(--agora-hue-novos)_40%,transparent)]",
    tag: "bg-[color-mix(in_oklab,var(--agora-hue-novos)_42%,#1c1916)] text-[color-mix(in_oklab,var(--agora-hue-novos)_45%,#f0e9e0)]",
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
