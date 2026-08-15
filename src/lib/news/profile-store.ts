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
      const rows = (await table.json()) as StoredProfile[];
      if (Array.isArray(rows) && rows[0]?.summary_pt) return rows[0];
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
    const rows = (await res.json()) as Array<{
      account?: string;
      content?: string;
      translation_pt?: string;
      summary_pt?: string;
      image_url?: string;
      media_label?: string;
      updated_at?: string;
      posted_at?: string;
    }>;
    const row = rows[0];
    if (!row?.summary_pt) return null;
    return {
      handle: row.account || key,
      name: row.translation_pt || key,
      bio: row.content || "",
      summary_pt: row.summary_pt,
      avatar: row.image_url || null,
      followers: Number(row.media_label) || 0,
      last_post: null,
      updated_at: row.updated_at || row.posted_at || "",
    };
  } catch {
    return null;
  }
}

export async function listStoredProfiles(): Promise<StoredProfile[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?category=eq.profile&select=account,content,translation_pt,summary_pt,image_url,media_label,updated_at,posted_at&limit=200`,
      { headers: AUTH, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      account?: string;
      content?: string;
      translation_pt?: string;
      summary_pt?: string;
      image_url?: string;
      media_label?: string;
      updated_at?: string;
      posted_at?: string;
    }>;
    const out: StoredProfile[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const handle = (row.account || "").replace(/^@+/, "").trim();
      if (!handle || seen.has(handle.toLowerCase())) continue;
      seen.add(handle.toLowerCase());
      out.push({
        handle,
        name: row.translation_pt || handle,
        bio: row.content || "",
        summary_pt: row.summary_pt || "",
        avatar: row.image_url || null,
        followers: Number(row.media_label) || 0,
        last_post: null,
        updated_at: row.updated_at || row.posted_at || "",
      });
    }
    return out;
  } catch {
    return [];
  }
}
