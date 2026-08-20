/** Preferências de Fontes — favoritos, pausadas, avisos e grupo por conta. */

import { readGroupOverrides, writeGroupOverrides } from "./section-prefs.mjs";
import { readLastSection } from "./section-pref";
import { profileByHandle } from "./profiles";
import type { Category } from "./types";

const GROUP_KEY = "agora-fontes-groups-v1";
void GROUP_KEY;

function sectionOf(section?: Category): Category {
  return section || (typeof window === "undefined" ? "ai" : readLastSection());
}

const STAR_KEY = "agora-fontes-starred-v1";
const DISABLED_KEY = "agora-fontes-disabled-v1";
const NOTIFY_KEY = "agora-fontes-notify-v1";
const DIRTY_KEY = "agora-fontes-prefs-dirty-v1";
const REV_KEY = "agora-fontes-rev-v1";

export type FontesRev = {
  starred?: string;
  disabled?: string;
  notify?: string;
  groups?: string;
};

const REV_FIELDS = ["starred", "disabled", "notify", "groups"] as const;

export function getFontesRev(): FontesRev {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(REV_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: FontesRev = {};
    for (const field of REV_FIELDS) {
      const value = (parsed as Record<string, unknown>)[field];
      if (typeof value === "string" && Number.isFinite(Date.parse(value))) out[field] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function setFontesRev(rev: FontesRev): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REV_KEY, JSON.stringify(rev || {}));
  } catch {
    /* quota */
  }
}

function bumpFontesRev(field: keyof FontesRev): void {
  setFontesRev({ ...getFontesRev(), [field]: new Date().toISOString() });
}

function revFieldForKey(key: string): keyof FontesRev | null {
  if (key === STAR_KEY) return "starred";
  if (key === DISABLED_KEY) return "disabled";
  if (key === NOTIFY_KEY) return "notify";
  return null;
}

export function isFontesPrefsDirty(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DIRTY_KEY) === "1";
  } catch {
    return false;
  }
}

function markFontesPrefsDirty(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DIRTY_KEY, "1");
  } catch {
    /* quota */
  }
}

export function clearFontesPrefsDirty(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DIRTY_KEY);
  } catch {
    /* ignore */
  }
}

export function normHandle(h: string): string {
  return String(h || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
}

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return [...new Set(arr.map((x) => normHandle(String(x))).filter(Boolean))];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  if (typeof window === "undefined") return;
  const clean = [...new Set(list.map(normHandle).filter(Boolean))];
  window.localStorage.setItem(key, JSON.stringify(clean));
  const field = revFieldForKey(key);
  if (field) bumpFontesRev(field);
  markFontesPrefsDirty();
  window.dispatchEvent(new CustomEvent("agora-fontes-prefs", { detail: { key, list: clean } }));
}

function toggleIn(key: string, handle: string): boolean {
  const h = normHandle(handle);
  if (!h) return false;
  const set = new Set(readList(key));
  if (set.has(h)) set.delete(h);
  else set.add(h);
  writeList(key, [...set]);
  return set.has(h);
}

function setIn(key: string, handle: string, on: boolean) {
  const h = normHandle(handle);
  if (!h) return;
  const set = new Set(readList(key));
  if (on) set.add(h);
  else set.delete(h);
  writeList(key, [...set]);
}

export function getStarred(): string[] {
  return readList(STAR_KEY);
}

export function getDisabled(): string[] {
  return readList(DISABLED_KEY);
}

export function getNotifyHandles(): string[] {
  return readList(NOTIFY_KEY);
}

export function isStarred(handle: string): boolean {
  return getStarred().includes(normHandle(handle));
}

export function isDisabled(handle: string): boolean {
  return getDisabled().includes(normHandle(handle));
}

export function toggleStar(handle: string): boolean {
  return toggleIn(STAR_KEY, handle);
}

export function setStarred(handle: string, on: boolean): void {
  setIn(STAR_KEY, handle, on);
}

export function toggleDisabled(handle: string): boolean {
  return toggleIn(DISABLED_KEY, handle);
}

export function setDisabled(handle: string, on: boolean): void {
  setIn(DISABLED_KEY, handle, on);
}

export function setNotifyHandle(handle: string, on: boolean): void {
  setIn(NOTIFY_KEY, handle, on);
}

export function getGroupOverrides(section?: Category): Record<string, string> {
  if (typeof window === "undefined") return {};
  return readGroupOverrides(sectionOf(section));
}

export function groupOverrideOf(handle: string, section?: Category): string | null {
  return getGroupOverrides(section)[normHandle(handle)] ?? null;
}

export function groupOf(handle?: string | null, section?: Category): string {
  if (!handle) return "novos";
  return groupOverrideOf(handle, section) ?? profileByHandle(handle)?.group ?? "novos";
}

export function setGroupOverrides(
  map: Record<string, string>,
  section?: Category,
  emit = true,
): void {
  if (typeof window === "undefined") return;
  if (emit) {
    bumpFontesRev("groups");
    markFontesPrefsDirty();
  }
  writeGroupOverrides(sectionOf(section), map || {}, emit);
}

export function clearGroupOverride(handle: string, section?: Category): void {
  if (typeof window === "undefined") return;
  const h = normHandle(handle);
  if (!h) return;
  const secao = sectionOf(section);
  const next = { ...getGroupOverrides(secao) };
  delete next[h];
  setGroupOverrides(next, secao);
}

export function setGroupOverride(handle: string, group: string, section?: Category): void {
  if (typeof window === "undefined") return;
  const h = normHandle(handle);
  if (!h || !group) return;
  const secao = sectionOf(section);
  setGroupOverrides({ ...getGroupOverrides(secao), [h]: group }, secao);
}

export function filterStoriesByPrefs<T extends { source?: string; sourceLabel?: string; account?: string }>(
  stories: T[],
): T[] {
  const disabled = new Set(getDisabled());
  if (!disabled.size) return stories;
  return stories.filter((s) => {
    const h = normHandle(s.source || s.account || s.sourceLabel || "");
    return !h || !disabled.has(h);
  });
}

export function sortSourcesByStar<T extends { handle?: string; source?: string }>(items: T[]): T[] {
  const starred = new Set(getStarred());
  return [...items].sort((a, b) => {
    const ha = normHandle(a.handle || a.source || "");
    const hb = normHandle(b.handle || b.source || "");
    const sa = starred.has(ha) ? 0 : 1;
    const sb = starred.has(hb) ? 0 : 1;
    return sa - sb;
  });
}
