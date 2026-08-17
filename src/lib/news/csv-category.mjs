import { AI_PROFILES } from "./catalog-ai.mjs";
import { BRASIL_PROFILES } from "./catalog-brasil.mjs";
import { TECH_PROFILES } from "./catalog-tech.mjs";
import { sectionOfHandle } from "./section-catalog.mjs";

const SEED = [...AI_PROFILES, ...TECH_PROFILES, ...BRASIL_PROFILES];

/** Categoria da linha CSV: catálogo do handle, nunca um default silencioso para IA. */
export function categoryForCsvRow(source, rawCategory, input = { profiles: SEED }) {
  const fromCol = String(rawCategory || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const col = fromCol && fromCol !== "capa" ? fromCol : "";
  const fromCatalog = sectionOfHandle(source, input);
  if (col === "ai" && fromCatalog !== "ai") return fromCatalog;
  return col || fromCatalog;
}
