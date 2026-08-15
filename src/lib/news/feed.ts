import fallbackCsv from "./agora-feed.csv?raw";
import { mergeStories, storiesFromCsv } from "./csv";
import { getSection, mergeSectionList } from "./sections";
import { downloadSupabase } from "./supabase";
import { loadXStories } from "./x-search";
import { invalidateNewsCache } from "./cache";
import { DEFAULT_SECTION, normalizeSection, type Category, type Story } from "./types";

export { FEED_SHEET_ID, FEED_CSV_URL } from "./sheet";

export type FeedPayload = {
  stories: Story[];
  syncedAt: string;
  folder: string;
  count: number;
  live: boolean;
  categories: Category[];
  source?: string;
  xLive?: boolean;
  xAvailable?: boolean;
  xError?: string;
};

/** Fresh: serve only. Stale: serve + refresh in background. Expired: wait. */
const SOFT_MS = 120_000;
const HARD_MS = 600_000;

const cache = new Map<string, { at: number; payload: FeedPayload }>();
const lastGood = new Map<string, FeedPayload>();
const inflight = new Map<string, Promise<FeedPayload>>();

function wrap(
  stories: Story[],
  live: boolean,
  folder: string,
  syncedAt = new Date().toISOString(),
  source?: string,
  extra?: { xLive?: boolean; xAvailable?: boolean; xError?: string },
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
    xLive: extra?.xLive,
    xAvailable: extra?.xAvailable,
    xError: extra?.xError,
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
): Story[] {
  const section = normalizeSection(category);
  const base = stories.filter((s) => normalizeSection(s.category) === section);
  const needle = q?.trim().toLowerCase();
  if (!needle) return base;
  return base.filter(
    (s) =>
      s.title.toLowerCase().includes(needle) ||
      s.excerpt.toLowerCase().includes(needle) ||
      s.body.toLowerCase().includes(needle) ||
      s.sourceLabel.toLowerCase().includes(needle) ||
      s.original.toLowerCase().includes(needle),
  );
}

export function listFallbackStories(): Story[] {
  return fallbackStories;
}

export function fallbackPayload(category: Category = DEFAULT_SECTION): FeedPayload {
  const section = getSection(category);
  const stories = fallbackStories.filter((s) => normalizeSection(s.category) === section.slug);
  return wrap(stories, false, `NEWS/${section.folderName}`, "2026-08-14T00:06:00.000Z", "copia");
}

export function invalidateFeedCache() {
  cache.clear();
  inflight.clear();
  void invalidateNewsCache();
}

export function peekStory(id: string): Story | null {
  for (const entry of cache.values()) {
    const hit = entry.payload.stories.find((s) => s.id === id);
    if (hit) return hit;
  }
  for (const payload of lastGood.values()) {
    const hit = payload.stories.find((s) => s.id === id);
    if (hit) return hit;
  }
  return fallbackStories.find((s) => s.id === id) ?? null;
}

export async function loadFeed(
  refresh = false,
  category: Category = DEFAULT_SECTION,
  fromX = false,
): Promise<FeedPayload> {
  const section = getSection(category);
  const key = section.slug;
  const hit = cache.get(key);
  const age = hit ? Date.now() - hit.at : Number.POSITIVE_INFINITY;

  if (!fromX && !refresh && hit && age < SOFT_MS) return hit.payload;

  const jobKey = `${key}:${fromX ? "x" : "s"}`;
  const pending = inflight.get(jobKey);

  if (!fromX && !refresh && hit && age < HARD_MS) {
    if (!pending) void startJob(section.slug, fromX, jobKey);
    return hit.payload;
  }

  if (pending) return pending;
  return startJob(section.slug, fromX, jobKey);
}

function startJob(slug: Category, fromX: boolean, jobKey: string): Promise<FeedPayload> {
  const job = loadFeedJob(slug, fromX);
  inflight.set(jobKey, job);
  void job.finally(() => inflight.delete(jobKey));
  return job;
}

async function loadFeedJob(category: Category, fromX: boolean): Promise<FeedPayload> {
  const section = getSection(category);
  const previous = lastGood.get(section.slug);
  let remote: Story[] = [];
  let x: Awaited<ReturnType<typeof loadXStories>> = {
    stories: [],
    used: false,
    available: false,
  };
  try {
    const remoteJob = downloadSupabase(section.slug, { limit: 40 });
    const xJob = fromX
      ? loadXStories(section.slug, true)
      : Promise.resolve<Awaited<ReturnType<typeof loadXStories>>>({
          stories: [],
          used: false,
          available: false,
        });
    const settled = await Promise.allSettled([remoteJob, xJob]);
    if (settled[0].status === "fulfilled") remote = settled[0].value;
    if (settled[1].status === "fulfilled") x = settled[1].value;
    else {
      x = {
        stories: previous?.stories.filter((s) => s.batch === "x-api") ?? [],
        used: false,
        available: false,
        error: settled[1].reason instanceof Error ? settled[1].reason.message : "falha na API do X",
      };
    }
  } catch (err) {
    x = {
      stories: [],
      used: false,
      available: false,
      error: err instanceof Error ? err.message : "falha ao ler o feed",
    };
  }

  if (!remote.length) {
    if (previous) {
      cache.set(section.slug, { at: Date.now(), payload: previous });
      return previous;
    }
    const fallback = fallbackPayload(section.slug);
    cache.set(section.slug, { at: Date.now(), payload: fallback });
    return fallback;
  }

  const stories = mergeStories(remote, x.stories);
  const payload = wrap(
    stories,
    true,
    `NEWS/${section.folderName}`,
    new Date().toISOString(),
    x.used ? `X+supabase/${section.slug}` : `supabase/${section.slug}`,
    { xLive: x.used, xAvailable: x.available, xError: x.error },
  );
  cache.set(section.slug, { at: Date.now(), payload });
  lastGood.set(section.slug, payload);
  return payload;
}

export function listFallbackCategories(): Category[] {
  return wrap(fallbackStories, false, "NEWS/AI").categories;
}
