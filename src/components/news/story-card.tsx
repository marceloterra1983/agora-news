import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { Story } from "@/lib/news/types";
import { relativeTime, displayTitle } from "@/lib/news/format";
import { useNewsStore } from "@/lib/news/store";
import { cn } from "@/lib/utils";
import { StoryMedia } from "./story-media";
import { GroupTag } from "./group-tag";
import { Tip } from "./icon-btn";

export function StoryCard({
  story,
  variant = "grid",
  unread = false,
}: {
  story: Story;
  variant?: "grid" | "row" | "compact" | "reader";
  unread?: boolean;
}) {
  const saved = useNewsStore((s) => s.savedIds.includes(story.id));
  const toggleSave = useNewsStore((s) => s.toggleSave);

  if (variant === "reader") {
    return (
      <article
        data-story=""
        data-unread={unread ? "1" : "0"}
        className="relative border-b border-line py-6 first:pt-5"
      >
        {unread ? (
          <span
            data-unread-mark=""
            aria-hidden
            className="absolute bottom-6 left-0 top-6 w-0.5 rounded-full bg-mark"
          />
        ) : null}
        <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-mute">
          {story.avatar ? (
            <img
              src={story.avatar}
              alt=""
              referrerPolicy="no-referrer"
              className="size-6 shrink-0 rounded-full bg-paper-2 object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-6 shrink-0 place-items-center rounded-full bg-paper-2 text-[10px] font-medium text-ink"
            >
              {story.source.replace(/^@/, "").charAt(0).toUpperCase()}
            </span>
          )}
          <span className="lowercase">@{story.source.replace(/^@/, "")}</span>
          <GroupTag handle={story.source} />
          <span aria-hidden>·</span>
          <time dateTime={story.publishedAt} suppressHydrationWarning>
            {relativeTime(story.publishedAt)}
          </time>
        </p>
        <h3 className="break-words font-display text-[1.25rem] font-medium leading-snug tracking-tight text-ink">
          <Link to="/materia/$id" params={{ id: story.id }}>
            {displayTitle(story.title)}
          </Link>
        </h3>
        {story.image ? (
          <Link
            to="/materia/$id"
            params={{ id: story.id }}
            className="mt-4 block overflow-hidden rounded-2xl bg-hero"
            data-media=""
          >
            <StoryMedia
              src={story.image}
              alt={story.title}
              className="aspect-[16/11] w-full"
            />
          </Link>
        ) : null}
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group relative",
        variant === "grid" && "flex flex-col gap-3",
        variant === "row" &&
          "grid grid-cols-[7.5rem_1fr] gap-4 sm:grid-cols-[11rem_1fr]",
        variant === "compact" && "flex flex-col gap-1.5",
      )}
    >
      {variant !== "compact" && (
        <Link
          to="/materia/$id"
          params={{ id: story.id }}
          data-media=""
          className={cn(
            "relative block overflow-hidden rounded-md bg-hero",
            variant === "grid" && "aspect-[16/10]",
            variant === "row" && "aspect-[4/3] self-start",
          )}
        >
          <StoryMedia
            src={story.image}
            alt={story.title}
            className="size-full transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        </Link>
      )}
      <div className="min-w-0">
        <p className="mb-1.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">
          <span className="text-mark">{story.sourceLabel}</span>
          <GroupTag handle={story.source} className="normal-case tracking-normal" />
          <span aria-hidden>·</span>
          <time dateTime={story.publishedAt} suppressHydrationWarning>
            {relativeTime(story.publishedAt)}
          </time>
        </p>
        <h3
          className={cn(
            "font-display font-medium leading-snug tracking-tight text-ink",
            variant === "compact" ? "text-base" : "text-lg sm:text-xl",
          )}
        >
          <Link
            to="/materia/$id"
            params={{ id: story.id }}
            className="rounded-sm outline-none hover:text-mark focus-visible:ring-2 focus-visible:ring-ink/20"
          >
            {displayTitle(story.title)}
          </Link>
        </h3>
        {variant !== "compact" && story.excerpt && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">
            {story.excerpt}
          </p>
        )}
        <Tip label={saved ? "Remover dos salvos" : "Salvar matéria"}>
          <button
            type="button"
            onClick={() => toggleSave(story)}
            aria-pressed={saved}
            aria-label={saved ? "Remover dos salvos" : "Salvar matéria"}
            className="mt-2 grid size-8 place-items-center rounded-full text-mute hover:bg-paper-2 hover:text-ink"
          >
            {saved ? (
              <BookmarkCheck className="size-4 text-mark" />
            ) : (
              <Bookmark className="size-4" />
            )}
          </button>
        </Tip>
      </div>
    </article>
  );
}
