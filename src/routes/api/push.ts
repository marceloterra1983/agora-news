import { createFileRoute } from "@tanstack/react-router";
import { vapidConfig } from "@/lib/news/push-config";
import {
  deletePushSub,
  getPushForUser,
  savePushSub,
} from "@/lib/news/push-server";
import { validPushEndpoint } from "@/lib/news/push-core.mjs";
import { denyWrite, requestWriteAllowed } from "@/lib/news/write-guard";

export const Route = createFileRoute("/api/push")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { publicKey } = vapidConfig();
        const headers = { "Cache-Control": "no-store" };
        const { userIdFromHeaders } = await import("@/lib/auth/verify.server");
        const userId = await userIdFromHeaders(request.headers);
        if (!userId) return Response.json({ key: publicKey }, { headers });
        try {
          const mine = await getPushForUser(userId);
          return Response.json(
            { key: publicKey, saved: mine.saved, handles: mine.handles },
            { headers },
          );
        } catch {
          return Response.json(
            { key: publicKey, saved: false, error: "push_unavailable" },
            { status: 502, headers },
          );
        }
      },
      DELETE: async ({ request }) => {
        if (!(await requestWriteAllowed("app", request)))
          return denyWrite("app");
        const { userIdFromHeaders } = await import("@/lib/auth/verify.server");
        const userId = await userIdFromHeaders(request.headers);
        if (!userId) return denyWrite("app");
        const body = (await request.json().catch(() => ({}))) as {
          endpoint?: string;
        };
        const endpoint = String(body.endpoint || "");
        if (!validPushEndpoint(endpoint)) {
          return Response.json({ ok: false }, { status: 400 });
        }
        const ok = await deletePushSub(userId, endpoint);
        return Response.json({ ok }, { status: ok ? 200 : 502 });
      },
      POST: async ({ request }) => {
        if (!(await requestWriteAllowed("app", request)))
          return denyWrite("app");
        const { userIdFromHeaders } = await import("@/lib/auth/verify.server");
        const userId = await userIdFromHeaders(request.headers);
        if (!userId) return denyWrite("app");
        const body = (await request.json().catch(() => ({}))) as {
          endpoint?: string;
          keys?: { p256dh?: string; auth?: string };
          handles?: string[];
        };
        if (
          !validPushEndpoint(body.endpoint) ||
          !body.keys?.p256dh ||
          !body.keys.auth
        ) {
          return Response.json({ ok: false }, { status: 400 });
        }
        const saved = await savePushSub(userId, {
          endpoint: body.endpoint,
          keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
          handles: Array.isArray(body.handles) ? body.handles.map(String) : [],
        });
        if (!saved) return Response.json({ ok: false }, { status: 502 });
        return Response.json({ ok: true });
      },
    },
  },
});
