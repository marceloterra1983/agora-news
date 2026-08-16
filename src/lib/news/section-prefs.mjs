import { reservedGroupIds } from "./catalog-taxonomy.mjs";

const DEFAULT_SECTION = "ai";

export const CUSTOM_KEY = "agora-custom-groups-v1";
export const GROUP_MAP_KEY = "agora-fontes-groups-v1";

function slugifySection(name) {
  return (
    String(name || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "ai"
  );
}

function normalizeSection(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.toLowerCase() === "capa") return DEFAULT_SECTION;
  return slugifySection(raw);
}

function normHandle(h) {
  return String(h || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
}

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function readJson(key) {
  const ls = storage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  const ls = storage();
  if (!ls) return;
  ls.setItem(key, JSON.stringify(value));
}

function sanitizeCustom(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = reservedGroupIds();
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const label = String(item.label || "").trim().slice(0, 28);
    const id = String(item.id || "").trim();
    if (!label || !id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label });
  }
  return out;
}

function sanitizeGroups(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const handle = normHandle(k);
    if (!handle || typeof v !== "string" || !v.trim()) continue;
    out[handle] = v.trim();
  }
  return out;
}

/** Array legado vira só o slice de IA. */
export function migrateLegacyCustom(raw) {
  if (Array.isArray(raw)) return { [DEFAULT_SECTION]: sanitizeCustom(raw) };
  if (!raw || typeof raw !== "object") return {};
  const source = raw.bySection && typeof raw.bySection === "object" ? raw.bySection : raw;
  const out = {};
  for (const [k, v] of Object.entries(source)) {
    if (k === "bySection") continue;
    if (Array.isArray(v)) out[normalizeSection(k)] = sanitizeCustom(v);
  }
  return out;
}

/** Mapa plano legado vira só o slice de IA. */
export function migrateLegacyGroups(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  if (raw.bySection && typeof raw.bySection === "object") {
    const out = {};
    for (const [k, v] of Object.entries(raw.bySection)) {
      out[normalizeSection(k)] = sanitizeGroups(v);
    }
    return out;
  }
  const values = Object.values(raw);
  if (values.length && values.every((v) => typeof v === "string")) {
    return { [DEFAULT_SECTION]: sanitizeGroups(raw) };
  }
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v && typeof v === "object" && !Array.isArray(v)) out[normalizeSection(k)] = sanitizeGroups(v);
  }
  return out;
}

export function readCustomGroups(section) {
  return migrateLegacyCustom(readJson(CUSTOM_KEY))[normalizeSection(section)] ?? [];
}

export function writeCustomGroups(section, list) {
  const all = migrateLegacyCustom(readJson(CUSTOM_KEY));
  const slug = normalizeSection(section);
  const clean = sanitizeCustom(list);
  all[slug] = clean;
  writeJson(CUSTOM_KEY, { bySection: all });
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("agora-custom-groups"));
  return clean;
}

export function readGroupOverrides(section) {
  return migrateLegacyGroups(readJson(GROUP_MAP_KEY))[normalizeSection(section)] ?? {};
}

export function writeGroupOverrides(section, map) {
  const all = migrateLegacyGroups(readJson(GROUP_MAP_KEY));
  all[normalizeSection(section)] = sanitizeGroups(map);
  writeJson(GROUP_MAP_KEY, { bySection: all });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("agora-fontes-prefs", { detail: { key: GROUP_MAP_KEY } }));
  }
}

export function findCustomGroup(id) {
  const all = migrateLegacyCustom(readJson(CUSTOM_KEY));
  for (const list of Object.values(all)) {
    const hit = list.find((g) => g.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export function snapshotBySection() {
  const custom = migrateLegacyCustom(readJson(CUSTOM_KEY));
  const groups = migrateLegacyGroups(readJson(GROUP_MAP_KEY));
  const keys = new Set([...Object.keys(custom), ...Object.keys(groups), "ai", "tech", "brasil"]);
  const out = {};
  for (const key of keys) {
    const slug = normalizeSection(key);
    out[slug] = { groups: groups[slug] ?? {}, customGroups: custom[slug] ?? [] };
  }
  return out;
}

export function applyBySection(bySection) {
  for (const [key, slice] of Object.entries(bySection || {})) {
    if (!slice) continue;
    if (slice.groups) writeGroupOverrides(key, slice.groups);
    if (Array.isArray(slice.customGroups)) writeCustomGroups(key, slice.customGroups);
  }
}
