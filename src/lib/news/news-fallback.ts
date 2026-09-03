import fallbackCsv from "./agora-feed.csv?raw";
import { storiesFromCsv } from "./csv";
import { profilesFor } from "./profiles";
import {
  catalogFor,
  filterStoriesForCatalog,
  type SectionCatalog,
} from "./section-catalog.mjs";
import { getSection, mergeSectionList } from "./sections";
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
  hasMore?: boolean;
};

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

export function wrap(
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

function toNews(
  payload: FeedPayload,
  category: Category,
  q?: string,
  catalog?: SectionCatalog,
) {
  return {
    stories: filterStories(payload.stories, category, q, catalog).map((s) => ({
      ...s,
      body: s.body || s.excerpt || s.title,
      original: s.original || "",
    })),
    meta: {
      live: payload.live,
      syncedAt: payload.syncedAt,
      folder: payload.folder,
      count: payload.count,
      source: payload.source,
    },
  };
}

export function newsFromFallback(category: Category, q?: string) {
  return toNews(fallbackPayload(category), category, q);
}
