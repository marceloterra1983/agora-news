type StyleKey = "labs" | "lideres" | "pesquisa" | "imprensa" | "builders" | "novos";

/** Cores sóbrias dos chips/tags — alinhado ao visual Grok publicado. */
export const GROUP_STYLE: Record<
  StyleKey,
  { chip: string; chipOn: string; tag: string }
> = {
  labs: {
    chip: "bg-[#3d3a2e] text-[#d4c9a0]",
    chipOn: "bg-[#5c563f] text-[#f0e6c0] ring-1 ring-[#c4b87a]/40",
    tag: "bg-[#3d3a2e] text-[#d4c9a0]",
  },
  lideres: {
    chip: "bg-[#2a3548] text-[#a8c0e0]",
    chipOn: "bg-[#3a4d6a] text-[#d0e0f5] ring-1 ring-[#7a9cc8]/40",
    tag: "bg-[#2a3548] text-[#a8c0e0]",
  },
  pesquisa: {
    chip: "bg-[#243a32] text-[#a8d4b8]",
    chipOn: "bg-[#2f5444] text-[#c8ecd4] ring-1 ring-[#6ab890]/40",
    tag: "bg-[#243a32] text-[#a8d4b8]",
  },
  imprensa: {
    chip: "bg-[#3a2e2a] text-[#d4b0a0]",
    chipOn: "bg-[#543f38] text-[#f0d0c0] ring-1 ring-[#c89070]/40",
    tag: "bg-[#3a2e2a] text-[#d4b0a0]",
  },
  builders: {
    chip: "bg-[#2e3238] text-[#b0b8c4]",
    chipOn: "bg-[#404850] text-[#d8dee8] ring-1 ring-[#8890a0]/40",
    tag: "bg-[#2e3238] text-[#b0b8c4]",
  },
  novos: {
    chip: "bg-[#3a3428] text-[#d4c090]",
    chipOn: "bg-[#544a35] text-[#f0e0b0] ring-1 ring-[#c4a860]/40",
    tag: "bg-[#3a3428] text-[#d4c090]",
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
