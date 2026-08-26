import { createFileRoute } from "@tanstack/react-router";
import { AppChrome } from "@/components/news/app-chrome";
import { Feed } from "@/components/news/feed";
import { loadNews } from "@/lib/news/server";
import { routeMeta } from "@/lib/news/route-meta";
import {
  DEFAULT_SECTION,
  normalizeSection,
  type Category,
} from "@/lib/news/types";

type HomeSearch = {
  secao: Category;
  q?: string;
  group?: string;
};

export const Route = createFileRoute("/")({
  head: () => ({ meta: routeMeta("Notícias", "Acompanhe notícias de inteligência artificial, tecnologia e Brasil.") }),
  validateSearch: (raw: Record<string, unknown>): HomeSearch => {
    const secao = normalizeSection(
      typeof raw.secao === "string" && raw.secao.trim()
        ? raw.secao.trim()
        : DEFAULT_SECTION,
    );
    const q =
      typeof raw.q === "string" && raw.q.trim() ? raw.q.trim() : undefined;
    const group = typeof raw.group === "string" && /^[a-z0-9_-]{1,40}$/.test(raw.group) ? raw.group : undefined;
    return { secao, q, group };
  },
  loaderDeps: ({ search }) => ({ secao: search.secao, q: search.q }),
  loader: async ({ deps }) =>
    loadNews({
      data: { category: deps.secao, q: deps.q },
    }),
  component: Home,
});

function Home() {
  const { secao, q, group = "all" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const initial = Route.useLoaderData();
  return (
    <AppChrome category={secao} query={q} group={group} onGroup={(next) => void navigate({ search: (current) => ({ ...current, group: next === "all" ? undefined : next }), replace: true, resetScroll: false })}>
      <div className="px-4 pb-24">
        <h1 className="sr-only">Notícias</h1>
        <Feed
          key={secao}
          category={secao}
          query={q}
          initial={initial}
          group={group}
        />
      </div>
    </AppChrome>
  );
}
