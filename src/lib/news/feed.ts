import {
  fallbackPayload,
  wrap,
  type FeedPayload,
} from "./news-fallback";
import { profilesFor } from "./profiles";
import {
  catalogFor,
  filterStoriesForCatalog,
  type SectionCatalog,
} from "./section-catalog.mjs";
import { getSection } from "./sections";
import { serverCatalogFor } from "./server-catalog";
import { downloadSupabase } from "./supabase";
import { FEED_CLUSTER_FETCH, PAGE_SIZE } from "./page-size.mjs";
import { attachClusterChrome } from "./story-cluster.mjs";
import { accountsForQuery } from "./account-in-filter.mjs";
import {
  DEFAULT_SECTION,
  normalizeSection,
  type Category,
  type Story,
} from "./types";

export type { FeedPayload };
export { fallbackPayload };
export { filterStoriesForCatalog } from "./section-catalog.mjs";

export function filterStories(
  stories: Story[],
  category: Category,
  q?: string,
  catalog?: SectionCatalog,
): Story[] {
  const section = normalizeSection(category);
  const scoped = filterStoriesForCatalog(
    stories.filter((s) => normalizeSection(s.category) === section),
    catalog ?? catalogFor(section, { profiles: profilesFor(section) }),
  );
  const needle = q?.trim().toLowerCase();
  if (!needle) return scoped;
  return scoped.filter(
    (s) =>
      s.title.toLowerCase().includes(needle) ||
      s.excerpt.toLowerCase().includes(needle) ||
      s.body.toLowerCase().includes(needle) ||
      s.sourceLabel.toLowerCase().includes(needle) ||
      s.original.toLowerCase().includes(needle),
  );
}

const FIRST_LIMIT = FEED_CLUSTER_FETCH;

const lastGood = new Map<string, FeedPayload>();

export async function loadFeed(
  category: Category = DEFAULT_SECTION,
  catalog?: SectionCatalog,
): Promise<FeedPayload> {
  const section = getSection(category);
  const scopedCatalog = catalog ?? (await serverCatalogFor(section.slug));
  const previous = lastGood.get(section.slug);

  try {
    const stories = await downloadSupabase(section.slug, {
      limit: FIRST_LIMIT,
      accounts: accountsForQuery(scopedCatalog),
    });
    const scoped = filterStories(stories, section.slug, undefined, scopedCatalog);
    const clustered = attachClusterChrome(scoped);
    const heads = clustered.slice(0, PAGE_SIZE);
    const payload = wrap(
      heads,
      true,
      `NEWS/${section.folderName}`,
      new Date().toISOString(),
      `supabase/${section.slug}`,
    );
    payload.hasMore = scoped.length >= FEED_CLUSTER_FETCH || clustered.length > PAGE_SIZE;
    lastGood.set(section.slug, payload);
    return payload;
  } catch {
    if (previous) {
      return {
        ...previous,
        stories: filterStories(previous.stories, section.slug, undefined, scopedCatalog),
        live: false,
      };
    }
    return fallbackPayload(section.slug);
  }
}
