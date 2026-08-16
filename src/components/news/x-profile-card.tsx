import { BadgeCheck, Bookmark, BookmarkCheck, Plus, X } from "lucide-react";
import { IconBtn, IconLink, iconBtnSolid } from "@/components/news/icon-btn";
import { XLogo } from "@/components/news/x-logo";
import { formatCount, relativeTime } from "@/lib/news/format";
import type { FoundProfile } from "@/lib/news/server";

export type { FoundProfile };

export function ProfileCard({
  result,
  summary,
  summarizing,
  known,
  saved,
  inFontes,
  nested,
  showFace = true,
  onSave,
  onRemove,
  onAddFonte,
  onRemoveFonte,
}: {
  result: FoundProfile;
  summary: string;
  summarizing: boolean;
  known: boolean;
  saved: boolean;
  inFontes: boolean;
  nested?: boolean;
  showFace?: boolean;
  onSave: () => void;
  onRemove: () => void;
  onAddFonte: () => void;
  onRemoveFonte: () => void;
}) {
  return (
    <article
      className={`border-t border-line bg-paper ${nested ? "rounded-none border-x-0" : "mt-5 overflow-hidden rounded-lg border border-line bg-card"}`}
    >
      <div className="flex gap-3 p-4">
        {showFace &&
          (result.avatar ? (
            <img
              src={result.avatar}
              alt=""
              className="size-14 shrink-0 rounded-full bg-paper-2 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-paper-2 text-lg font-medium text-mute">
              {result.name.charAt(0)}
            </span>
          ))}
        <div className="min-w-0 flex-1">
          {showFace ? (
            <>
              <p className="flex items-center gap-1 truncate text-base font-medium text-ink">
                {result.name}
                {result.verified ? <BadgeCheck className="size-4 shrink-0 text-ink" /> : null}
              </p>
              <p className="text-sm text-mute">@{result.handle}</p>
            </>
          ) : null}
          <p className={showFace ? "mt-1 text-xs text-mute" : "text-xs text-mute"}>
            {formatCount(result.followers)} seguidores
            {known ? " · já está no feed" : " · novo"}
          </p>
          <p className="mt-2 text-sm leading-snug text-ink-soft">
            {summary || (summarizing ? "Gerando resumo…" : "")}
          </p>
        </div>
      </div>
      {result.lastPost ? (
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            Último post
            <time dateTime={result.lastPost.publishedAt} className="font-normal normal-case tracking-normal">
              {" "}
              · {relativeTime(result.lastPost.publishedAt)}
            </time>
          </p>
          <a
            href={result.lastPost.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 block text-sm leading-snug text-ink"
          >
            {result.lastPost.text.length > 220
              ? `${result.lastPost.text.slice(0, 217).trimEnd()}…`
              : result.lastPost.text}
          </a>
        </div>
      ) : null}
      <div className="flex items-center gap-1.5 border-t border-line px-3 py-2">
        {known ? (
          <span className="mr-auto text-xs text-mute">Já no feed</span>
        ) : inFontes ? (
          <IconBtn label="Remover das Fontes" onClick={onRemoveFonte}>
            <X className="size-4" />
          </IconBtn>
        ) : (
          <IconBtn label="Adicionar às Fontes" onClick={onAddFonte} className={iconBtnSolid}>
            <Plus className="size-4" />
          </IconBtn>
        )}
        {known ? null : saved ? (
          <IconBtn label="Remover interesse" onClick={onRemove}>
            <BookmarkCheck className="size-4" />
          </IconBtn>
        ) : (
          <IconBtn label="Salvar interesse" onClick={onSave}>
            <Bookmark className="size-4" />
          </IconBtn>
        )}
        <IconLink
          href={`https://x.com/${result.handle}`}
          target="_blank"
          rel="noreferrer"
          label="Abrir no X"
        >
          <XLogo className="size-3.5" />
        </IconLink>
      </div>
    </article>
  );
}
