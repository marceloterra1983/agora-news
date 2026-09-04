import { DEFAULT_SECTION, labelFor, slugifySection, type Category } from "./types";

export type SectionDef = {
  slug: Category;
  label: string;
  folderName: string;
};

export const SECTIONS: SectionDef[] = [
  { slug: "ai", label: "IA", folderName: "AI" },
  { slug: "tech", label: "Tech", folderName: "TECH" },
  { slug: "brasil", label: "Brasil", folderName: "BRASIL" },
  { slug: "podcasts", label: "Podcasts", folderName: "PODCASTS" },
  { slug: "mercados", label: "Mercados", folderName: "MERCADOS" },
];

export function getSection(slug?: string | null): SectionDef {
  const key = slugifySection(slug || DEFAULT_SECTION);
  return SECTIONS.find((s) => s.slug === key) ?? SECTIONS[0];
}

export function listKnownSections(): Category[] {
  return SECTIONS.map((s) => s.slug);
}

export function mergeSectionList(fromFeed: Category[]): Category[] {
  const set = new Set<string>(listKnownSections());
  for (const c of fromFeed) {
    const slug = slugifySection(c);
    if (slug && slug !== "capa" && slug !== "profile" && slug !== "watch" && slug !== "cache") set.add(slug);
  }
  const known = listKnownSections();
  const extra = [...set].filter((s) => !known.includes(s));
  extra.sort((a, b) => labelFor(a).localeCompare(labelFor(b), "pt-BR"));
  return [...known, ...extra];
}
