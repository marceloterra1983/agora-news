import { createFileRoute } from "@tanstack/react-router";
import { loadNews } from "@/lib/news/server";
import { DEFAULT_SECTION, normalizeSection, type Category } from "@/lib/news/types";

export const Route = createFileRoute("/api/feed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const category = normalizeSection(url.searchParams.get("secao") || DEFAULT_SECTION);
        const q = url.searchParams.get("q") || undefined;
        const data = await loadNews({
          data: { category: category as Category, q },
        });
        return Response.json(data, {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180",
            "CDN-Cache-Control": "public, s-maxage=60, stale-while-revalidate=180",
          },
        });
      },
    },
  },
});
