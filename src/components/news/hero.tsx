import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { Story } from "@/lib/news/types";
import { relativeTime, displayTitle } from "@/lib/news/format";
import { useNewsStore } from "@/lib/news/store";
import { StoryMedia } from "./story-media";
import { StoryCard } from "./story-card";
import { Tip } from "./icon-btn";

export function Hero({
  featured,
  side,
}: {
  featured: Story;
  side: Story[];
}) {
  const saved = useNewsStore((s) => s.savedIds.includes(featured.id));
  const toggleSave = useNewsStore((s) => s.toggleSave);

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)] lg:gap-8">
      <article className="group">
        <Link
          to="/materia/$id"
          params={{ id: featured.id }}
          className="relative block aspect-[16/10] overflow-hidden rounded-lg bg-hero sm:aspect-[16/9]"
        >
          <StoryMedia
            src={featured.image}
            alt={featured.title}
            className="size-full transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          />
        </Link>
        <p className="mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">
          <span className="text-mark">{featured.sourceLabel}</span>
          <span aria-hidden>·</span>
          <time dateTime={featured.publishedAt}>
            {relativeTime(featured.publishedAt)}
          </time>
        </p>
        <h2 className="mt-2 font-display text-3xl font-medium leading-[1.12] tracking-tight text-ink sm:text-4xl">
          <Link
            to="/materia/$id"
            params={{ id: featured.id }}
            className="hover:text-mark"
          >
            {displayTitle(featured.title)}
          </Link>
        </h2>
        {featured.excerpt && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
            {featured.excerpt}
          </p>
        )}
        <Tip label={saved ? "Remover dos salvos" : "Salvar matéria"}>
          <button
            type="button"
            onClick={() => toggleSave(featured)}
            aria-label={saved ? "Remover dos salvos" : "Salvar matéria"}
            className="mt-3 grid size-8 place-items-center rounded-full text-mute hover:bg-paper-2 hover:text-ink"
          >
            {saved ? (
              <BookmarkCheck className="size-4 text-mark" />
            ) : (
              <Bookmark className="size-4" />
            )}
          </button>
        </Tip>
      </article>
      <div className="flex flex-col divide-y divide-line border-t border-line lg:border-t-0 lg:border-l lg:pl-8">
        {side.map((story) => (
          <div key={story.id} className="py-4 first:pt-0 last:pb-0">
            <StoryCard story={story} variant="compact" />
          </div>
        ))}
      </div>
    </section>
  );
}
