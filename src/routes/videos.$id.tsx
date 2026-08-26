import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppChrome } from "@/components/news/app-chrome";
import { VideoDetail } from "@/components/news/video-detail";
import { Tip } from "@/components/news/icon-btn";
import { Skeleton } from "@/components/ui/skeleton";
import { loadVideoById } from "@/lib/news/server-youtube";
import { routeMeta } from "@/lib/news/route-meta";

export const Route = createFileRoute("/videos/$id")({
  loader: async ({ params }) => loadVideoById({ data: params.id }),
  head: ({ loaderData }) => ({
    meta: routeMeta(
      loaderData?.title || "Vídeo",
      loaderData?.headline || "Assista ao vídeo no YouTube.",
    ),
  }),
  component: VideoPage,
});

function VideoPage() {
  const { id } = Route.useParams();
  const loaded = Route.useLoaderData();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["video", id],
    queryFn: () => loadVideoById({ data: id }),
    initialData: loaded ?? undefined,
    staleTime: 60_000,
    refetchOnMount: false,
  });

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
    <AppChrome category="ai">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 max-sm:max-w-none">
        <Tip label="Voltar para Vídeos">
          <Link
            to="/videos"
            aria-label="Voltar para Vídeos"
            className="mb-6 grid size-[44px] place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
          >
            <ArrowLeft className="size-4" />
          </Link>
        </Tip>

        {data ? (
          <>
            {isError ? (
              <div className="mx-auto mb-4 max-w-3xl text-sm text-mark" role="alert">
                <p>Não foi possível atualizar este vídeo.</p>
                {retry}
              </div>
            ) : null}
            <VideoDetail video={data} />
          </>
        ) : isLoading ? (
          <div
            className="mx-auto max-w-3xl space-y-4"
            role="status"
            aria-busy="true"
          >
            <h1 className="sr-only">Carregando vídeo</h1>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="aspect-video w-full rounded-lg" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <div className="mx-auto max-w-lg py-20 text-center" role="alert">
            <h1 className="font-display text-2xl">Vídeo indisponível</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Não foi possível carregar o conteúdo agora.
            </p>
            {retry}
          </div>
        ) : (
          <div className="mx-auto max-w-lg py-20 text-center">
            <h1 className="font-display text-2xl">Vídeo não encontrado</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Este vídeo pode não estar mais disponível.
            </p>
            <div className="mx-auto mt-6 w-min">
              <Link
                to="/videos"
                className="grid size-[44px] place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
              >
                <ArrowLeft className="size-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppChrome>
  );
}
