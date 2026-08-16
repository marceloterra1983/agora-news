import type { ProfileGroup } from "./profiles";

/** Cores sóbrias dos chips/tags — alinhado ao visual Grok publicado. */
export const GROUP_STYLE: Record<
  ProfileGroup,
  { chip: string; chipOn: string; dot: string; tag: string }
> = {
  labs: {
    chip: "bg-[#3d3a2e] text-[#d4c9a0]",
    chipOn: "bg-[#5c563f] text-[#f0e6c0] ring-1 ring-[#c4b87a]/40",
    dot: "bg-[#c4b87a]",
    tag: "bg-[#3d3a2e] text-[#d4c9a0]",
  },
  lideres: {
    chip: "bg-[#2a3548] text-[#a8c0e0]",
    chipOn: "bg-[#3a4d6a] text-[#d0e0f5] ring-1 ring-[#7a9cc8]/40",
    dot: "bg-[#6a9fd8]",
    tag: "bg-[#2a3548] text-[#a8c0e0]",
  },
  pesquisa: {
    chip: "bg-[#243a32] text-[#a8d4b8]",
    chipOn: "bg-[#2f5444] text-[#c8ecd4] ring-1 ring-[#6ab890]/40",
    dot: "bg-[#5cbc8a]",
    tag: "bg-[#243a32] text-[#a8d4b8]",
  },
  imprensa: {
    chip: "bg-[#3a2e2a] text-[#d4b0a0]",
    chipOn: "bg-[#543f38] text-[#f0d0c0] ring-1 ring-[#c89070]/40",
    dot: "bg-[#c87858]",
    tag: "bg-[#3a2e2a] text-[#d4b0a0]",
  },
  builders: {
    chip: "bg-[#2e3238] text-[#b0b8c4]",
    chipOn: "bg-[#404850] text-[#d8dee8] ring-1 ring-[#8890a0]/40",
    dot: "bg-[#8890a0]",
    tag: "bg-[#2e3238] text-[#b0b8c4]",
  },
  novos: {
    chip: "bg-[#3a3428] text-[#d4c090]",
    chipOn: "bg-[#544a35] text-[#f0e0b0] ring-1 ring-[#c4a860]/40",
    dot: "bg-[#c4a860]",
    tag: "bg-[#3a3428] text-[#d4c090]",
  },
};

export function groupStyle(id: ProfileGroup) {
  return GROUP_STYLE[id] ?? GROUP_STYLE.novos;
}
