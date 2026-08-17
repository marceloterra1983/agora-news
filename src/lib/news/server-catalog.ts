import { profilesFor } from "./profiles";
import { catalogFor, type SectionCatalog } from "./section-catalog.mjs";
import type { Category } from "./types";
import { listAllWatchAccounts, type WatchAccount } from "./watch";

/** Catálogo vivo no servidor: seed da seção + watch/extras daquela seção. */
export async function serverCatalogFor(section: Category): Promise<SectionCatalog> {
  let extras: WatchAccount[] = [];
  try {
    extras = await listAllWatchAccounts();
  } catch {
    // Public feed remains available when the private watch store is absent.
  }
  return catalogFor(section, { profiles: profilesFor(section), extras });
}
