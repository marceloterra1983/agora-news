import { DEFAULT_SECTION, normalizeSection, type Category } from "./types";

export const LAST_SECTION_KEY = "agora-last-secao";

export type SectionNav = {
  to: "/" | "/fontes";
  search: { secao: Category };
};

export function keepsSectionInUrl(pathname: string): boolean {
  return pathname === "/" || pathname === "/fontes";
}

export function sectionNavTarget(pathname: string, slug: Category): SectionNav | null {
  const secao = normalizeSection(slug);
  if (pathname === "/fontes") return { to: "/fontes", search: { secao } };
  if (pathname === "/") return { to: "/", search: { secao } };
  return null;
}

function storage(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    const ls = globalThis.localStorage;
    return ls ?? null;
  } catch {
    return null;
  }
}

export function readLastSection(): Category {
  const ls = storage();
  if (!ls) return DEFAULT_SECTION;
  return normalizeSection(ls.getItem(LAST_SECTION_KEY));
}

export function writeLastSection(slug: Category): Category {
  const next = normalizeSection(slug);
  const ls = storage();
  if (ls) {
    try {
      ls.setItem(LAST_SECTION_KEY, next);
    } catch {
      /* quota / private mode */
    }
  }
  return next;
}
