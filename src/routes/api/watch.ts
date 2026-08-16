import { createFileRoute } from "@tanstack/react-router";
import { listWatchAccounts, registerWatch, unregisterWatch } from "@/lib/news/watch";
import { upsertProfile } from "@/lib/news/admin";
import { mergeClientProfile } from "@/lib/news/profile-store-core.mjs";
import { readStoredProfile } from "@/lib/news/profile-store";
import { denyWrite, requestWriteAllowed } from "@/lib/news/write-guard";

export const Route = createFileRoute("/api/watch")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await requestWriteAllowed("app", request))) return denyWrite("app");
        const handles = await listWatchAccounts();
        return Response.json({ handles });
      },
      POST: async ({ request }) => {
        if (!(await requestWriteAllowed("app", request))) return denyWrite("app");
        const body = (await request.json().catch(() => ({}))) as {
          handle?: string;
          name?: string;
          avatar?: string | null;
          summary?: string;
          followers?: number;
          lastPost?: unknown;
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
          const prev = await readStoredProfile(handle);
          const merged = mergeClientProfile(prev, { ...body, handle, summary_pt: body.summary });
          if (merged) await upsertProfile(merged);
        }
        return Response.json({ ok });
      },
      DELETE: async ({ request }) => {
        if (!(await requestWriteAllowed("app", request))) return denyWrite("app");
        const url = new URL(request.url);
        const handle = String(url.searchParams.get("handle") || "").replace(/^@+/, "");
        const ok = await unregisterWatch(handle);
        return Response.json({ ok });
      },
    },
  },
});
