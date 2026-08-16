import type { StoryQuote, StoryQuoteCard, StoryXArticle } from "@/lib/news/types";
import { safeHttpHref } from "@/lib/news/last-post";
import { GroupTag } from "./group-tag";
import { IconLink, Tip } from "./icon-btn";
import { XLogo } from "./x-logo";

const KIND_LABEL: Record<StoryQuote["kind"], string> = {
  quote: "Citando",
  repost: "Republicou",
  reply: "Respondendo a",
};

export function LinkCard({ card }: { card: StoryQuoteCard }) {
  const href = safeHttpHref(card.url, { allowPath: false });
  if (!href && !card.title) return null;
  const inner = (
    <>
      {card.image ? (
        <img
          src={card.image}
          alt=""
          className="aspect-[1.91/1] w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span className="block px-4 py-3">
        {card.domain ? <span className="block text-[11px] text-mute">{card.domain}</span> : null}
        <span className="mt-0.5 block text-sm font-medium text-ink">{card.title}</span>
        {card.description ? (
          <span className="mt-0.5 block line-clamp-2 text-[12px] text-mute">{card.description}</span>
        ) : null}
      </span>
    </>
  );
  const cls = "mt-6 block overflow-hidden rounded-xl border border-line bg-card";
  if (!href) return <div className={cls}>{inner}</div>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  );
}

export function XArticleBlock({ article }: { article: StoryXArticle }) {
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-line bg-card">
      <p className="border-b border-line px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-mute">
        Artigo no X
      </p>
      {article.cover ? (
        <img
          src={article.cover}
          alt=""
          className="aspect-[16/8] w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <div className="p-4">
        <h2 className="font-display text-xl font-medium leading-snug text-ink">{article.title}</h2>
        {article.paragraphs.length ? (
          <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-soft">
            {article.paragraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
        ) : article.preview ? (
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{article.preview}</p>
        ) : null}
        {safeHttpHref(article.url, { allowPath: false }) ? (
          <IconLink
            href={safeHttpHref(article.url, { allowPath: false })}
            target="_blank"
            rel="noreferrer"
            label="Ler artigo completo no X"
            className="mt-4"
          >
            <XLogo className="size-3.5" />
          </IconLink>
        ) : null}
      </div>
    </section>
  );
}

export function QuoteCard({ quote }: { quote: StoryQuote }) {
  return (
    <aside className="mt-6 overflow-hidden rounded-xl border border-line bg-card">
      <p className="border-b border-line px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-mute">
        {KIND_LABEL[quote.kind]} @{quote.handle}
      </p>
      <div className="p-4">
        <div className="flex items-center gap-2">
          {quote.avatar ? (
            <img
              src={quote.avatar}
              alt=""
              className="size-7 rounded-full bg-paper-2 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="grid size-7 place-items-center rounded-full bg-paper-2 text-[11px] font-medium text-mute">
              {(quote.name || quote.handle).charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{quote.name}</p>
            <p className="flex items-center gap-1.5 text-[12px] text-mute">
              <span className="lowercase">@{quote.handle}</span>
              <GroupTag handle={quote.handle} />
            </p>
          </div>
        </div>
        {quote.text ? (
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{quote.text}</p>
        ) : null}
        {quote.card ? <div className="-mt-2"><LinkCard card={quote.card} /></div> : null}
        {!quote.card && quote.image ? (
          <img
            src={quote.image}
            alt=""
            className="mt-3 w-full rounded-lg object-contain"
            referrerPolicy="no-referrer"
          />
        ) : null}
        {safeHttpHref(quote.url, { allowPath: false }) ? (
          <Tip label="Abrir post original">
            <a
              href={safeHttpHref(quote.url, { allowPath: false })}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir post original"
              className="mt-3 grid size-[44px] place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
            >
              <XLogo className="size-3.5" />
            </a>
          </Tip>
        ) : null}
      </div>
    </aside>
  );
}
