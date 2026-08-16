import { Clock, Layers, Star, Users } from "lucide-react";
import { extraFonteToRow, type ExtraFonte } from "./extra-fontes";
import type { InfluenceRow } from "./influence";
import { normHandle } from "./fontes-prefs";
import { GROUP_HINTS, GROUP_LABELS, GROUP_ORDER, profilesFor, type ProfileGroup } from "./profiles";
import type { Category } from "./types";

export type SortKey = "recent" | "followers" | "groups" | "starred";

export const FONTES_SORT_KEY = "agora-fontes-sort";

export const FONTES_SORTS: { id: SortKey; label: string; icon: typeof Clock }[] = [
  { id: "recent", label: "Recente", icon: Clock },
  { id: "followers", label: "Seguidores", icon: Users },
  { id: "groups", label: "Grupos", icon: Layers },
  { id: "starred", label: "Fav", icon: Star },
];

export function readStoredSort(): SortKey {
  if (typeof window === "undefined") return "recent";
  try {
    const v = localStorage.getItem(FONTES_SORT_KEY);
    if (v === "recent" || v === "followers" || v === "groups" || v === "starred") return v;
  } catch {
    /* ignore */
  }
  return "recent";
}

export function byRecent(a: InfluenceRow, b: InfluenceRow): number {
  const ta = a.lastPost ? Date.parse(a.lastPost.publishedAt) : 0;
  const tb = b.lastPost ? Date.parse(b.lastPost.publishedAt) : 0;
  return tb - ta || a.name.localeCompare(b.name, "pt");
}

export function emptyFonteRow(p: ReturnType<typeof profilesFor>[number]): InfluenceRow {
  return {
    handle: p.handle,
    name: p.name,
    group: p.group,
    followers: 0,
    following: 0,
    tweets: 0,
    verified: false,
    avatar: null,
    bio: null,
    lastPost: null,
    inFeed: 0,
    articles: 0,
    longform: 0,
    likes: 0,
    engagement: 0,
    views: 0,
    er: 0,
    score: 0,
  };
}

export function seedFontes(secao: Category): InfluenceRow[] {
  return profilesFor(secao).map(emptyFonteRow);
}

export function mergeExtraFontes(base: InfluenceRow[], extras: ExtraFonte[]): InfluenceRow[] {
  const seen = new Set(base.map((r) => r.handle.toLowerCase()));
  const added = extras.filter((e) => !seen.has(e.handle.toLowerCase())).map(extraFonteToRow);
  return [...added, ...base];
}

export function sortFontesRows(
  rows: InfluenceRow[],
  sort: SortKey,
  starred: string[],
): InfluenceRow[] {
  const fav = new Set(starred);
  const list = sort === "starred" ? rows.filter((r) => fav.has(normHandle(r.handle))) : rows;
  return [...list].sort((a, b) => {
    if (sort === "followers") return (b.followers || 0) - (a.followers || 0) || byRecent(a, b);
    return byRecent(a, b);
  });
}

export type FonteGroup = {
  id: ProfileGroup;
  label: string;
  hint: string;
  items: InfluenceRow[];
  latest: string | null;
  faces: InfluenceRow[];
  preview: string;
};

export function groupFontesRows(rows: InfluenceRow[]): FonteGroup[] {
  return GROUP_ORDER.map((id) => {
    const items = rows.filter((r) => r.group === id).sort(byRecent);
    const latest = items.find((r) => r.lastPost)?.lastPost?.publishedAt ?? null;
    const known = [...items].sort((a, b) => (b.followers || 0) - (a.followers || 0));
    return {
      id,
      label: GROUP_LABELS[id],
      hint: GROUP_HINTS[id],
      items,
      latest,
      faces: known.filter((r) => r.avatar).slice(0, 3),
      preview: known
        .slice(0, 3)
        .map((r) => r.name)
        .join(" · "),
    };
  })
    .filter((g) => g.items.length)
    .sort((a, b) => {
      const ta = a.latest ? Date.parse(a.latest) : 0;
      const tb = b.latest ? Date.parse(b.latest) : 0;
      return tb - ta;
    });
}
