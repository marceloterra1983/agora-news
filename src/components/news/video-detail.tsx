import { ExternalLink } from "lucide-react";
import type { VideoWithChannel } from "@/lib/news/youtube-types";
import { formatRelativeTime } from "@/lib/news/format";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function VideoDetail({ video }: { video: VideoWithChannel }) {
  return (
    <article className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center gap-2 text-xs text-mute">
        <span>{video.channel?.name || video.channel_id}</span>
        <span>·</span>
        <span>{formatRelativeTime(video.published_at)}</span>
        {video.duration_seconds && (
          <>
            <span>·</span>
            <span>{formatDuration(video.duration_seconds)}</span>
          </>
        )}
        {video.was_live && (
          <>
            <span>·</span>
            <span className="inline-flex items-center rounded-full bg-mark/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-mark">
              Ao Vivo
            </span>
          </>
        )}
      </div>

      <h1 className="font-display text-3xl leading-tight tracking-tight">
        {video.title}
      </h1>

      <p className="mt-4 text-lg leading-relaxed text-ink-soft">
        {video.headline}
      </p>

      <div className="relative mt-6 aspect-video w-full overflow-hidden rounded-lg bg-paper-2">
        <img
          src={video.thumbnail_url}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>

      <div className="mt-6 prose prose-sm max-w-none">
        {video.summary_pt.split("\n\n").map((para, i) => (
          <p key={i} className="leading-relaxed text-ink">
            {para}
          </p>
        ))}
      </div>

      <div className="mt-8">
        <a
          href={video.watch_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-3 font-semibold text-paper hover:bg-ink/90 transition-colors no-underline"
        >
          <span>Assistir no YouTube</span>
          <ExternalLink className="size-4" />
        </a>
      </div>
    </article>
  );
}
