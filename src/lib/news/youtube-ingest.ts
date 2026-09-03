/** Server-only. Ingestão de canais do YouTube via feeds Atom oficiais com ETag e deduplicação. */
import { upsertPosts, type UpsertPost } from "./admin";
import { CACHE_KEYS, cacheGetJson, cacheSetJson } from "./cache";
import { existingIds, saoPauloStamp } from "./ingest-fetch";
import { MAX_YOUTUBE_ITEMS, YOUTUBE_SEED, type YouTubeSeed } from "./youtube-catalog.mjs";
import { youtubePostId } from "./rss-id.mjs";
import { decodeRssBody, parseFeedXml } from "./rss-parse.mjs";
import { skipRssResponse } from "./rss-ingest-core.mjs";
import { assertSafeRssFetchUrl } from "./safe-fetch";
import { translateToPt } from "./translate-pt.mjs";
import { youtubePostsFromItems } from "./youtube-ingest-core.mjs";

export type YouTubeChannelRow = YouTubeSeed;

export async function runYouTubeIngest(opts?: {
  assertOwned?: () => Promise<void>;
  fetchImpl?: typeof fetch;
  channels?: YouTubeChannelRow[];
  translate?: typeof translateToPt;
  existingIdsImpl?: (ids: string[]) => Promise<Set<string>>;
  upsertImpl?: typeof upsertPosts;
}): Promise<{ written: number; ok: boolean; feeds: number }> {
  const fetchImpl = opts?.fetchImpl ?? fetch;
  const translate = opts?.translate ?? translateToPt;
  const knownIds = opts?.existingIdsImpl ?? existingIds;
  const upsert = opts?.upsertImpl ?? upsertPosts;
  const channels = opts?.channels ?? YOUTUBE_SEED;
  const batch = saoPauloStamp();
  const rows: UpsertPost[] = [];

  for (const channel of channels) {
    try {
      await opts?.assertOwned?.();
      if (!opts?.fetchImpl) {
        await assertSafeRssFetchUrl(channel.url);
      }
      const cacheKey = `${CACHE_KEYS.rssEtag}yt_${channel.account}`;
      const prev = await cacheGetJson<{ etag?: string; lastModified?: string }>(cacheKey);
      const headers: Record<string, string> = { "User-Agent": "AgoraNews/1.0" };
      if (prev?.etag) headers["If-None-Match"] = prev.etag;
      if (prev?.lastModified) headers["If-Modified-Since"] = prev.lastModified;

      const res = await fetchImpl(channel.url, {
        headers,
        signal: AbortSignal.timeout(12_000),
      });

      if (skipRssResponse(res.status)) continue;

      const xml = decodeRssBody(
        await res.arrayBuffer(),
        res.headers.get("content-type") || "",
      );

      await cacheSetJson(
        cacheKey,
        {
          etag: res.headers.get("etag") || prev?.etag,
          lastModified: res.headers.get("last-modified") || prev?.lastModified,
        },
        86_400,
      );

      const parsed = parseFeedXml(xml, channel.url).sort(
        (a, b) => Date.parse(b.publishedAt || "") - Date.parse(a.publishedAt || ""),
      );
      const items = parsed.slice(0, MAX_YOUTUBE_ITEMS);
      const ids = items.map((item) => youtubePostId(item.videoId || item.guid || item.link));
      const known = ids.length ? await knownIds(ids) : new Set<string>();

      const translated: Record<string, { title: string; summary: string }> = {};
      for (const item of items) {
        const postId = youtubePostId(item.videoId || item.guid || item.link);
        if (known.has(postId)) continue;
        const title = await translate(item.title);
        const summarySrc = item.summary || item.title;
        translated[postId] = {
          title,
          summary: summarySrc === item.title ? title : await translate(summarySrc),
        };
      }

      rows.push(...youtubePostsFromItems(channel, items, known, batch, translated));
    } catch {
      /* Falha pontual em canal do YouTube não interrompe os demais */
    }
  }

  if (!rows.length) return { written: 0, ok: true, feeds: channels.length };
  await opts?.assertOwned?.();
  const written = await upsert(rows, opts?.assertOwned);
  return { written: written.count, ok: written.ok, feeds: channels.length };
}
