import { createFileRoute } from "@tanstack/react-router";
import { upsertProfile } from "@/lib/news/admin";
import { mergeClientProfile } from "@/lib/news/profile-store-core.mjs";
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
        if (!(await requestWriteAllowed("app", request))) return denyWrite("app");
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
        const merged = mergeClientProfile(prev, { ...body, handle });
        if (!merged) return Response.json({ ok: false }, { status: 400 });
        const ok = await upsertProfile(merged);
        return Response.json({ ok });
      },
    },
  },
});
