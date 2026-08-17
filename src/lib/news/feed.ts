import fallbackCsv from "./agora-feed.csv?raw";
import { storiesFromCsv } from "./csv";
import { profilesFor } from "./profiles";
import {
  catalogFor,
  filterStoriesForCatalog,
  type SectionCatalog,
} from "./section-catalog.mjs";
import { getSection, mergeSectionList } from "./sections";
import { serverCatalogFor } from "./server-catalog";
import { downloadSupabase } from "./supabase";
import { PAGE_SIZE } from "./page-size.mjs";
import {
  DEFAULT_SECTION,
  normalizeSection,
  type Category,
  type Story,
} from "./types";

export type FeedPayload = {
  stories: Story[];
  syncedAt: string;
  folder: string;
  count: number;
  live: boolean;
  categories: Category[];
  source?: string;
};

const FIRST_LIMIT = PAGE_SIZE;

const lastGood = new Map<string, FeedPayload>();

function wrap(
  stories: Story[],
  live: boolean,
  folder: string,
  syncedAt = new Date().toISOString(),
  source?: string,
): FeedPayload {
  const fromStories = stories.map((s) => normalizeSection(s.category));
  return {
    stories,
    syncedAt,
    folder,
    count: stories.length,
    live,
    categories: mergeSectionList(fromStories),
    source,
  };
}

const fallbackStories = storiesFromCsv(fallbackCsv).map((s) => ({
  ...s,
  category: normalizeSection(s.category),
}));

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

export function fallbackPayload(
  category: Category = DEFAULT_SECTION,
): FeedPayload {
  const section = getSection(category);
  const stories = filterStories(fallbackStories, section.slug);
  return wrap(
    stories,
    false,
    `NEWS/${section.folderName}`,
    "2026-08-14T00:06:00.000Z",
    "copia",
  );
}

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
      accounts: scopedCatalog.handles,
    });
    const scoped = filterStories(stories, section.slug, undefined, scopedCatalog);
    const payload = wrap(
      scoped,
      true,
      `NEWS/${section.folderName}`,
      new Date().toISOString(),
      `supabase/${section.slug}`,
    );
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
