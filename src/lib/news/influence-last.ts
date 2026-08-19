import { buzzFor } from "./fonte-metrics";
import type { LastHit } from "./fontes-last";
import { lastPostHref, storedToLastHit } from "./last-post";
import { keepLastPosts } from "./profile-last.mjs";
import type { StoredProfile } from "./profile-store";

export type FonteLastPost = {
  id: string;
  href: string;
  title: string;
  publishedAt: string;
  likes?: number;
  views?: number;
  replies?: number;
  reposts?: number;
  quotes?: number;
  bookmarks?: number;
  er?: number;
};

function norm(h: string): string {
  return String(h || "")
    .replace(/^@+/, "")
    .trim();
}

export function lastWithBuzz(
  last: LastHit | null,
  handle: string,
  inApp: boolean,
): FonteLastPost | null {
  if (!last) return null;
  return {
    id: last.id,
    href: lastPostHref(handle, last.id, inApp),
    title: last.title,
    publishedAt: last.publishedAt,
    ...(buzzFor(handle, last.id) ?? buzzFor(handle) ?? {}),
  };
}

export function storedLastMap(stored: StoredProfile[]): Map<string, LastHit> {
  const map = new Map<string, LastHit>();
  for (const row of stored) {
    const hit = storedToLastHit(row.last_post);
    if (hit) map.set(norm(row.handle).toLowerCase(), hit);
  }
  return map;
}

export function storedPostsMap(stored: StoredProfile[]): Map<string, LastHit[]> {
  const map = new Map<string, LastHit[]>();
  for (const row of stored) {
    const posts = (row.last_posts?.length
      ? row.last_posts
      : row.last_post
        ? [row.last_post]
        : []
    )
      .map((post) => storedToLastHit(post))
      .filter((hit): hit is LastHit => Boolean(hit));
    if (posts.length) map.set(norm(row.handle).toLowerCase(), posts);
  }
  return map;
}

export function hitsToLastPosts(
  handle: string,
  storedHits: LastHit[],
  feedHits: LastHit[],
): FonteLastPost[] {
  const feedIds = new Set(feedHits.map((hit) => hit.id));
  const merged = keepLastPosts(
    storedHits.map((hit) => ({
      id: hit.id,
      text: hit.title,
      url: lastPostHref(handle, hit.id, false),
      publishedAt: hit.publishedAt,
    })),
    feedHits.map((hit) => ({
      id: hit.id,
      text: hit.title,
      url: lastPostHref(handle, hit.id, feedIds.has(hit.id)),
      publishedAt: hit.publishedAt,
    })),
  );
  return merged
    .map((post) => lastWithBuzz(storedToLastHit(post), handle, feedIds.has(post.id)))
    .filter((post): post is FonteLastPost => Boolean(post));
}
