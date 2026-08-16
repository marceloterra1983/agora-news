import { createFileRoute } from "@tanstack/react-router";
import { VAPID_PUBLIC_KEY } from "@/lib/news/vapid-public";
import { savePushSub } from "@/lib/news/push-server";
import { denyWrite, requestWriteAllowed } from "@/lib/news/write-guard";

export const Route = createFileRoute("/api/push")({
  server: {
    handlers: {
      GET: async () => Response.json({ key: VAPID_PUBLIC_KEY }),
      POST: async ({ request }) => {
        if (!requestWriteAllowed("app", request)) return denyWrite("app");
        const body = (await request.json().catch(() => ({}))) as {
          endpoint?: string;
          keys?: { p256dh?: string; auth?: string };
          handles?: string[];
        };
        if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
          return Response.json({ ok: false }, { status: 400 });
        }
        await savePushSub({
          endpoint: body.endpoint,
          keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
          handles: Array.isArray(body.handles) ? body.handles.map(String) : [],
        });
        return Response.json({ ok: true });
      },
    },
  },
});
