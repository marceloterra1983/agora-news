import { groupOrderFor, hintOfGroup, isReservedGroup, labelOfGroup, normalizeSection } from "./catalog-taxonomy.mjs";
import { getGroupOverrides, setGroupOverrides } from "./fontes-prefs";
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

const TONE = {
  labs: { bg: "color-mix(in oklab, #8a7a2e 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #5a4e18)", pip: "#8a7a2e" },
  lideres: { bg: "color-mix(in oklab, #3d5f8a 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #2a4060)", pip: "#3d5f8a" },
  pesquisa: { bg: "color-mix(in oklab, #3d6a48 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #2a4a32)", pip: "#3d6a48" },
  imprensa: { bg: "color-mix(in oklab, #8a4a32 34%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 88%, #5a3020)", pip: "#8a4a32" },
  builders: { bg: "color-mix(in oklab, #4a4742 36%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 90%, #2e2c28)", pip: "#4a4742" },
  novos: { bg: "color-mix(in oklab, #9a7a4a 28%, var(--color-paper-2))", fg: "color-mix(in oklab, var(--color-ink) 80%, #6a5430)", pip: "#9a7a4a" },
};

const TONE_ALIAS: Record<string, keyof typeof TONE> = {
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

export const GROUP_TONE: Record<string, { bg: string; fg: string; pip: string }> = {
  ...TONE,
  ...Object.fromEntries(Object.entries(TONE_ALIAS).map(([id, key]) => [id, TONE[key]])),
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
  if (!key || isReservedGroup(key)) return loadCustomGroups(secao);
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
  const taken = new Set([...groupOrderFor(secao), ...existing.map((g) => g.id)]);
  if (taken.has(id)) id = `${id}-${existing.length + 1}`;
  replaceCustomGroups([...existing, { id, label: name }], secao);
  return { id, label: name };
}

export function allGroupIds(section?: Category): string[] {
  const secao = sectionOf(section);
  return [...groupOrderFor(secao), ...loadCustomGroups(secao).map((g) => g.id)];
}

export function groupLabel(id?: string | null, section?: Category): string {
  if (!id) return labelOfGroup("novos", section);
  if (isReservedGroup(id)) return labelOfGroup(id, section);
  return findCustomGroup(id)?.label || labelOfGroup("novos", section);
}

export function groupHint(id?: string | null, section?: Category): string {
  if (!id) return hintOfGroup("novos", section);
  if (isReservedGroup(id)) return hintOfGroup(id, section);
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

export function groupPip(id?: string | null): string {
  return groupTone(id).pip;
}

const RULES: Record<string, Array<{ group: string; words: string[] }>> = {
  ai: [
    { group: "lideres", words: ["ceo", "founder", "fundador", "fundadora", "presidente", "cofounder", "co-founder"] },
    { group: "pesquisa", words: ["professor", "pesquisador", "researcher", "scientist", "phd", "paper", "stanford", "mit"] },
    { group: "imprensa", words: ["jornal", "news", "newsletter", "reporter", "journalist", "editor", "revista", "portal"] },
    { group: "builders", words: ["engineer", "engenheiro", "developer", "dev", "maker", "builder", "coder", "open source"] },
    { group: "labs", words: ["oficial", "official", "lab", "labs", "inc", "corp", "company", "empresa"] },
  ],
  tech: [
    { group: "tech-seguranca", words: ["security", "segurança", "ciso", "malware", "breach"] },
    { group: "tech-startups", words: ["founder", "startup", "venture", "y combinator"] },
    { group: "tech-imprensa", words: ["jornal", "news", "newsletter", "reporter", "journalist", "editor"] },
    { group: "tech-devs", words: ["engineer", "engenheiro", "developer", "dev", "coder"] },
    { group: "tech-empresas", words: ["oficial", "official", "inc", "corp", "company", "empresa"] },
  ],
  brasil: [
    { group: "br-instituicoes", words: ["oficial", "ministério", "tribunal", "banco central", "ibge"] },
    { group: "br-colunistas", words: ["colunista", "comentarista"] },
    { group: "br-economia", words: ["economia", "mercado", "fiscal", "copom"] },
    { group: "br-politica", words: ["política", "brasilia", "congresso", "planalto"] },
    { group: "br-jornais", words: ["jornal", "news", "portal", "revista", "redação"] },
  ],
};

export function suggestGroup(
  input: { handle?: string; name?: string; bio?: string },
  section?: string,
): string {
  const hay = `${input.handle || ""} ${input.name || ""} ${input.bio || ""}`.toLowerCase();
  const rules = RULES[normalizeSection(section)] ?? RULES.ai;
  for (const rule of rules) {
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
