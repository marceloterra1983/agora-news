import { profilesFor } from "./profiles";
import { catalogFor, type SectionCatalog } from "./section-catalog.mjs";
import type { Category } from "./types";
import { listUserWatchAccounts, type WatchAccount } from "./watch";

/** Catálogo vivo: perfis públicos + watches do usuário verificado, se houver. */
export async function serverCatalogFor(
  section: Category,
  userId?: string,
): Promise<SectionCatalog> {
  let extras: WatchAccount[] = [];
  if (userId) {
    try {
      extras = await listUserWatchAccounts(userId);
    } catch {
      // A private-store outage must not broaden the catalog.
    }
  }
  return catalogFor(section, { profiles: profilesFor(section), extras });
}
