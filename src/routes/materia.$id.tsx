import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppChrome } from "@/components/news/app-chrome";
import { ArticleView } from "@/components/news/article-view";
import { HistoryBackButton } from "@/components/news/history-back";
import { Skeleton } from "@/components/ui/skeleton";
import { loadStory } from "@/lib/news/server";
import { useNewsStore } from "@/lib/news/store";
import { DEFAULT_SECTION, labelFor } from "@/lib/news/types";
import { markRead } from "@/lib/news/unread";
import { displayTitle } from "@/lib/news/format";
import { routeMeta } from "@/lib/news/route-meta";

export const Route = createFileRoute("/materia/$id")({
  loader: async ({ params }) => loadStory({ data: params.id }),
  head: ({ loaderData }) => ({ meta: routeMeta(loaderData ? displayTitle(loaderData.title) : "Matéria", loaderData?.excerpt || "Leia a matéria no Agora.") }),
  component: ArticlePage,
});

function ArticlePage() {
  const { id } = Route.useParams();
  const loaded = Route.useLoaderData();
  const cached = useNewsStore((s) => s.stories[id]);
  const ingest = useNewsStore((s) => s.ingest);
  const { data, isLoading, isError, refetch } = useQuery({
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

  const retry = (
    <button
      type="button"
      className="mt-4 h-11 rounded-md border border-line px-4 text-sm"
      onClick={() => void refetch()}
    >
      Tentar novamente
    </button>
  );

  return (
    <AppChrome category={data?.category ?? "ai"}>
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 max-sm:max-w-none">
        {data ? (
          <>
            {isError ? (
              <div className="mx-auto mb-4 max-w-3xl text-sm text-mark" role="alert">
                <p>Não foi possível atualizar esta matéria.</p>
                {retry}
              </div>
            ) : null}
            <ArticleView story={data} />
          </>
        ) : isLoading ? (
          <div
            className="mx-auto max-w-3xl space-y-4"
            role="status"
            aria-busy="true"
          >
            <h1 className="sr-only">Carregando matéria</h1>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="aspect-[16/9] w-full rounded-lg" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <div className="mx-auto max-w-lg py-20 text-center" role="alert">
            <h1 className="font-display text-2xl">Matéria indisponível</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Não foi possível carregar o conteúdo agora.
            </p>
            {retry}
          </div>
        ) : (
          <div className="mx-auto max-w-lg py-20 text-center">
            <h1 className="font-display text-2xl">Matéria não encontrada</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Ela pode ter saído do ar ou expirado no feed.
            </p>
            <div className="mx-auto mt-6 w-min">
              <HistoryBackButton
                fallbackSecao={DEFAULT_SECTION}
                label={`Voltar para ${labelFor(DEFAULT_SECTION)}`}
              />
            </div>
          </div>
        )}
      </div>
    </AppChrome>
  );
}
