/** Last tweet per handle — any age. Stored in posts category x-last (x_profiles may be absent). */

import { SUPABASE_ANON_KEY, SUPABASE_POSTS_URL } from "./supabase";

export const LAST_POST_CATEGORY = "x-last";

import type { StoredLastPost } from "./last-post-core.mjs";

export type { StoredLastPost };
export {
  keepLastPost,
  lastPostHref,
  parseLastPost,
  preferNewerLast,
  safeHttpHref,
  storedToLastHit,
} from "./last-post-core.mjs";

const AUTH = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: "application/json",
};

function tweetIdOf(id: string, url: string): string {
  return url.match(/status\/(\d+)/)?.[1] || id;
}

export async function fetchLastPost(handle: string): Promise<StoredLastPost | null> {
  const key = handle.replace(/^@+/, "").trim();
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.fxtwitter.com/2/profile/${encodeURIComponent(key)}/statuses?count=5`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8_000) },
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

export async function latestFromPosts(handle: string): Promise<StoredLastPost | null> {
  const key = handle.replace(/^@+/, "").trim();
  if (!key) return null;
  try {
    const params = new URLSearchParams();
    params.set("select", "post_id,account,posted_at,summary_pt,content,post_url");
    params.set("account", `eq.${key}`);
    params.set("order", "posted_at.desc");
    params.set("limit", "8");
    const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: AUTH,
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
    for (const row of rows) {
      const rawId = String(row.post_id || "");
      if (!rawId || rawId.startsWith("prfl_") || rawId.startsWith("watch_")) continue;
      const text = String(row.summary_pt || row.content || "").trim();
      const publishedAt = String(row.posted_at || "");
      if (!text || !publishedAt) continue;
      const url = String(row.post_url || `https://x.com/${key}/status/${rawId}`);
      return { id: tweetIdOf(rawId, url), text: text.slice(0, 280), url, publishedAt };
    }
    return null;
  } catch {
    return null;
  }
}

