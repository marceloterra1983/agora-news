import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppChrome } from "@/components/news/app-chrome";
import { VideoCard } from "@/components/news/video-card";
import { routeMeta } from "@/lib/news/route-meta";
import { loadVideos } from "@/lib/news/server-youtube";
import { cn } from "@/lib/utils";

type VideosSearch = { canal?: string };

export const Route = createFileRoute("/videos")({
  head: () => ({
    meta: routeMeta("Vídeos", "Resumos de vídeos do YouTube em português."),
  }),
  validateSearch: (raw: Record<string, unknown>): VideosSearch => ({
    canal:
      typeof raw.canal === "string" && raw.canal.trim()
        ? raw.canal.trim()
        : undefined,
  }),
  loader: async ({ context }) => {
    return loadVideos({ data: { channelId: undefined } });
  },
  component: VideosPage,
});

function VideosPage() {
  const { canal } = Route.useSearch();
  const loaded = Route.useLoaderData();
  const { data, isLoading } = useQuery({
    queryKey: ["videos", canal],
    queryFn: () => loadVideos({ data: { channelId: canal } }),
    initialData: canal ? undefined : loaded,
    staleTime: 60_000,
    refetchOnMount: false,
  });

  const videos = data?.videos ?? [];
  const channels = data?.channels ?? [];

  return (
    <AppChrome category="ai">
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 max-sm:max-w-none">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mark">
          YouTube
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">Vídeos</h1>

        {channels.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.delete("canal");
                window.history.pushState({}, "", url);
                window.location.reload();
              }}
              className={cn(
                "inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors",
                !canal
                  ? "bg-ink text-paper"
                  : "bg-paper-2 text-mute hover:bg-paper-2/80",
              )}
            >
              Todos
            </button>
            {channels.map((ch) => (
              <button
                key={ch.channel_id}
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("canal", ch.channel_id);
                  window.history.pushState({}, "", url);
                  window.location.reload();
                }}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors",
                  canal === ch.channel_id
                    ? "bg-ink text-paper"
                    : "bg-paper-2 text-mute hover:bg-paper-2/80",
                )}
              >
                {ch.name}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="mt-8 text-ink-soft">Carregando...</div>
        ) : videos.length === 0 ? (
          <div className="mt-12 max-w-md">
            <p className="text-ink-soft">Nenhum vídeo ainda.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video.video_id} video={video} />
            ))}
          </div>
        )}
      </div>
    </AppChrome>
  );
}
