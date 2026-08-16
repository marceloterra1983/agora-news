import { SUPABASE_ANON_KEY, SUPABASE_POSTS_URL } from "./supabase";

const AUTH = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

export type Status = {
  id?: string;
  text?: string;
  url?: string;
  created_timestamp?: number;
  created_at?: string;
  replying_to?: unknown;
  quote?: { id?: string; text?: string; author?: { screen_name?: string } };
  retweet?: { id?: string; text?: string; author?: { screen_name?: string } };
  card?: { title?: string };
  article?: { id?: string; title?: string };
  media?: { photos?: Array<{ url?: string }>; videos?: Array<{ thumbnail_url?: string; url?: string }> };
  author?: {
    screen_name?: string;
    name?: string;
    description?: string;
    avatar_url?: string;
    followers?: number;
  };
};

export function postedIso(status: Status): string {
  if (status.created_timestamp) return new Date(status.created_timestamp * 1000).toISOString();
  if (status.created_at) return new Date(status.created_at).toISOString();
  return "";
}

export function needsEmbed(status: Status): boolean {
  if (status.quote || status.retweet || status.card || status.article) return true;
  if (status.media?.videos?.length) return true;
  if (status.media?.photos?.[0]?.url) return false;
  return /https?:\/\/t\.co\/|\/i\/article|quoted/i.test(status.text || "");
}

export async function statusesFor(handle: string): Promise<Status[]> {
  const res = await fetch(
    `https://api.fxtwitter.com/2/profile/${encodeURIComponent(handle)}/statuses?count=3`,
    { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5_000) },
  );
  if (!res.ok) return [];
  const body = (await res.json()) as { results?: Status[] };
  return body.results ?? [];
}

export async function existingIds(ids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const unique = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 80) {
    const chunk = unique.slice(i, i + 80);
    const params = new URLSearchParams();
    params.set("select", "post_id");
    params.set("post_id", `in.(${chunk.join(",")})`);
    const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: AUTH,
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) continue;
    const rows = (await res.json()) as Array<{ post_id?: string }>;
    for (const row of rows) if (row.post_id) out.add(row.post_id);
  }
  return out;
}

export function saoPauloStamp(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  return `${g("year")}-${g("month")}-${g("day")}_${g("hour")}-${g("minute")}`;
}

export function saoPauloIso(iso: string) {
  try {
    return new Date(iso).toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).replace(" ", "T");
  } catch {
    return iso;
  }
}
