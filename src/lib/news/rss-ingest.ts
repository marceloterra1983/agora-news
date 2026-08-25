/** Server-only. Ingestão RSS com fetch injetável. */
import { adminHeaders, SUPABASE_URL, upsertPosts, type UpsertPost } from "./admin";
import { CACHE_KEYS, cacheGetJson, cacheSetJson } from "./cache";
import { existingIds } from "./ingest-fetch";
import { saoPauloStamp } from "./ingest-fetch";
import { MAX_RSS_ITEMS, RSS_SEED, rssGroupFor } from "./rss-catalog.mjs";
import { rssAccountId, rssPostId } from "./rss-id.mjs";
import { parseFeedXml } from "./rss-parse.mjs";
import { ingestSurvives, rssPostsFromItems, skipRssResponse } from "./rss-ingest-core.mjs";
import { translateToPt } from "./translate-pt.mjs";

export { ingestSurvives };

export type RssFeedRow = {
  url: string;
  title: string;
  section: string;
  group?: string;
  account?: string;
};

async function loadOwnedFeeds(): Promise<RssFeedRow[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_prefs?select=prefs&limit=20`, {
      headers: adminHeaders(),
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ prefs?: { rssFeeds?: RssFeedRow[] } }>;
    if (!Array.isArray(rows)) return [];
    return rows.flatMap((row) =>
      Array.isArray(row.prefs?.rssFeeds) ? row.prefs.rssFeeds : [],
    );
  } catch {
    return [];
  }
}

function feedsToScan(extra: RssFeedRow[], includeSeed = true): RssFeedRow[] {
  const all = [...(includeSeed ? RSS_SEED : []), ...extra];
  const seen = new Set<string>();
  const out: RssFeedRow[] = [];
  for (const feed of all) {
    const url = String(feed.url || "").trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      ...feed,
      url,
      account: feed.account || rssAccountId(url),
      group: feed.group || rssGroupFor(feed.section),
    });
  }
  return out;
}

export async function runRssIngest(opts?: {
  assertOwned?: () => Promise<void>;
  fetchImpl?: typeof fetch;
  feeds?: RssFeedRow[];
  translate?: typeof translateToPt;
  existingIdsImpl?: (ids: string[]) => Promise<Set<string>>;
  upsertImpl?: typeof upsertPosts;
}): Promise<{ written: number; ok: boolean; feeds: number }> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const translate = opts?.translate ?? translateToPt;
  const knownIds = opts?.existingIdsImpl ?? existingIds;
  const upsert = opts?.upsertImpl ?? upsertPosts;
  const ownedOrGiven = opts?.feeds ?? (await loadOwnedFeeds());
  const feeds = feedsToScan(ownedOrGiven, opts?.feeds == null);
  const batch = saoPauloStamp();
  const rows: UpsertPost[] = [];
  for (const feed of feeds) {
    try {
      await opts?.assertOwned?.();
      const cacheKey = `${CACHE_KEYS.rssEtag}${feed.account}`;
      const prev = await cacheGetJson<{ etag?: string; lastModified?: string }>(cacheKey);
      const headers: Record<string, string> = { "User-Agent": "AgoraNews/1.0" };
      if (prev?.etag) headers["If-None-Match"] = prev.etag;
      if (prev?.lastModified) headers["If-Modified-Since"] = prev.lastModified;
      const res = await fetchImpl(feed.url, {
        headers,
        signal: AbortSignal.timeout(12_000),
      });
      if (skipRssResponse(res.status)) continue;
      const xml = await res.text();
      await cacheSetJson(
        cacheKey,
        {
          etag: res.headers.get("etag") || prev?.etag,
          lastModified: res.headers.get("last-modified") || prev?.lastModified,
        },
        86_400,
      );
      const items = parseFeedXml(xml, feed.url)
        .sort((a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""))
        .slice(0, MAX_RSS_ITEMS);
      const ids = items.map((item) => rssPostId(item.guid || item.link));
      const known = ids.length ? await knownIds(ids) : new Set<string>();
      const translated: Record<string, { title: string; summary: string }> = {};
      for (const item of items) {
        const postId = rssPostId(item.guid || item.link);
        if (known.has(postId)) continue;
        translated[postId] = {
          title: await translate(item.title),
          summary: await translate(item.summary || item.title),
        };
      }
      rows.push(...rssPostsFromItems(feed, items, known, batch, translated));
    } catch {
      /* um feed morto não aborta os outros */
    }
  }
  if (!rows.length) return { written: 0, ok: true, feeds: feeds.length };
  await opts?.assertOwned?.();
  const written = await upsert(rows, opts?.assertOwned);
  return { written: written.count, ok: written.ok, feeds: feeds.length };
}
