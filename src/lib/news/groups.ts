import { getGroupOverrides, setGroupOverrides } from "./fontes-prefs";
import { GROUP_HINTS, GROUP_LABELS, GROUP_ORDER, type ProfileGroup } from "./profiles";
import { findCustomGroup, readCustomGroups, writeCustomGroups } from "./section-prefs.mjs";
import { readLastSection } from "./section-pref";
import type { Category } from "./types";

export type CustomGroup = { id: string; label: string };

const CUSTOM_KEY = "agora-custom-groups-v1";
const EVENT = "agora-custom-groups";
void CUSTOM_KEY;

function sectionOf(section?: Category): Category {
  return section || (typeof window === "undefined" ? "ai" : readLastSection());
}

const SOFT = [
  { bg: "color-mix(in oklab, #8a7a2e 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #5a4e18)", pip: "#8a7a2e" },
  { bg: "color-mix(in oklab, #3d5f8a 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #2a4060)", pip: "#3d5f8a" },
  { bg: "color-mix(in oklab, #3d6a48 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #2a4a32)", pip: "#3d6a48" },
  { bg: "color-mix(in oklab, #8a4a32 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #5a3020)", pip: "#8a4a32" },
  { bg: "color-mix(in oklab, #5a3d72 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #3c2850)", pip: "#5a3d72" },
];

export const GROUP_TONE: Record<string, { bg: string; fg: string; pip: string }> = {
  labs: { bg: "color-mix(in oklab, #8a7a2e 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #5a4e18)", pip: "#8a7a2e" },
  lideres: { bg: "color-mix(in oklab, #3d5f8a 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #2a4060)", pip: "#3d5f8a" },
  pesquisa: { bg: "color-mix(in oklab, #3d6a48 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #2a4a32)", pip: "#3d6a48" },
  imprensa: { bg: "color-mix(in oklab, #8a4a32 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #5a3020)", pip: "#8a4a32" },
  builders: { bg: "color-mix(in oklab, #4a4742 36%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 90%, #2e2c28)", pip: "#4a4742" },
  novos: { bg: "color-mix(in oklab, #9a7a4a 28%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 80%, #6a5430)", pip: "#9a7a4a" },
};

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || `g-${Date.now().toString(36)}`;
}

export function loadCustomGroups(section?: Category): CustomGroup[] {
  if (typeof window === "undefined") return [];
  return readCustomGroups(sectionOf(section));
}

export function replaceCustomGroups(list: CustomGroup[], section?: Category): CustomGroup[] {
  if (typeof window === "undefined") return [];
  return writeCustomGroups(sectionOf(section), list || []);
}

export function removeCustomGroup(id: string, section?: Category): CustomGroup[] {
  const key = String(id || "").trim();
  const secao = sectionOf(section);
  if (!key || GROUP_ORDER.includes(key as ProfileGroup)) return loadCustomGroups(secao);
  const next = replaceCustomGroups(
    loadCustomGroups(secao).filter((g) => g.id !== key),
    secao,
  );
  const cleaned: Record<string, string> = {};
  for (const [handle, group] of Object.entries(getGroupOverrides(secao))) {
    if (group !== key) cleaned[handle] = group;
  }
  setGroupOverrides(cleaned, secao);
  return next;
}

export function addCustomGroup(label: string, section?: Category): CustomGroup | null {
  const name = label.trim().slice(0, 28);
  if (!name) return null;
  const secao = sectionOf(section);
  let id = slugify(name);
  const existing = loadCustomGroups(secao);
  const taken = new Set([...GROUP_ORDER, ...existing.map((g) => g.id)]);
  if (taken.has(id)) id = `${id}-${existing.length + 1}`;
  replaceCustomGroups([...existing, { id, label: name }], secao);
  return { id, label: name };
}

export function allGroupIds(section?: Category): string[] {
  return [...GROUP_ORDER, ...loadCustomGroups(section).map((g) => g.id)];
}

export function groupLabel(id?: string | null): string {
  if (!id) return GROUP_LABELS.novos;
  if (id in GROUP_LABELS) return GROUP_LABELS[id as ProfileGroup];
  return findCustomGroup(id)?.label || GROUP_LABELS.novos;
}

export function groupHint(id?: string | null): string {
  if (!id) return GROUP_HINTS.novos;
  if (id in GROUP_HINTS) return GROUP_HINTS[id as ProfileGroup];
  return "Grupo criado por você.";
}

export function groupTone(id?: string | null): { bg: string; fg: string; pip: string } {
  if (id && GROUP_TONE[id]) return GROUP_TONE[id];
  const customs = loadCustomGroups();
  const i = Math.max(0, customs.findIndex((g) => g.id === id));
  return SOFT[i % SOFT.length];
}

export function groupStyle(id?: string | null): { background: string; color: string } {
  const t = groupTone(id);
  return { background: t.bg, color: t.fg };
}

export function groupChipStyle(id?: string | null, on = false): {
  background: string;
  color: string;
  boxShadow?: string;
} {
  const t = groupTone(id);
  if (on) {
    return {
      background: t.pip,
      color: "#f4efe4",
      boxShadow: `inset 0 0 0 1px color-mix(in oklab, #000 22%, ${t.pip})`,
    };
  }
  return { background: t.bg, color: t.fg };
}

export function groupPip(id?: string | null): string {
  return groupTone(id).pip;
}

const RULES: Array<{ group: ProfileGroup; words: string[] }> = [
  { group: "lideres", words: ["ceo", "founder", "fundador", "fundadora", "presidente", "cofounder", "co-founder"] },
  { group: "pesquisa", words: ["professor", "pesquisador", "researcher", "scientist", "phd", "paper", "stanford", "mit"] },
  { group: "imprensa", words: ["jornal", "news", "newsletter", "reporter", "journalist", "editor", "revista", "portal"] },
  { group: "builders", words: ["engineer", "engenheiro", "developer", "dev", "maker", "builder", "coder", "open source"] },
  { group: "labs", words: ["oficial", "official", "lab", "labs", "inc", "corp", "company", "empresa"] },
];

export function suggestGroup(input: { handle?: string; name?: string; bio?: string }): ProfileGroup {
  const hay = `${input.handle || ""} ${input.name || ""} ${input.bio || ""}`.toLowerCase();
  for (const rule of RULES) {
    if (rule.words.some((w) => hay.includes(w))) return rule.group;
  }
  return "novos";
}

export function onCustomGroups(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => fn();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
