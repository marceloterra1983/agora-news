import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Bookmark, BookmarkCheck } from "lucide-react";
import type { Story } from "@/lib/news/types";
import { labelFor } from "@/lib/news/types";
import { useNewsStore } from "@/lib/news/store";
import { blurbFor } from "@/lib/news/profiles";
import { loadExtraFontes } from "@/lib/news/extra-fontes";
import { loadTweetEmbed } from "@/lib/news/server";
import { displayTitle } from "@/lib/news/format";
import { safeHttpHref } from "@/lib/news/last-post";
import { StoryAssetBlock, StoryMedia } from "./story-media";
import { GroupTag } from "./group-tag";
import { QuoteCard, LinkCard, XArticleBlock } from "./quote-card";
import { IconBtn, IconLink, Tip } from "./icon-btn";
import { XLogo } from "./x-logo";

export function ArticleView({ story }: { story: Story }) {
  const saved = useNewsStore((s) => s.savedIds.includes(story.id));
  const toggleSave = useNewsStore((s) => s.toggleSave);
  const { data: embed } = useQuery({
    queryKey: ["tweet-embed", story.id, story.source],
    queryFn: () => loadTweetEmbed({ data: { id: story.id, source: story.source } }),
    initialData: story.quoted || story.replyTo || story.card || story.xArticle
      ? {
          quoted: story.quoted ?? null,
          replyTo: story.replyTo ?? null,
          card: story.card ?? null,
          article: story.xArticle ?? null,
          assets: story.assets ?? [],
          text: story.original,
        }
      : undefined,
    staleTime: 30 * 60_000,
  });
  const quoted = embed?.quoted ?? story.quoted ?? null;
  const replyTo = embed?.replyTo ?? story.replyTo ?? null;
  const card = embed?.card ?? story.card ?? null;
  const article = embed?.article ?? story.xArticle ?? null;
  const paragraphs = (story.body || story.excerpt)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const assets =
    embed?.assets?.length
      ? embed.assets
      : story.assets?.length
        ? story.assets
        : story.image
          ? [{ type: "photo" as const, url: story.image }]
          : [];
  const whoCatalog = blurbFor(story.source, story.sourceLabel);
  const [who, setWho] = useState(whoCatalog);
  useEffect(() => {
    const key = story.source.replace(/^@+/, "").toLowerCase();
    const extra = loadExtraFontes().find((e) => e.handle.toLowerCase() === key);
    setWho(extra?.summary || whoCatalog);
  }, [story.source, whoCatalog]);
  const title = displayTitle(story.title);

  return (
    <article data-post="" className="mx-auto max-w-3xl">
      <Tip label={`Voltar para ${labelFor(story.category)}`}>
        <Link
          to="/"
          search={{ secao: story.category }}
          aria-label={`Voltar para ${labelFor(story.category)}`}
          className="grid size-8 place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
        >
          <ArrowLeft className="size-4" />
        </Link>
      </Tip>
      <p className="mt-6 flex flex-wrap items-center gap-2 text-[13px] text-mute">
        <span className="lowercase">@{story.source.replace(/^@/, "")}</span>
        <GroupTag handle={story.source} />
        <span aria-hidden>·</span>
        <span>{labelFor(story.category)}</span>
      </p>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{who}</p>
      <h1 className="mt-3 text-left font-display text-[1.4rem] font-medium leading-snug tracking-tight text-pretty sm:text-2xl">
        {title}
      </h1>
      {replyTo ? <QuoteCard quote={replyTo} /> : null}
      {assets.length ? (
        <div data-media="">
          {assets.map((asset) => (
            <StoryAssetBlock key={asset.url} asset={asset} alt={title} />
          ))}
        </div>
      ) : story.image ? (
        <div data-media="" className="mt-6 overflow-hidden rounded-lg bg-hero">
          <StoryMedia src={story.image} alt={title} className="aspect-[16/9] w-full" />
        </div>
      ) : null}
      <div className="mt-6 space-y-4 text-[1.05rem] leading-relaxed text-ink-soft">
        {paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {quoted ? <QuoteCard quote={quoted} /> : null}
      {card && card.url !== quoted?.card?.url ? <LinkCard card={card} /> : null}
      {article ? <XArticleBlock article={article} /> : null}
      {story.original && story.original !== story.body && (
        <details className="mt-8 rounded-md border border-line bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink">
            Texto original
          </summary>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
            {story.original}
          </p>
        </details>
      )}
      <div className="mt-10 flex items-center gap-1.5">
        {safeHttpHref(story.url, { allowPath: false }) ? (
          <IconLink
            href={safeHttpHref(story.url, { allowPath: false })}
            target="_blank"
            rel="noreferrer"
            data-cta="open-x"
            label="Abrir no X"
          >
            <XLogo className="size-3.5" />
          </IconLink>
        ) : null}
        <IconBtn
          label={saved ? "Remover dos salvos" : "Salvar para depois"}
          onClick={() => toggleSave(story)}
        >
          {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        </IconBtn>
      </div>
    </article>
  );
}
