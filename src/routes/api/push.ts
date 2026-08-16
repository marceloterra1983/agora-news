import { createFileRoute } from "@tanstack/react-router";
import { VAPID_PUBLIC_KEY } from "@/lib/news/vapid-public";
import { deletePushSub, getPushForUser, savePushSub } from "@/lib/news/push-server";
import { denyWrite, requestWriteAllowed } from "@/lib/news/write-guard";

export const Route = createFileRoute("/api/push")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { userIdFromHeaders } = await import("@/lib/auth/verify.server");
        const userId = await userIdFromHeaders(request.headers);
        if (!userId) return Response.json({ key: VAPID_PUBLIC_KEY });
        const mine = await getPushForUser(userId);
        return Response.json({ key: VAPID_PUBLIC_KEY, saved: mine.saved, handles: mine.handles });
      },
      DELETE: async ({ request }) => {
        if (!(await requestWriteAllowed("app", request))) return denyWrite("app");
        const body = (await request.json().catch(() => ({}))) as { endpoint?: string };
        const endpoint = String(body.endpoint || "");
        if (!endpoint) return Response.json({ ok: false }, { status: 400 });
        const ok = await deletePushSub(endpoint);
        return Response.json({ ok });
      },
      POST: async ({ request }) => {
        if (!(await requestWriteAllowed("app", request))) return denyWrite("app");
        const { userIdFromHeaders } = await import("@/lib/auth/verify.server");
        const userId = await userIdFromHeaders(request.headers);
        const body = (await request.json().catch(() => ({}))) as {
          endpoint?: string;
          keys?: { p256dh?: string; auth?: string };
          handles?: string[];
        };
        if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
          return Response.json({ ok: false }, { status: 400 });
        }
        const saved = await savePushSub({
          endpoint: body.endpoint,
          keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
          handles: Array.isArray(body.handles) ? body.handles.map(String) : [],
          userId,
        });
        if (!saved) return Response.json({ ok: false }, { status: 502 });
        return Response.json({ ok: true });
      },
    },
  },
});
