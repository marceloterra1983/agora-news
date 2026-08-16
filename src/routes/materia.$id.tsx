import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppChrome } from "@/components/news/app-chrome";
import { ArticleView } from "@/components/news/article-view";
import { Tip } from "@/components/news/icon-btn";
import { Skeleton } from "@/components/ui/skeleton";
import { loadStory } from "@/lib/news/server";
import { useNewsStore } from "@/lib/news/store";
import { readLastSection } from "@/lib/news/section-pref";
import { labelFor } from "@/lib/news/types";
import { markRead } from "@/lib/news/unread";

export const Route = createFileRoute("/materia/$id")({
  loader: async ({ params }) => loadStory({ data: params.id }),
  component: ArticlePage,
});

function ArticlePage() {
  const { id } = Route.useParams();
  const loaded = Route.useLoaderData();
  const cached = useNewsStore((s) => s.stories[id]);
  const ingest = useNewsStore((s) => s.ingest);
  const { data, isLoading } = useQuery({
    queryKey: ["story", id],
    queryFn: () => loadStory({ data: id }),
    initialData: loaded ?? undefined,
    placeholderData: cached,
    staleTime: 60_000,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (data) ingest([data]);
  }, [data, ingest]);

  useEffect(() => {
    if (id) markRead(id);
  }, [id]);

  return (
    <AppChrome category={data?.category ?? "ai"}>
      <main className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6">
        {data ? (
          <ArticleView story={data} />
        ) : isLoading ? (
          <div className="mx-auto max-w-3xl space-y-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="aspect-[16/9] w-full rounded-lg" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="mx-auto max-w-lg py-20 text-center">
            <p className="font-display text-2xl">Matéria não encontrada</p>
            <p className="mt-2 text-sm text-ink-soft">
              Ela pode ter saído do ar ou expirado no feed.
            </p>
            <Tip label={`Voltar para ${labelFor(readLastSection())}`}>
              <Link
                to="/"
                search={{ secao: readLastSection() }}
                aria-label={`Voltar para ${labelFor(readLastSection())}`}
                className="mx-auto mt-6 grid size-8 place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
              >
                <ArrowLeft className="size-4" />
              </Link>
            </Tip>
          </div>
        )}
      </main>
    </AppChrome>
  );
}
