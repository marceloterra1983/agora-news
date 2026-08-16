import { createServerFn } from "@tanstack/react-start";
import { FEED_SHEET_ID } from "./sheet";
import { SUPABASE_ANON_KEY, SUPABASE_POSTS_URL } from "./supabase";
import { embedForStory } from "./x-media";

export const loadTweetEmbed = createServerFn({ method: "GET" })
  .validator((input: { id: string; source: string }) => ({
    id: String(input.id || ""),
    source: String(input.source || "").replace(/^@+/, ""),
  }))
  .handler(async ({ data }) => embedForStory(data));

export const debugFeedRead = createServerFn({ method: "GET" }).handler(async () => {
  const probes: Array<{ url: string; ok: boolean; items?: number; error?: string; kind: string }> =
    [];
  const url = `${SUPABASE_POSTS_URL}?select=post_id&limit=3`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      probes.push({ url, ok: false, error: `HTTP ${res.status}`, kind: "supabase" });
    } else {
      const rows = (await res.json()) as unknown;
      probes.push({
        url,
        ok: true,
        items: Array.isArray(rows) ? rows.length : 0,
        kind: "supabase",
      });
    }
  } catch (err) {
    probes.push({
      url,
      ok: false,
      error: err instanceof Error ? err.message : "falha",
      kind: "supabase",
    });
  }
  return {
    note: "O app lê a tabela posts no Supabase. A planilha AGORA_FEED é só legado.",
    sheetId: FEED_SHEET_ID,
    probes,
  };
});
