/** Server-only. Never import this from a route/component that ships to the browser. */
import { supabaseApiKeyHeaders } from "./supabase-rest";
import type { YoutubeChannel, YoutubeVideo } from "./youtube-types";

function env(name: string): string {
  if (typeof process === "undefined" || !process.env) return "";
  return process.env[name] ?? "";
}

export const SUPABASE_URL =
  env("SUPABASE_URL") ||
  env("VITE_SUPABASE_URL") ||
  "https://uqcaodtgrkphuhdkchyh.supabase.co";

export function youtubeAdminHeaders(): Record<string, string> {
  const key = env("SUPABASE_SECRET_KEY").trim();
  if (!key) throw new Error("missing_supabase_secret_key");
  return {
    ...supabaseApiKeyHeaders(key),
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export async function fetchYoutubeChannels(): Promise<YoutubeChannel[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/youtube_channels?select=*`, {
    headers: youtubeAdminHeaders(),
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) throw new Error(`youtube_channels_fetch_${res.status}`);
  const rows = (await res.json()) as unknown;
  if (!Array.isArray(rows)) throw new Error("youtube_channels_invalid");
  return rows as YoutubeChannel[];
}

export async function fetchYoutubeVideos(opts?: {
  channelId?: string;
  limit?: number;
}): Promise<YoutubeVideo[]> {
  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("order", "published_at.desc");
  params.set("limit", String(opts?.limit ?? 50));
  if (opts?.channelId) {
    params.set("channel_id", `eq.${opts.channelId}`);
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/youtube_videos?${params}`,
    {
      headers: youtubeAdminHeaders(),
      signal: AbortSignal.timeout(6_000),
    },
  );
  if (!res.ok) throw new Error(`youtube_videos_fetch_${res.status}`);
  const rows = (await res.json()) as unknown;
  if (!Array.isArray(rows)) throw new Error("youtube_videos_invalid");
  return rows as YoutubeVideo[];
}

export async function fetchYoutubeVideoById(
  videoId: string,
): Promise<YoutubeVideo | null> {
  const clean = videoId.trim();
  if (!clean) return null;
  const params = new URLSearchParams();
  params.set("select", "*");
  params.set("video_id", `eq.${clean}`);
  params.set("limit", "1");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/youtube_videos?${params}`,
    {
      headers: youtubeAdminHeaders(),
      signal: AbortSignal.timeout(5_000),
    },
  );
  if (!res.ok) throw new Error(`youtube_video_fetch_${res.status}`);
  const rows = (await res.json()) as unknown;
  if (!Array.isArray(rows)) throw new Error("youtube_video_invalid");
  const row = rows[0];
  if (!row) return null;
  return row as YoutubeVideo;
}
