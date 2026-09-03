import { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractYouTubeId } from "@/lib/news/youtube-core.mjs";
import { StoryMedia } from "./story-media";

export function YouTubeEmbed({
  videoId,
  title,
  poster,
  priority = false,
  autoPlay = false,
  className,
}: {
  videoId: string;
  title: string;
  poster?: string | null;
  priority?: boolean;
  autoPlay?: boolean;
  className?: string;
}) {
  const [active, setActive] = useState(autoPlay);
  const cleanId = extractYouTubeId(videoId);
  const thumb = poster || (cleanId ? `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg` : null);

  const isPlayerActive = active || autoPlay;

  if (!cleanId) {
    return (
      <StoryMedia
        src={thumb}
        alt={title}
        priority={priority}
        className={cn("mt-6 aspect-[16/9] w-full rounded-lg", className)}
      />
    );
  }

  if (!isPlayerActive) {
    return (
      <div
        data-youtube-facade=""
        className={cn(
          "group relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-lg bg-hero shadow-sm",
          className,
        )}
      >
        <StoryMedia
          src={thumb}
          alt={title}
          priority={priority}
          className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <button
          type="button"
          data-testid="youtube-play-btn"
          onClick={() => setActive(true)}
          aria-label={`Reproduzir vídeo: ${title}`}
          className="absolute inset-0 grid place-items-center bg-hero/70 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mark"
        >
          <span className="grid size-10 place-items-center rounded-full bg-paper text-ink shadow-sm">
            <Play className="size-4" aria-hidden />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      data-youtube-player=""
      className={cn("relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-lg bg-black", className)}
    >
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${cleanId}?autoplay=1&rel=0&modestbranding=1`}
        title={`Vídeo: ${title}`}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        className="size-full border-0"
      />
    </div>
  );
}
