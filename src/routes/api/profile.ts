import { createFileRoute } from "@tanstack/react-router";
import { readStoredProfile } from "@/lib/news/profile-store";

export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const handle = new URL(request.url).searchParams.get("handle") || "";
        try {
          const row = await readStoredProfile(handle);
          return Response.json(row ?? { found: false }, {
            headers: {
              "Cache-Control":
                "public, s-maxage=120, stale-while-revalidate=600",
            },
          });
        } catch {
          return Response.json(
            { found: false, error: "profile_unavailable" },
            { status: 502, headers: { "Cache-Control": "no-store" } },
          );
        }
      },
    },
  },
});
