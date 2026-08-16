import { createFileRoute } from "@tanstack/react-router";
import { runIngest } from "@/lib/news/ingest";
import { denyWrite, requestWriteAllowed } from "@/lib/news/write-guard";

export const Route = createFileRoute("/api/ingest")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});

async function handle({ request }: { request: Request }) {
  if (!(await requestWriteAllowed("ingest", request))) return denyWrite("ingest");
  try {
    const result = await runIngest({ withProfiles: true });
    const status = result.ok ? 200 : 502;
    return Response.json(result, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "ingest_failed" },
      { status: 500 },
    );
  }
}
