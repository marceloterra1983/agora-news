import { createFileRoute } from "@tanstack/react-router";
import { CACHE_KEYS, cacheBackend, cacheGet, cacheSet, redisConfigured, resetCacheProbe } from "@/lib/news/cache";
import { denyWrite, requestWriteAllowed } from "@/lib/news/write-guard";

export const Route = createFileRoute("/api/cache")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await requestWriteAllowed("ops", request))) return denyWrite("ops");
        resetCacheProbe();
        const key = "agora:v1:ping";
        const token = String(Date.now());
        await cacheSet(key, token, 30);
        const read = await cacheGet(key);
        return Response.json({
          backend: cacheBackend(),
          redis: redisConfigured(),
          ok: read === token,
          lock: CACHE_KEYS.lock,
        });
      },
    },
  },
});
