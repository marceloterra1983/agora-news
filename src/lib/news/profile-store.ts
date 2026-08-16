import { storedProfileFromRow } from "./profile-store-core.mjs";
import { keepLastPost } from "./last-post";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase";

export type StoredProfile = {
  handle: string;
  name: string;
  bio: string;
  summary_pt: string;
  avatar: string | null;
  followers: number;
  last_post: { id: string; text: string; url: string; publishedAt: string } | null;
  updated_at: string;
};

const AUTH = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: "application/json",
};

export async function readStoredProfile(handle: string): Promise<StoredProfile | null> {
  const key = handle.replace(/^@+/, "").trim();
  if (!key) return null;
  try {
    const table = await fetch(
      `${SUPABASE_URL}/rest/v1/x_profiles?handle=eq.${encodeURIComponent(key)}&select=*&limit=1`,
      { headers: AUTH, signal: AbortSignal.timeout(5_000) },
    );
    if (table.ok) {
      const rows = (await table.json()) as unknown[];
      const mapped = storedProfileFromRow(rows[0], key);
      if (mapped) return mapped as StoredProfile;
    }
  } catch {
    /* table may not exist yet */
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?post_id=eq.${encodeURIComponent(`prfl_${key.toLowerCase()}`)}&select=account,content,translation_pt,summary_pt,image_url,media_label,updated_at,posted_at&limit=1`,
      { headers: AUTH, signal: AbortSignal.timeout(5_000) },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as unknown[];
    return (storedProfileFromRow(rows[0], key) as StoredProfile | null) ?? null;
  } catch {
    return null;
  }
}

async function listFromXProfiles(): Promise<StoredProfile[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/x_profiles?select=handle,name,bio,summary_pt,avatar,followers,last_post,updated_at&limit=400`,
      { headers: AUTH, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as unknown[];
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => storedProfileFromRow(row) as StoredProfile | null)
      .filter((row): row is StoredProfile => Boolean(row));
  } catch {
    return [];
  }
}

async function listFromProfilePosts(): Promise<StoredProfile[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?category=eq.profile&select=account,content,translation_pt,summary_pt,image_url,media_label,updated_at,posted_at&limit=200`,
      { headers: AUTH, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as unknown[];
    const out: StoredProfile[] = [];
    const seen = new Set<string>();
    for (const raw of rows) {
      const row = storedProfileFromRow(raw) as StoredProfile | null;
      if (!row || seen.has(row.handle.toLowerCase())) continue;
      seen.add(row.handle.toLowerCase());
      out.push(row);
    }
    return out;
  } catch {
    return [];
  }
}

export async function listStoredProfiles(): Promise<StoredProfile[]> {
  const [table, posts] = await Promise.all([listFromXProfiles(), listFromProfilePosts()]);
  const by = new Map<string, StoredProfile>();
  for (const row of posts) by.set(row.handle.toLowerCase(), row);
  for (const row of table) {
    const prev = by.get(row.handle.toLowerCase());
    by.set(row.handle.toLowerCase(), {
      ...prev,
      ...row,
      last_post: keepLastPost(prev?.last_post, row.last_post),
    });
  }
  return [...by.values()];
}
