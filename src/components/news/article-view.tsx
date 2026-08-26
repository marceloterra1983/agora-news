import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { HistoryBackButton } from "./history-back";
import type { Story } from "@/lib/news/types";
import { labelFor } from "@/lib/news/types";
import { useNewsStore } from "@/lib/news/store";
import { blurbFor } from "@/lib/news/profiles";
import { extraAvatarFor, loadExtraFontes } from "@/lib/news/extra-fontes";
import { resolveFace } from "@/lib/news/profile-store-core.mjs";
import { loadTweetEmbed } from "@/lib/news/server";
import { displayBody, displayTitle, relativeTime } from "@/lib/news/format";
import { displaySourceByline, displaySourceInitial } from "@/lib/news/rss-catalog.mjs";
import { safeHttpHref } from "@/lib/news/last-post";
import { isDistinctTitle } from "@/lib/news/story-pt.mjs";
import { StoryAssetBlock } from "./story-media";
import { GroupTag } from "./group-tag";
import { QuoteCard, LinkCard, XArticleBlock } from "./quote-card";
import { PostText } from "./written-link";
import { IconBtn, IconLink } from "./icon-btn";
import { XLogo } from "./x-logo";

export function ArticleView({ story }: { story: Story }) {
  const saved = useNewsStore((s) => s.savedIds.includes(story.id));
  const toggleSave = useNewsStore((s) => s.toggleSave);
  const packed = Boolean(
    story.quoted ||
      story.replyTo ||
      story.card ||
      story.xArticle ||
      story.assets?.length,
  );
  const { data: embed } = useQuery({
    queryKey: ["tweet-embed", story.id, story.source],
    queryFn: () =>
      loadTweetEmbed({ data: { id: story.id, source: story.source } }),
    initialData: packed
      ? {
          quoted: story.quoted ?? null,
          replyTo: story.replyTo ?? null,
          card: story.card ?? null,
          article: story.xArticle ?? null,
          assets: story.assets ?? [],
          text: story.original,
        }
      : undefined,
    enabled: !packed,
    staleTime: 30 * 60_000,
  });
  const quoted = embed?.quoted ?? story.quoted ?? null;
  const replyTo = embed?.replyTo ?? story.replyTo ?? null;
  const card = embed?.card ?? story.card ?? null;
  const article = embed?.article ?? story.xArticle ?? null;
  const assets = embed?.assets?.length
    ? embed.assets
    : story.assets?.length
      ? story.assets
      : story.image
        ? [{ type: "photo" as const, url: story.image }]
        : [];
  const whoCatalog = blurbFor(story.source, story.sourceLabel);
  const [who, setWho] = useState(whoCatalog);
  const [face, setFace] = useState(() => resolveFace(story.avatar));
  useEffect(() => {
    const key = story.source.replace(/^@+/, "").toLowerCase();
    const extra = loadExtraFontes().find((e) => e.handle.toLowerCase() === key);
    setWho(extra?.summary || whoCatalog);
    setFace(resolveFace(story.avatar, extra?.avatar || extraAvatarFor(story.source)));
  }, [story.avatar, story.source, whoCatalog]);
  const title = displayTitle(story.title);
  const bodyText = story.body || story.excerpt;
  const showTitle = isDistinctTitle(title, displayBody(bodyText));
  const byline = displaySourceByline(story.source, story.sourceLabel);
  const initial = displaySourceInitial(story.source, story.sourceLabel);

  return (
    <article data-post="" className="mx-auto max-w-3xl max-sm:max-w-none">
      <HistoryBackButton
        fallbackSecao={story.category}
        label={`Voltar para ${labelFor(story.category)}`}
      />
      <p className="mt-6 flex items-start gap-2.5 text-[13px] text-mute">
        {face ? (
          <img
            src={face}
            alt=""
            width={44}
            height={44}
            referrerPolicy="no-referrer"
            className="size-[44px] shrink-0 rounded-full bg-paper-2 object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-[44px] shrink-0 place-items-center rounded-full bg-paper-2 text-[11px] font-medium text-ink"
          >
            {initial}
          </span>
        )}
        <span className="flex min-w-0 flex-wrap items-center gap-1.5 pt-1.5">
          <span className={byline.startsWith("@") ? "break-all lowercase" : "break-all"}>
            {byline}
          </span>
          <GroupTag handle={story.source} />
          <span aria-hidden> · </span>
          <time dateTime={story.publishedAt} suppressHydrationWarning>
            {relativeTime(story.publishedAt)}
          </time>
        </span>
      </p>
      <h1
        className={
          showTitle
            ? "mt-3 text-left font-display text-[1.4rem] font-medium leading-snug tracking-tight text-pretty sm:text-2xl"
            : "sr-only"
        }
      >
        {title}
      </h1>
      {replyTo ? <QuoteCard quote={replyTo} /> : null}
      {assets.length ? (
        <div data-media="">
          {assets.map((asset, index) => (
            <StoryAssetBlock
              key={asset.url}
              asset={asset}
              alt={title}
              priority={index === 0}
            />
          ))}
        </div>
      ) : null}
      <PostText
        text={bodyText}
        linkText={`${story.title}\n${bodyText}`}
        skipHref={story.url}
        className="mt-6 whitespace-pre-wrap break-words text-[1.05rem] leading-relaxed text-ink-soft"
      />
      {quoted ? <QuoteCard quote={quoted} /> : null}
      {card && card.url !== quoted?.card?.url ? <LinkCard card={card} /> : null}
      {article ? <XArticleBlock article={article} /> : null}
      {story.original && story.original !== story.body && (
        <details className="mt-8 rounded-md border border-line bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Texto original
          </summary>
          <PostText
            text={story.original}
            skipHref={story.url}
            className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft"
          />
        </details>
      )}
      {who ? (
        <p className="mt-8 border-t border-line pt-4 text-[14px] leading-relaxed text-ink-soft">
          <span className="font-semibold text-ink">
            Sobre {byline}
          </span>{" "}
          · {who}
        </p>
      ) : null}
      <div className="mt-10 flex items-center gap-1.5">
        {safeHttpHref(story.url, { allowPath: false }) ? (
          <IconLink
            href={safeHttpHref(story.url, { allowPath: false })}
            target="_blank"
            rel="noreferrer"
            data-cta="open-x"
            label={byline.startsWith("@") ? "Abrir no X" : "Abrir matéria"}
          >
            <XLogo className="size-3.5" />
          </IconLink>
        ) : null}
        <IconBtn
          label={saved ? "Remover dos salvos" : "Salvar para depois"}
          aria-pressed={saved}
          onClick={() => toggleSave(story)}
        >
          {saved ? (
            <BookmarkCheck className="size-4 text-mark" />
          ) : (
            <Bookmark className="size-4" />
          )}
        </IconBtn>
      </div>
    </article>
  );
}
