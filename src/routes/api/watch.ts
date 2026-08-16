import { createFileRoute } from "@tanstack/react-router";
import { listWatchAccounts, registerWatch, unregisterWatch } from "@/lib/news/watch";
import { upsertProfile } from "@/lib/news/admin";
import { denyWrite, requestWriteAllowed } from "@/lib/news/write-guard";

export const Route = createFileRoute("/api/watch")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!requestWriteAllowed("app", request)) return denyWrite("app");
        const handles = await listWatchAccounts();
        return Response.json({ handles });
      },
      POST: async ({ request }) => {
        if (!requestWriteAllowed("app", request)) return denyWrite("app");
        const body = (await request.json().catch(() => ({}))) as {
          handle?: string;
          name?: string;
          avatar?: string | null;
          summary?: string;
          followers?: number;
        };
        const handle = String(body.handle || "").replace(/^@+/, "").trim();
        if (!handle) return Response.json({ ok: false }, { status: 400 });
        const ok = await registerWatch({
          handle,
          name: String(body.name || handle),
          avatar: body.avatar || null,
          summary: String(body.summary || ""),
          followers: Number(body.followers) || 0,
        });
        if (ok && body.summary) {
          await upsertProfile({
            handle,
            name: String(body.name || handle),
            bio: String(body.summary || ""),
            summary_pt: String(body.summary || "").slice(0, 220),
            avatar: body.avatar || null,
            followers: Number(body.followers) || 0,
            last_post: null,
          });
        }
        return Response.json({ ok });
      },
      DELETE: async ({ request }) => {
        if (!requestWriteAllowed("app", request)) return denyWrite("app");
        const url = new URL(request.url);
        const handle = String(url.searchParams.get("handle") || "").replace(/^@+/, "");
        const ok = await unregisterWatch(handle);
        return Response.json({ ok });
      },
    },
  },
});
