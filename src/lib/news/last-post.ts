/** Last tweet per handle — any age. Stored in posts category x-last (x_profiles may be absent). */

import { supabaseReadHeaders, SUPABASE_POSTS_URL } from "./supabase";

export const LAST_POST_CATEGORY = "x-last";

import {
  pickRecentFromPostRows,
  type StoredLastPost,
} from "./last-post-core.mjs";
import { PROFILE_LAST_KEEP } from "./profile-last.mjs";

export type { StoredLastPost };
export {
  isSyntheticPostId,
  keepLastPost,
  lastPostFromXLastRow,
  lastPostHref,
  lastPostIsStale,
  LAST_POST_STALE_MS,
  parseLastPost,
  pickLatestFromPostRows,
  pickRecentFromPostRows,
  preferNewerLast,
  safeHttpHref,
  storedToLastHit,
  usableTweetId,
  xLastListParams,
} from "./last-post-core.mjs";

type FxStatus = {
  id?: string;
  text?: string;
  url?: string;
  created_timestamp?: number;
  created_at?: string;
  replying_to?: unknown;
};

function storedFromFx(handle: string, row: FxStatus): StoredLastPost | null {
  if (row.replying_to || !row.id || !row.text) return null;
  const publishedAt = row.created_timestamp
    ? new Date(row.created_timestamp * 1000).toISOString()
    : row.created_at
      ? new Date(row.created_at).toISOString()
      : "";
  if (!publishedAt) return null;
  return {
    id: String(row.id),
    text: String(row.text).replace(/\s+/g, " ").trim(),
    url: row.url || `https://x.com/${handle}/status/${row.id}`,
    publishedAt,
  };
}

export async function fetchLastPosts(handle: string): Promise<StoredLastPost[]> {
  const key = handle.replace(/^@+/, "").trim();
  if (!key) return [];
  try {
    const res = await fetch(
      `https://api.fxtwitter.com/2/profile/${encodeURIComponent(key)}/statuses?count=10`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { results?: FxStatus[] };
    const out: StoredLastPost[] = [];
    for (const row of body.results ?? []) {
      const post = storedFromFx(key, row);
      if (!post) continue;
      out.push(post);
      if (out.length >= PROFILE_LAST_KEEP) break;
    }
    return out;
  } catch {
    return [];
  }
}

export async function fetchLastPost(handle: string): Promise<StoredLastPost | null> {
  return (await fetchLastPosts(handle))[0] ?? null;
}

export async function recentFromPosts(handle: string): Promise<StoredLastPost[]> {
  const key = handle.replace(/^@+/, "").trim();
  if (!key) return [];
  try {
    const params = new URLSearchParams();
    params.set(
      "select",
      "post_id,account,posted_at,summary_pt,content,post_url",
    );
    params.set("account", `eq.${key}`);
    params.set("order", "posted_at.desc");
    params.set("limit", "12");
    const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: supabaseReadHeaders(),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<Record<string, unknown>>;
    return pickRecentFromPostRows(rows, key, PROFILE_LAST_KEEP);
  } catch {
    return [];
  }
}

export async function latestFromPosts(
  handle: string,
): Promise<StoredLastPost | null> {
  return (await recentFromPosts(handle))[0] ?? null;
}
