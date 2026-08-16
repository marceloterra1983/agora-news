/** Preferências de Fontes — favoritos, pausadas, avisos e grupo por conta. */

const GROUP_KEY = "agora-fontes-groups-v1";

const STAR_KEY = "agora-fontes-starred-v1";
const DISABLED_KEY = "agora-fontes-disabled-v1";
const NOTIFY_KEY = "agora-fontes-notify-v1";

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

export function isNotifyHandle(handle: string): boolean {
  return getNotifyHandles().includes(normHandle(handle));
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

export function toggleNotifyHandle(handle: string): boolean {
  return toggleIn(NOTIFY_KEY, handle);
}

export function setNotifyHandle(handle: string, on: boolean): void {
  setIn(NOTIFY_KEY, handle, on);
}

export function getGroupOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GROUP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const handle = normHandle(k);
      if (!handle) continue;
      if (typeof v === "string" && v.trim()) out[handle] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

export function groupOverrideOf(handle: string): string | null {
  return getGroupOverrides()[normHandle(handle)] ?? null;
}

export function setGroupOverrides(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(map || {})) {
    const handle = normHandle(k);
    if (!handle || typeof v !== "string" || !v.trim()) continue;
    out[handle] = v.trim();
  }
  window.localStorage.setItem(GROUP_KEY, JSON.stringify(out));
  window.dispatchEvent(new CustomEvent("agora-fontes-prefs", { detail: { key: GROUP_KEY } }));
}

export function clearGroupOverride(handle: string): void {
  if (typeof window === "undefined") return;
  const h = normHandle(handle);
  if (!h) return;
  const next = { ...getGroupOverrides() };
  delete next[h];
  setGroupOverrides(next);
}

export function setGroupOverride(handle: string, group: string): void {
  if (typeof window === "undefined") return;
  const h = normHandle(handle);
  if (!h || !group) return;
  const next = { ...getGroupOverrides(), [h]: group };
  window.localStorage.setItem(GROUP_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("agora-fontes-prefs", { detail: { key: GROUP_KEY } }));
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
