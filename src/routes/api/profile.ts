import { createFileRoute } from "@tanstack/react-router";
import { upsertProfile } from "@/lib/news/admin";
import { keepLastPost, parseLastPost } from "@/lib/news/last-post";
import { readStoredProfile } from "@/lib/news/profile-store";
import { denyWrite, requestWriteAllowed } from "@/lib/news/write-guard";

export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const handle = new URL(request.url).searchParams.get("handle") || "";
        const row = await readStoredProfile(handle);
        return Response.json(row ?? { found: false }, {
          headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" },
        });
      },
      POST: async ({ request }) => {
        if (!requestWriteAllowed("app", request)) return denyWrite("app");
        const body = (await request.json()) as {
          handle?: string;
          name?: string;
          bio?: string;
          summary_pt?: string;
          avatar?: string | null;
          followers?: number;
          lastPost?: unknown;
          last_post?: unknown;
        };
        const handle = String(body.handle || "").replace(/^@+/, "");
        if (!handle) return Response.json({ ok: false }, { status: 400 });
        const prev = await readStoredProfile(handle);
        const ok = await upsertProfile({
          handle,
          name: String(body.name || handle),
          bio: String(body.bio || ""),
          summary_pt: String(body.summary_pt || body.bio || handle).slice(0, 220),
          avatar: body.avatar ?? null,
          followers: Number(body.followers) || 0,
          last_post: keepLastPost(prev?.last_post, parseLastPost(body.last_post ?? body.lastPost)),
        });
        return Response.json({ ok });
      },
    },
  },
});
