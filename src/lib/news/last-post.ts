/** Last tweet per handle — any age. Stored in posts category x-last (x_profiles may be absent). */

import { supabaseReadHeaders, SUPABASE_POSTS_URL } from "./supabase";

export const LAST_POST_CATEGORY = "x-last";

import {
  pickLatestFromPostRows,
  type StoredLastPost,
} from "./last-post-core.mjs";

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
  preferNewerLast,
  safeHttpHref,
  storedToLastHit,
  usableTweetId,
  xLastListParams,
} from "./last-post-core.mjs";

export async function fetchLastPost(
  handle: string,
): Promise<StoredLastPost | null> {
  const key = handle.replace(/^@+/, "").trim();
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.fxtwitter.com/2/profile/${encodeURIComponent(key)}/statuses?count=5`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      results?: Array<{
        id?: string;
        text?: string;
        url?: string;
        created_timestamp?: number;
        created_at?: string;
      }>;
    };
    const row = (body.results ?? []).find((t) => t.id && t.text);
    if (!row?.id) return null;
    const publishedAt = row.created_timestamp
      ? new Date(row.created_timestamp * 1000).toISOString()
      : row.created_at
        ? new Date(row.created_at).toISOString()
        : "";
    if (!publishedAt) return null;
    return {
      id: String(row.id),
      text: String(row.text).replace(/\s+/g, " ").trim(),
      url: row.url || `https://x.com/${key}/status/${row.id}`,
      publishedAt,
    };
  } catch {
    return null;
  }
}

export async function latestFromPosts(
  handle: string,
): Promise<StoredLastPost | null> {
  const key = handle.replace(/^@+/, "").trim();
  if (!key) return null;
  try {
    const params = new URLSearchParams();
    params.set(
      "select",
      "post_id,account,posted_at,summary_pt,content,post_url",
    );
    params.set("account", `eq.${key}`);
    params.set("order", "posted_at.desc");
    params.set("limit", "8");
    const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: supabaseReadHeaders(),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      post_id?: string;
      posted_at?: string;
      summary_pt?: string;
      content?: string;
      post_url?: string;
    }>;
    return pickLatestFromPostRows(rows, key);
  } catch {
    return null;
  }
}
