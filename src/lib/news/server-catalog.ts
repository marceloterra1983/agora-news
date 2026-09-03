import { readUserPrefs } from "./prefs-store.server";
import { profilesFor } from "./profiles";
import { rssExtrasFor } from "./rss-catalog.mjs";
import { youtubeExtrasFor } from "./youtube-catalog.mjs";
import { catalogFor, type SectionCatalog } from "./section-catalog.mjs";
import type { Category } from "./types";
import { listUserWatchAccounts, type WatchAccount } from "./watch";

/** Catálogo vivo: perfis públicos + watches + RSS do usuário verificado, se houver. */
export async function serverCatalogFor(
  section: Category,
  userId?: string,
): Promise<SectionCatalog> {
  let extras: WatchAccount[] = [];
  let ownedRss: Array<{ url: string; title: string; section: string; group?: string; account?: string }> = [];
  if (userId) {
    try {
      extras = await listUserWatchAccounts(userId);
    } catch {
      // A private-store outage must not broaden the catalog.
    }
    try {
      ownedRss = (await readUserPrefs(userId))?.rssFeeds ?? [];
    } catch {
      ownedRss = [];
    }
  }
  return catalogFor(section, {
    profiles: profilesFor(section),
    extras: [
      ...extras,
      ...rssExtrasFor(section, ownedRss).map((row) => ({
        handle: row.handle,
        name: row.name,
        avatar: null,
        summary: "",
        followers: 0,
        section: row.section,
        group: row.group,
      })),
      ...youtubeExtrasFor(section).map((row) => ({
        handle: row.handle,
        name: row.name,
        avatar: null,
        summary: row.blurb || "",
        followers: 0,
        section: row.section,
        group: row.group,
      })),
    ],
  });
}
