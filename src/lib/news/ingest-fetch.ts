import { supabaseReadHeaders, SUPABASE_POSTS_URL } from "./supabase";
import { statusesFromPayload, type Status } from "./ingest-boundary";

export type { Status } from "./ingest-boundary";

export function postedIso(status: Status): string {
  if (
    typeof status.created_timestamp === "number" &&
    Number.isFinite(status.created_timestamp)
  ) {
    const date = new Date(status.created_timestamp * 1000);
    if (Number.isFinite(date.getTime())) return date.toISOString();
  }
  if (status.created_at && Number.isFinite(Date.parse(status.created_at)))
    return new Date(status.created_at).toISOString();
  return "";
}

export function needsEmbed(status: Status): boolean {
  if (status.quote || status.retweet || status.card || status.article)
    return true;
  if (status.media?.videos?.length) return true;
  if (status.media?.photos?.[0]?.url) return false;
  return /https?:\/\/t\.co\/|\/i\/article|quoted/i.test(status.text || "");
}

export async function statusesFor(handle: string): Promise<Status[]> {
  let res: Response;
  try {
    res = await fetch(
      `https://api.fxtwitter.com/2/profile/${encodeURIComponent(handle)}/statuses?count=10`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5_000),
      },
    );
  } catch {
    throw new Error("fxtwitter_request_failed");
  }
  if (!res.ok) throw new Error(`fxtwitter_http_${res.status}`);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error("fxtwitter_invalid_json");
  }
  const statuses = statusesFromPayload(body);
  if (!statuses) throw new Error("fxtwitter_invalid_payload");
  return statuses;
}

export async function existingIds(ids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.some((id) => !/^\d{1,30}$/.test(id))) {
    throw new Error("existing_ids_invalid_input");
  }
  for (let i = 0; i < unique.length; i += 80) {
    const chunk = unique.slice(i, i + 80);
    const params = new URLSearchParams();
    params.set("select", "post_id");
    params.set("post_id", `in.(${chunk.join(",")})`);
    let res: Response;
    try {
      res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
        headers: supabaseReadHeaders(),
        signal: AbortSignal.timeout(6_000),
      });
    } catch {
      throw new Error("existing_ids_request_failed");
    }
    if (!res.ok) throw new Error(`existing_ids_http_${res.status}`);
    let rows: unknown;
    try {
      rows = await res.json();
    } catch {
      throw new Error("existing_ids_invalid_json");
    }
    const requested = new Set(chunk);
    if (
      !Array.isArray(rows) ||
      !rows.every(
        (row) =>
          Boolean(row) &&
          typeof row === "object" &&
          !Array.isArray(row) &&
          typeof row.post_id === "string" &&
          requested.has(row.post_id),
      )
    ) {
      throw new Error("existing_ids_invalid_payload");
    }
    for (const row of rows) out.add(row.post_id);
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
    return new Date(iso)
      .toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" })
      .replace(" ", "T");
  } catch {
    return iso;
  }
}
