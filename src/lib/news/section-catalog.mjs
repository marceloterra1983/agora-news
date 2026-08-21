import { extrasForSection } from "./watch-section.mjs";
import { groupOrderFor, labelOfGroup, reservedGroupIds } from "./catalog-taxonomy.mjs";

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
  if (!raw || raw.toLowerCase() === "capa") return "ai";
  return slugifySection(raw);
}

function norm(h) {
  return String(h || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
}

/** Catálogo de um tema: fontes, extras e grupos com membro. */
export function catalogFor(section, input = {}) {
  const slug = normalizeSection(section);
  const profiles = (input.profiles ?? []).filter((p) => String(p.section || "") === slug);
  const extras = extrasForSection(input.extras ?? [], slug);
  const overrides = input.overrides ?? {};
  const customGroups = input.customGroups ?? [];
  const members = [];
  const seen = new Set();

  for (const p of profiles) {
    const handle = norm(p.handle);
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    members.push({ handle, group: overrides[handle] || p.group });
  }
  for (const extra of extras) {
    const handle = norm(extra.handle);
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    members.push({ handle, group: overrides[handle] || extra.group || "novos" });
  }

  const present = new Set(members.map((m) => m.group));
  const reserved = reservedGroupIds();
  const groupIds = [
    ...groupOrderFor(slug).filter((id) => present.has(id)),
    ...customGroups.map((g) => g.id).filter((id) => id && present.has(id) && !reserved.has(id)),
  ];

  return {
    section: slug,
    profiles,
    extras,
    members,
    handles: members.map((m) => m.handle),
    groupIds,
    groups: groupIds.map((id) => ({ id, label: labelOfGroup(id, slug) })),
  };
}

/** Contas do grupo já com override. `all` devolve o catálogo inteiro. */
export function handlesForGroup(catalog, group) {
  const wanted = String(group || "").trim();
  const members = Array.isArray(catalog?.members) ? catalog.members : [];
  if (!wanted || wanted === "all") return catalog?.handles ?? members.map((m) => m.handle);
  return members.filter((m) => m.group === wanted).map((m) => m.handle);
}

export function handleInCatalog(handle, catalog) {
  return catalog.handles.includes(norm(handle));
}

/** Seção do handle no catálogo (seed + extras). Vazio = fora de qualquer tema. */
export function sectionOfHandle(handle, input = {}) {
  const key = norm(handle);
  if (!key) return "";
  for (const row of [...(input.profiles ?? []), ...(input.extras ?? [])]) {
    if (norm(row.handle) !== key) continue;
    const sec = String(row.section || "").trim();
    if (sec && sec.toLowerCase() !== "capa") return slugifySection(sec);
  }
  return "";
}

/** Feed da seção: só contas do catálogo, case-insensitive e sem @. */
export function filterStoriesForCatalog(stories, catalog) {
  if (!catalog || !Array.isArray(stories)) return [];
  return stories.filter((story) =>
    handleInCatalog(story?.source || story?.account || story?.sourceLabel, catalog),
  );
}
