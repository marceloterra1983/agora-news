/** Server-only. Never import this from a route/component that ships to the browser. */
import { supabaseApiKeyHeaders } from "./supabase-rest";

function env(name: string): string {
  if (typeof process === "undefined" || !process.env) return "";
  return process.env[name] ?? "";
}

export const SUPABASE_URL =
  env("SUPABASE_URL") ||
  env("VITE_SUPABASE_URL") ||
  "https://uqcaodtgrkphuhdkchyh.supabase.co";

export function adminHeaders(): Record<string, string> {
  const key = env("SUPABASE_SECRET_KEY").trim();
  if (!key) throw new Error("missing_supabase_secret_key");
  return {
    ...supabaseApiKeyHeaders(key),
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

export async function upsertPosts(
  rows: UpsertPost[],
  beforeChunk?: () => Promise<void>,
): Promise<{
  ok: boolean;
  status: number;
  count: number;
  confirmedIds: string[];
  failedIds: string[];
  error?: string;
}> {
  if (!rows.length)
    return {
      ok: true,
      status: 200,
      count: 0,
      confirmedIds: [],
      failedIds: [],
    };
  const confirmedIds: string[] = [];
  const failedIds: string[] = [];
  let status = 200;
  let error: string | undefined;
  for (let i = 0; i < rows.length; i += 25) {
    const chunk = rows.slice(i, i + 25);
    await beforeChunk?.();
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/posts?on_conflict=post_id`,
        {
          method: "POST",
          headers: {
            ...adminHeaders(),
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(chunk),
          signal: AbortSignal.timeout(20_000),
        },
      );
      if (!res.ok) {
        if (!error) {
          status = res.status;
          error = `upsert_http_${res.status}`;
        }
        failedIds.push(...chunk.map((row) => row.post_id));
        continue;
      }
      if (!error) status = res.status;
      confirmedIds.push(...chunk.map((row) => row.post_id));
    } catch {
      if (!error) {
        status = 502;
        error = "upsert_request_failed";
      }
      failedIds.push(...chunk.map((row) => row.post_id));
    }
  }
  return {
    ok: failedIds.length === 0,
    status,
    count: confirmedIds.length,
    confirmedIds,
    failedIds,
    error,
  };
}

export type UpsertProfile = {
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
    recent?: Array<{
      id: string;
      text: string;
      url: string;
      publishedAt: string;
    }>;
  } | null;
};

export async function upsertProfile(row: UpsertProfile): Promise<boolean> {
  const handle = row.handle.replace(/^@+/, "").trim();
  if (!handle) return false;
  const viaTable = await fetch(
    `${SUPABASE_URL}/rest/v1/x_profiles?on_conflict=handle`,
    {
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
    },
  );
  return viaTable.ok;
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
