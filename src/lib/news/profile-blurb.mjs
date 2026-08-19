import { AI_PROFILES } from "./catalog-ai.mjs";
import { BRASIL_PROFILES } from "./catalog-brasil.mjs";
import { TECH_PROFILES } from "./catalog-tech.mjs";

const ALL = [...AI_PROFILES, ...TECH_PROFILES, ...BRASIL_PROFILES];

export function catalogBlurb(handle) {
  const key = String(handle || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
  if (!key) return "";
  return ALL.find((p) => p.handle.toLowerCase() === key)?.blurb || "";
}

/** Texto editorial/IA do perfil — nunca a bio crua do X se houver catálogo. */
export function displayBlurb(handle, name, fallback) {
  const catalog = catalogBlurb(handle);
  if (catalog) return catalog;
  const extra = String(fallback || "").trim();
  if (extra) return extra;
  return name
    ? `${name} é uma fonte acompanhada neste tema.`
    : "Fonte acompanhada neste tema.";
}
