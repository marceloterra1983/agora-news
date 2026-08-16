/** Last tweet per handle — any age, persisted on x_profiles.last_post. */

import { SUPABASE_ANON_KEY, SUPABASE_POSTS_URL } from "./supabase";

export type StoredLastPost = {
  id: string;
  text: string;
  url: string;
  publishedAt: string;
};

const AUTH = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: "application/json",
};

export function parseLastPost(raw: unknown): StoredLastPost | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id || "").trim();
  const text = String(o.text || o.title || "").replace(/\s+/g, " ").trim();
  const publishedAt = String(o.publishedAt || "").trim();
  if (!id || !publishedAt) return null;
  return {
    id,
    text,
    url: String(o.url || `https://x.com/i/status/${id}`),
    publishedAt,
  };
}

export function keepLastPost(
  prev: StoredLastPost | null | undefined,
  next: StoredLastPost | null | undefined,
): StoredLastPost | null {
  if (!next) return prev ?? null;
  if (!prev) return next;
  const pt = Date.parse(prev.publishedAt);
  const nt = Date.parse(next.publishedAt);
  if (Number.isFinite(nt) && Number.isFinite(pt) && nt < pt) return prev;
  return next;
}

export function storedToLastHit(post: StoredLastPost | null | undefined): {
  id: string;
  title: string;
  publishedAt: string;
  count: number;
} | null {
  if (!post?.id) return null;
  return { id: post.id, title: post.text.slice(0, 180), publishedAt: post.publishedAt, count: 1 };
}

export function preferNewerLast<T extends { publishedAt: string }>(a: T | null, b: T | null): T | null {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(b.publishedAt) > Date.parse(a.publishedAt) ? b : a;
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
        : new Date().toISOString();
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
    params.set("account", `ilike.${key}`);
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
      const id = String(row.post_id || "");
      if (!id || id.startsWith("prfl_") || id.startsWith("watch_")) continue;
      const text = String(row.summary_pt || row.content || "").trim();
      if (!text) continue;
      return {
        id,
        text: text.slice(0, 280),
        url: String(row.post_url || `https://x.com/${key}/status/${id}`),
        publishedAt: String(row.posted_at || ""),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function persistLastPost(handle: string, post: StoredLastPost): Promise<boolean> {
  const { readStoredProfile } = await import("./profile-store");
  const { upsertProfile } = await import("./admin");
  const prev = await readStoredProfile(handle);
  return upsertProfile({
    handle,
    name: prev?.name || handle,
    bio: prev?.bio || "",
    summary_pt: prev?.summary_pt || prev?.bio || handle,
    avatar: prev?.avatar ?? null,
    followers: prev?.followers || 0,
    last_post: keepLastPost(prev?.last_post, post),
  });
}

export async function fillMissingLastPosts(handles: string[]): Promise<number> {
  const unique = [
    ...new Set(handles.map((h) => h.replace(/^@+/, "").trim()).filter(Boolean)),
  ].slice(0, 32);
  let n = 0;
  for (let i = 0; i < unique.length; i += 6) {
    const chunk = unique.slice(i, i + 6);
    await Promise.all(
      chunk.map(async (handle) => {
        const post = (await latestFromPosts(handle)) ?? (await fetchLastPost(handle));
        if (!post) return;
        if (await persistLastPost(handle, post)) n += 1;
      }),
    );
  }
  return n;
}
