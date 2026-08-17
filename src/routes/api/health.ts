import { createFileRoute } from "@tanstack/react-router";
import { supabaseReadHeaders, SUPABASE_POSTS_URL } from "@/lib/news/supabase";
import { elapsedMs, nowMs } from "@/lib/news/timing";

const SECTIONS = ["ai", "tech", "brasil"] as const;
const MAX_AGE_SEC = 2 * 60 * 60;
const MAX_FUTURE_SKEW_SEC = 60;

type Section = (typeof SECTIONS)[number];
type SectionState = "fresh" | "stale" | "empty" | "malformed" | "unavailable";
type SectionHealth = { state: SectionState; ageSec: number | null };

function ageSeconds(iso: string): number | null {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp)) return null;
  const ageSec = Math.round((Date.now() - timestamp) / 1000);
  if (ageSec < -MAX_FUTURE_SKEW_SEC) return null;
  return Math.max(0, ageSec);
}

async function probeSection(section: Section): Promise<{
  section: Section;
  health: SectionHealth;
  dependencyOk: boolean;
}> {
  try {
    const params = new URLSearchParams();
    params.set("select", "category,posted_at");
    params.set("order", "posted_at.desc");
    params.set("limit", "1");
    params.set("category", `eq.${section}`);
    const response = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: supabaseReadHeaders(),
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) {
      return {
        section,
        health: { state: "unavailable", ageSec: null },
        dependencyOk: false,
      };
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return {
        section,
        health: { state: "malformed", ageSec: null },
        dependencyOk: false,
      };
    }
    if (!Array.isArray(payload)) {
      return {
        section,
        health: { state: "malformed", ageSec: null },
        dependencyOk: false,
      };
    }
    if (!payload.length) {
      return {
        section,
        health: { state: "empty", ageSec: null },
        dependencyOk: true,
      };
    }

    const row = payload[0];
    if (
      !row ||
      typeof row !== "object" ||
      (row as { category?: unknown }).category !== section ||
      typeof (row as { posted_at?: unknown }).posted_at !== "string"
    ) {
      return {
        section,
        health: { state: "malformed", ageSec: null },
        dependencyOk: false,
      };
    }
    const ageSec = ageSeconds((row as { posted_at: string }).posted_at);
    if (ageSec === null) {
      return {
        section,
        health: { state: "malformed", ageSec: null },
        dependencyOk: false,
      };
    }
    return {
      section,
      health: {
        state: ageSec > MAX_AGE_SEC ? "stale" : "fresh",
        ageSec,
      },
      dependencyOk: true,
    };
  } catch {
    return {
      section,
      health: { state: "unavailable", ageSec: null },
      dependencyOk: false,
    };
  }
}

async function probePosts() {
  const startedAt = nowMs();
  const probes = await Promise.all(SECTIONS.map(probeSection));
  const sections = Object.fromEntries(
    probes.map(({ section, health }) => [section, health]),
  ) as Record<Section, SectionHealth>;
  return {
    sections,
    postsOk: probes.every(({ dependencyOk }) => dependencyOk),
    postsMs: elapsedMs(startedAt),
    ready: probes.every(({ health }) => health.state === "fresh"),
  };
}

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const startedAt = nowMs();
        const posts = await probePosts();
        const body = {
          ok: posts.ready,
          stale: SECTIONS.some(
            (section) => posts.sections[section].state === "stale",
          ),
          totalMs: elapsedMs(startedAt),
          supabase: {
            postsMs: posts.postsMs,
            postsOk: posts.postsOk,
          },
          sections: posts.sections,
          at: new Date().toISOString(),
        };
        return Response.json(body, {
          status: posts.ready ? 200 : 503,
          headers: { "Cache-Control": "no-store" },
        });
      },
    },
  },
});
