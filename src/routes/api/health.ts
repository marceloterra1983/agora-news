import { createFileRoute } from "@tanstack/react-router";
import { SUPABASE_ANON_KEY, SUPABASE_POSTS_URL } from "@/lib/news/supabase";
import { elapsedMs, nowMs } from "@/lib/news/timing";

type Head = {
  post_id?: string;
  account?: string;
  posted_at?: string;
  summary_pt?: string;
  category?: string;
};

async function probePosts(): Promise<{
  ok: boolean;
  ms: number;
  head: Head | null;
  error?: string;
}> {
  const t0 = nowMs();
  try {
    const params = new URLSearchParams();
    params.set("select", "post_id,account,posted_at,summary_pt,category");
    params.set("order", "posted_at.desc");
    params.set("limit", "1");
    params.set("category", "in.(ai,tech,brasil)");
    const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(6_000),
    });
    const ms = elapsedMs(t0);
    if (!res.ok) return { ok: false, ms, head: null, error: `HTTP ${res.status}` };
    const rows = (await res.json()) as Head[];
    return { ok: true, ms, head: Array.isArray(rows) ? rows[0] ?? null : null };
  } catch (err) {
    return {
      ok: false,
      ms: elapsedMs(t0),
      head: null,
      error: err instanceof Error ? err.message : "fail",
    };
  }
}

function ageSeconds(iso?: string): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 1000));
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const t0 = nowMs();
        const posts = await probePosts();
        const age = ageSeconds(posts.head?.posted_at);
        const stale = age != null && age > 2 * 60 * 60;
        const ok = posts.ok && !stale;

        const body = {
          ok,
          stale,
          totalMs: elapsedMs(t0),
          supabase: {
            postsMs: posts.ms,
            postsOk: posts.ok,
            error: posts.error || null,
          },
          head: posts.head
            ? {
                post_id: posts.head.post_id,
                account: posts.head.account,
                category: posts.head.category,
                posted_at: posts.head.posted_at,
                summary: (posts.head.summary_pt || "").slice(0, 120),
                ageSec: age,
              }
            : null,
          at: new Date().toISOString(),
        };

        return Response.json(body, {
          status: ok ? 200 : 503,
          headers: {
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
