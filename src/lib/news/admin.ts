/** Server-only. Never import this from a route/component that ships to the browser. */
function env(name: string): string {
  if (typeof process === "undefined" || !process.env) return "";
  return process.env[name] ?? "";
}

export const SUPABASE_URL =
  env("SUPABASE_URL") || env("VITE_SUPABASE_URL") || "https://uqcaodtgrkphuhdkchyh.supabase.co";

export const SUPABASE_SERVICE_KEY =
  env("SUPABASE_SERVICE_ROLE_KEY") ||
  env("SUPABASE_SERVICE_KEY") ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxY2FvZHRncmtwaHVoZGtjaHloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjcyNDY2OSwiZXhwIjoyMTAyMzAwNjY5fQ.DbpfcPf3X0dFQ4UqaSmLVmw17b4nupGN8kGKYmyfhgg";

export function adminHeaders(): Record<string, string> {
  const key = SUPABASE_SERVICE_KEY;
  if (!key) throw new Error("missing_service_role");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export type UpsertPost = {
  post_id: string;
  account: string;
  posted_at: string;
  posted_at_sp?: string;
  content: string;
  translation_pt: string;
  summary_pt: string;
  post_url: string;
  media_label: string;
  image_url: string;
  category: string;
  batch_name: string;
  source?: string;
};

export async function upsertPosts(rows: UpsertPost[]): Promise<{
  ok: boolean;
  status: number;
  count: number;
  error?: string;
}> {
  if (!rows.length) return { ok: true, status: 200, count: 0 };
  let ok = 0;
  let status = 200;
  let error: string | undefined;
  for (let i = 0; i < rows.length; i += 25) {
    const chunk = rows.slice(i, i + 25);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?on_conflict=post_id`, {
      method: "POST",
      headers: {
        ...adminHeaders(),
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(chunk),
      signal: AbortSignal.timeout(20_000),
    });
    status = res.status;
    if (!res.ok) {
      error = (await res.text()).slice(0, 280);
      continue;
    }
    ok += chunk.length;
  }
  return { ok: ok > 0 || !error, status, count: ok, error };
}

export type UpsertProfile = {
  handle: string;
  name: string;
  bio: string;
  summary_pt: string;
  avatar: string | null;
  followers: number;
  last_post: { id: string; text: string; url: string; publishedAt: string } | null;
};

export async function upsertProfile(row: UpsertProfile): Promise<boolean> {
  const handle = row.handle.replace(/^@+/, "").trim();
  if (!handle) return false;
  const viaTable = await fetch(`${SUPABASE_URL}/rest/v1/x_profiles?on_conflict=handle`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      handle,
      name: row.name,
      bio: row.bio,
      summary_pt: row.summary_pt,
      avatar: row.avatar,
      followers: row.followers,
      last_post: row.last_post,
      updated_at: new Date().toISOString(),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (viaTable.ok || viaTable.status === 201) return true;
  const posted = row.last_post?.publishedAt || "2020-01-01T00:00:00.000Z";
  const fallback = await fetch(`${SUPABASE_URL}/rest/v1/posts?on_conflict=post_id`, {
    method: "POST",
    headers: {
      ...adminHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      post_id: `prfl_${handle.toLowerCase()}`,
      account: handle,
      posted_at: posted,
      posted_at_sp: posted,
      content: row.bio,
      translation_pt: row.name,
      summary_pt: row.summary_pt || row.bio.slice(0, 180) || handle,
      post_url: `https://x.com/${handle}`,
      media_label: String(row.followers || 0),
      image_url: row.avatar || "",
      category: "profile",
      batch_name: "x-profile",
      source: "x-profile",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  return fallback.ok || fallback.status === 201;
}

export async function deletePost(id: string): Promise<boolean> {
  const clean = String(id || "").trim();
  if (!clean) return false;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?post_id=eq.${encodeURIComponent(clean)}`,
    {
      method: "DELETE",
      headers: adminHeaders(),
      signal: AbortSignal.timeout(8_000),
    },
  );
  return res.ok;
}
