import { createServerFn } from "@tanstack/react-start";
import { supabaseReadHeaders, SUPABASE_POSTS_URL } from "./supabase";
import { embedForStory } from "./x-media";

export const loadTweetEmbed = createServerFn({ method: "GET" })
  .validator((input: { id: string; source: string }) => ({
    id: String(input.id || ""),
    source: String(input.source || "").replace(/^@+/, ""),
  }))
  .handler(async ({ data }) => embedForStory(data));

export const debugFeedRead = createServerFn({ method: "GET" }).handler(
  async () => {
    const probes: Array<{
      url: string;
      ok: boolean;
      items?: number;
      error?: string;
      kind: string;
    }> = [];
    const url = `${SUPABASE_POSTS_URL}?select=post_id&limit=3`;
    try {
      const res = await fetch(url, {
        headers: supabaseReadHeaders(),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        probes.push({
          url,
          ok: false,
          error: `HTTP ${res.status}`,
          kind: "supabase",
        });
      } else {
        const rows = (await res.json()) as unknown;
        probes.push({
          url,
          ok: true,
          items: Array.isArray(rows) ? rows.length : 0,
          kind: "supabase",
        });
      }
    } catch {
      probes.push({
        url,
        ok: false,
        error: "indisponível",
        kind: "supabase",
      });
    }
    return {
      note: "O app lê notícias no Supabase e mantém dados privados em tabelas dedicadas.",
      probes,
    };
  },
);
