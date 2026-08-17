import { AI_PROFILES } from "./catalog-ai.mjs";
import { BRASIL_PROFILES } from "./catalog-brasil.mjs";
import { TECH_PROFILES } from "./catalog-tech.mjs";
import { DEFAULT_SECTION, type Category } from "./types";

export type ProfileGroup = string;

export type XProfile = {
  handle: string;
  name: string;
  group: ProfileGroup;
  section: Category;
  blurb: string;
};

const ALL: XProfile[] = [...AI_PROFILES, ...TECH_PROFILES, ...BRASIL_PROFILES];

export function allProfiles(): XProfile[] {
  return ALL;
}

export function profilesFor(section?: Category | null): XProfile[] {
  const slug = section || DEFAULT_SECTION;
  return ALL.filter((p) => p.section === slug);
}

export function profileByHandle(handle: string): XProfile | undefined {
  const key = handle.replace(/^@+/, "").trim().toLowerCase();
  return ALL.find((p) => p.handle.toLowerCase() === key);
}

export function blurbFor(handle: string, fallbackName?: string): string {
  const hit = profileByHandle(handle);
  if (hit) return hit.blurb;
  return fallbackName
    ? `${fallbackName} é uma fonte acompanhada no feed de IA.`
    : "Fonte acompanhada no feed de IA.";
}

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^@+/, "")
    .trim();
}

function subseq(q: string, text: string): boolean {
  let i = 0;
  for (const ch of text) {
    if (ch === q[i]) i += 1;
    if (i === q.length) return true;
  }
  return false;
}

function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cur = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = cur;
    }
  }
  return row[b.length];
}

export function matchProfiles(
  raw: string,
  limit = 8,
  section?: Category | null,
): Array<XProfile & { score: number }> {
  const q = fold(raw);
  if (q.length < 1) return [];
  const pool = section ? ALL.filter((p) => p.section === section) : ALL;
  const scored = pool.map((p) => {
    const h = fold(p.handle);
    const n = fold(p.name);
    const words = n.split(/[\s._-]+/).filter(Boolean);
    let score = 0;
    if (h === q || n === q) score = 100;
    else if (h.startsWith(q)) score = 92;
    else if (n.startsWith(q) || words.some((w) => w.startsWith(q))) score = 88;
    else if (h.includes(q)) score = 74;
    else if (n.includes(q)) score = 68;
    else if (q.length >= 3 && (distance(q, h) <= 2 || words.some((w) => distance(q, w) <= 1)))
      score = 46;
    else if (q.length >= 2 && (subseq(q, h) || subseq(q, n))) score = 32;
    return { ...p, score };
  })
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "pt"));
  return scored.slice(0, limit);
}
