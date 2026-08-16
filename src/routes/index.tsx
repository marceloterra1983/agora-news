import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppChrome } from "@/components/news/app-chrome";
import { Feed } from "@/components/news/feed";
import { loadNews } from "@/lib/news/server";
import { DEFAULT_SECTION, normalizeSection, type Category } from "@/lib/news/types";

type HomeSearch = {
  secao: Category;
  q?: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (raw: Record<string, unknown>): HomeSearch => {
    const secao = normalizeSection(
      typeof raw.secao === "string" && raw.secao.trim() ? raw.secao.trim() : DEFAULT_SECTION,
    );
    const q = typeof raw.q === "string" && raw.q.trim() ? raw.q.trim() : undefined;
    return { secao, q };
  },
  loaderDeps: ({ search }) => ({ secao: search.secao, q: search.q }),
  loader: async ({ deps }) =>
    loadNews({
      data: { category: deps.secao, q: deps.q, refresh: false, fromX: false },
    }),
  component: Home,
});

function Home() {
  const { secao, q } = Route.useSearch();
  const initial = Route.useLoaderData();
  const [group, setGroup] = useState<string>("all");
  return (
    <AppChrome category={secao} query={q} group={group} onGroup={setGroup}>
      <main className="px-4 pb-24">
        <Feed key={secao} category={secao} query={q} initial={initial} group={group} onGroupChange={setGroup} />
      </main>
    </AppChrome>
  );
}
