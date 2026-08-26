import { Link } from "@tanstack/react-router";
import type { VideoWithChannel } from "@/lib/news/youtube-types";
import { formatRelativeTime } from "@/lib/news/format";

export function VideoCard({ video }: { video: VideoWithChannel }) {
  return (
    <Link
      to="/videos/$videoId"
      params={{ videoId: video.video_id }}
      className="group block overflow-hidden rounded-lg border border-line bg-paper hover:border-ink-soft transition-colors no-underline"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-paper-2">
        <img
          src={video.thumbnail_url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="p-4">
        <p className="text-xs text-mute">
          {video.channel?.name || video.channel_id} ·{" "}
          {formatRelativeTime(video.published_at)}
        </p>
        <h3 className="mt-1 font-semibold leading-snug text-ink group-hover:text-ink">
          {video.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft line-clamp-2">
          {video.headline}
        </p>
      </div>
    </Link>
  );
}
