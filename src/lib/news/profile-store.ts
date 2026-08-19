import { avatarInFilter, storedProfileFromRow } from "./profile-store-core.mjs";
import { adminHeaders, SUPABASE_URL } from "./admin";

export type StoredProfile = {
  handle: string;
  name: string;
  bio: string;
  summary_pt: string;
  avatar: string | null;
  followers: number;
  last_post: {
    id: string;
    text: string;
    url: string;
    publishedAt: string;
  } | null;
  updated_at: string;
};

export async function readStoredProfile(
  handle: string,
): Promise<StoredProfile | null> {
  const key = handle.replace(/^@+/, "").trim();
  if (!key) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/x_profiles?handle=eq.${encodeURIComponent(key)}&select=*&limit=1`,
    { headers: adminHeaders(), signal: AbortSignal.timeout(5_000) },
  );
  if (!res.ok) throw new Error(`profile_read_${res.status}`);
  const rows = (await res.json()) as unknown[];
  if (!Array.isArray(rows)) throw new Error("profile_read_invalid");
  return (storedProfileFromRow(rows[0], key) as StoredProfile | null) ?? null;
}

/** Mesma coluna que a matéria (`x_profiles.avatar`), só os handles da página. */
export async function readAvatarsByHandles(
  handles: string[],
): Promise<Map<string, string>> {
  const filter = avatarInFilter(handles);
  const out = new Map<string, string>();
  if (!filter) return out;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/x_profiles?handle=in.(${filter})&select=handle,avatar`,
    { headers: adminHeaders(), signal: AbortSignal.timeout(4_000) },
  );
  if (!res.ok) throw new Error(`avatar_read_${res.status}`);
  const rows = (await res.json()) as unknown[];
  if (!Array.isArray(rows)) throw new Error("avatar_read_invalid");
  for (const row of rows) {
    const parsed = storedProfileFromRow(row);
    if (parsed?.avatar) out.set(parsed.handle.toLowerCase(), parsed.avatar);
  }
  return out;
}

export async function listStoredProfiles(): Promise<StoredProfile[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/x_profiles?select=handle,name,bio,summary_pt,avatar,followers,last_post,updated_at&limit=400`,
    { headers: adminHeaders(), signal: AbortSignal.timeout(6_000) },
  );
  if (!res.ok) throw new Error(`profile_list_${res.status}`);
  const rows = (await res.json()) as unknown[];
  if (!Array.isArray(rows)) throw new Error("profile_list_invalid");
  return rows
    .map((row) => storedProfileFromRow(row) as StoredProfile | null)
    .filter((row): row is StoredProfile => Boolean(row));
}
