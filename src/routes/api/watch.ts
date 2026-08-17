import { createFileRoute } from "@tanstack/react-router";
import {
  listUserWatchAccounts,
  registerWatch,
  unregisterWatch,
} from "@/lib/news/watch";
import { denyWrite, requestWriteAllowed } from "@/lib/news/write-guard";

export const Route = createFileRoute("/api/watch")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await requestWriteAllowed("app", request)))
          return denyWrite("app");
        const { userIdFromHeaders } = await import("@/lib/auth/verify.server");
        const userId = await userIdFromHeaders(request.headers);
        if (!userId) return denyWrite("app");
        const handles = await listUserWatchAccounts(userId);
        return Response.json({ handles });
      },
      POST: async ({ request }) => {
        if (!(await requestWriteAllowed("app", request)))
          return denyWrite("app");
        const { userIdFromHeaders } = await import("@/lib/auth/verify.server");
        const userId = await userIdFromHeaders(request.headers);
        if (!userId) return denyWrite("app");
        const body = (await request.json().catch(() => ({}))) as {
          handle?: string;
          name?: string;
          avatar?: string | null;
          summary?: string;
          followers?: number;
          section?: string;
        };
        const handle = String(body.handle || "")
          .replace(/^@+/, "")
          .trim();
        if (!handle) return Response.json({ ok: false }, { status: 400 });
        const ok = await registerWatch(userId, {
          handle,
          name: String(body.name || handle),
          avatar: body.avatar || null,
          summary: String(body.summary || ""),
          followers: Number(body.followers) || 0,
          section: String(body.section || ""),
        });
        return Response.json({ ok }, { status: ok ? 200 : 502 });
      },
      DELETE: async ({ request }) => {
        if (!(await requestWriteAllowed("app", request)))
          return denyWrite("app");
        const { userIdFromHeaders } = await import("@/lib/auth/verify.server");
        const userId = await userIdFromHeaders(request.headers);
        if (!userId) return denyWrite("app");
        const url = new URL(request.url);
        const handle = String(url.searchParams.get("handle") || "").replace(
          /^@+/,
          "",
        );
        const ok = await unregisterWatch(userId, handle);
        return Response.json({ ok }, { status: ok ? 200 : 502 });
      },
    },
  },
});
