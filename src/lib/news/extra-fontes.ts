import { suggestGroup } from "./groups";
import { setGroupOverride } from "./fontes-prefs";
import type { InfluenceRow } from "./influence";
import { lastPostHref } from "./last-post";
import { readLastSection } from "./section-pref";
import type { Category } from "./types";

const KEY = "agora-extra-fontes-v1";

export type ExtraFonte = {
  handle: string;
  name: string;
  avatar: string | null;
  verified: boolean;
  followers: number;
  summary: string;
  section: Category;
  lastPost: { id: string; title: string; publishedAt: string } | null;
};

function norm(h: string): string {
  return String(h || "")
    .replace(/^@+/, "")
    .trim();
}

export function extraAvatarFor(handle: string): string | null {
  const key = String(handle || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  return loadExtraFontes().find((e) => e.handle.toLowerCase() === key)?.avatar || null;
}

export function loadExtraFontes(): ExtraFonte[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const out: ExtraFonte[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const handle = norm(String((item as ExtraFonte).handle || ""));
      if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) continue;
      const key = handle.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const row = item as ExtraFonte;
      out.push({
        handle,
        name: String(row.name || handle),
        avatar: row.avatar || null,
        verified: Boolean(row.verified),
        followers: Number(row.followers) || 0,
        summary: String(row.summary || ""),
        section: String(row.section || ""),
        lastPost: row.lastPost?.id
          ? {
              id: String(row.lastPost.id),
              title: String(row.lastPost.title || ""),
              publishedAt: String(row.lastPost.publishedAt || ""),
            }
          : null,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function pushWatch(row: ExtraFonte) {
  if (typeof window === "undefined") return;
  void fetch("/api/watch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      handle: row.handle,
      name: row.name,
      avatar: row.avatar,
      summary: row.summary,
      followers: row.followers,
      lastPost: row.lastPost,
      section: row.section,
    }),
  }).catch(() => {});
}

function dropWatch(handle: string, section?: string) {
  if (typeof window === "undefined") return;
  const theme = String(section || "").trim();
  const qs = new URLSearchParams({ handle: norm(handle) });
  if (theme) qs.set("section", theme);
  void fetch(`/api/watch?${qs}`, {
    method: "DELETE",
  }).catch(() => {});
}

function write(list: ExtraFonte[]): ExtraFonte[] {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("agora-extra-fontes"));
  return list;
}

/** Substitui a lista local — `[]` limpa o aparelho (pull da nuvem). */
export function replaceExtraFontes(list: ExtraFonte[]): ExtraFonte[] {
  return write(Array.isArray(list) ? list : []);
}

export function addExtraFonteFromProfile(
  result: {
    handle: string;
    name: string;
    avatar: string | null;
    verified: boolean;
    followers: number;
    lastPost: { id: string; text: string; publishedAt: string } | null;
  },
  summary: string,
  section?: Category,
): ExtraFonte[] {
  return addExtraFonte({
    handle: result.handle,
    name: result.name,
    avatar: result.avatar,
    verified: result.verified,
    followers: result.followers,
    section: section || readLastSection(),
    summary,
    lastPost: result.lastPost
      ? {
          id: result.lastPost.id,
          title: result.lastPost.text,
          publishedAt: result.lastPost.publishedAt,
        }
      : null,
  });
}

export function addExtraFonte(row: ExtraFonte): ExtraFonte[] {
  const handle = norm(row.handle);
  if (!handle) return loadExtraFontes();
  const next = [
    { ...row, handle },
    ...loadExtraFontes().filter((x) => x.handle.toLowerCase() !== handle.toLowerCase()),
  ];
  pushWatch(next[0]);
  const group = suggestGroup({ handle, name: next[0].name, bio: next[0].summary }, next[0].section);
  if (group !== "novos") setGroupOverride(handle, group, next[0].section);
  return write(next);
}

export function removeExtraFonte(handle: string): ExtraFonte[] {
  const key = norm(handle).toLowerCase();
  const current = loadExtraFontes();
  const hit = current.find((x) => x.handle.toLowerCase() === key);
  dropWatch(handle, hit?.section);
  return write(current.filter((x) => x.handle.toLowerCase() !== key));
}

export function syncExtraFontes() {
  if (typeof window === "undefined") return;
  for (const row of loadExtraFontes()) pushWatch(row);
}

export function extraFonteToRow(e: ExtraFonte): InfluenceRow {
  return {
    handle: e.handle,
    name: e.name,
    group: "novos",
    followers: e.followers,
    verified: e.verified,
    avatar: e.avatar,
    bio: e.summary || null,
    lastPost: e.lastPost
      ? { ...e.lastPost, href: lastPostHref(e.handle, e.lastPost.id, false) }
      : null,
    lastPosts: e.lastPost
      ? [{ ...e.lastPost, href: lastPostHref(e.handle, e.lastPost.id, false) }]
      : [],
    inFeed: 0,
    articles: 0,
    longform: 0,
    likes: 0,
    engagement: 0,
    views: 0,
    er: 0,
  };
}
