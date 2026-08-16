import { profilesFor } from "./profiles";
import { catalogFor, type SectionCatalog } from "./section-catalog.mjs";
import type { Category } from "./types";
import { listWatchAccounts } from "./watch";

/** Catálogo vivo no servidor: seed da seção + watch/extras daquela seção. */
export async function serverCatalogFor(section: Category): Promise<SectionCatalog> {
  const extras = await listWatchAccounts();
  return catalogFor(section, { profiles: profilesFor(section), extras });
}
