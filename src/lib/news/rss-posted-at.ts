import { supabaseReadHeaders, SUPABASE_POSTS_URL } from "./supabase";

export async function postedAtById(ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.some((id) => !/^(\d{1,30}|rss_[a-f0-9]{24})$/i.test(id))) {
    throw new Error("posted_at_invalid_input");
  }
  for (let i = 0; i < unique.length; i += 80) {
    const chunk = unique.slice(i, i + 80);
    const params = new URLSearchParams();
    params.set("select", "post_id,posted_at");
    params.set("post_id", `in.(${chunk.join(",")})`);
    let res: Response;
    try {
      res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
        headers: supabaseReadHeaders(),
        signal: AbortSignal.timeout(6_000),
      });
    } catch {
      throw new Error("posted_at_request_failed");
    }
    if (!res.ok) throw new Error(`posted_at_http_${res.status}`);
    let rows: unknown;
    try {
      rows = await res.json();
    } catch {
      throw new Error("posted_at_invalid_json");
    }
    const requested = new Set(chunk);
    if (
      !Array.isArray(rows) ||
      !rows.every(
        (row) =>
          Boolean(row) &&
          typeof row === "object" &&
          !Array.isArray(row) &&
          typeof (row as { post_id?: unknown }).post_id === "string" &&
          requested.has((row as { post_id: string }).post_id),
      )
    ) {
      throw new Error("posted_at_invalid_payload");
    }
    for (const row of rows) {
      const rec = row as { post_id: string; posted_at?: unknown };
      if (typeof rec.posted_at === "string" && rec.posted_at) {
        out.set(rec.post_id, rec.posted_at);
      }
    }
  }
  return out;
}
