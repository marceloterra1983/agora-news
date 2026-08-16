import { extrasForSection } from "./watch-section.mjs";

const GROUP_ORDER = ["labs", "lideres", "pesquisa", "imprensa", "builders", "novos"];
const GROUP_LABELS = {
  labs: "Empresas",
  lideres: "CEOs",
  pesquisa: "Cientistas",
  imprensa: "Imprensa",
  builders: "Devs",
  novos: "Outros",
};

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

function labelOf(id, custom) {
  if (id in GROUP_LABELS) return GROUP_LABELS[id];
  return custom.find((g) => g.id === id)?.label || id;
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
  const reserved = new Set(GROUP_ORDER);
  const groupIds = [
    ...GROUP_ORDER.filter((id) => present.has(id)),
    ...customGroups.map((g) => g.id).filter((id) => id && present.has(id) && !reserved.has(id)),
  ];

  return {
    section: slug,
    profiles,
    extras,
    handles: members.map((m) => m.handle),
    groupIds,
    groups: groupIds.map((id) => ({ id, label: labelOf(id, customGroups) })),
  };
}

export function handleInCatalog(handle, catalog) {
  return catalog.handles.includes(norm(handle));
}

export function chipGroupIds(catalog) {
  return catalog.groupIds;
}
