import { createFileRoute } from "@tanstack/react-router";
import { runIngest } from "@/lib/news/ingest";

export const Route = createFileRoute("/api/ingest")({
  server: {
    handlers: {
      GET: handle,
      POST: handle,
    },
  },
});

async function handle() {
  try {
    const result = await runIngest({ withProfiles: true });
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "ingest_failed" },
      { status: 500 },
    );
  }
}
