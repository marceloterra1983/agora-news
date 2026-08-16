import { BadgeCheck, ChevronDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { FonteControls, FonteDisabledBadge } from "@/components/news/fonte-controls";
import { Tip } from "@/components/news/icon-btn";
import { XLogo } from "@/components/news/x-logo";
import { formatCount, type InfluenceRow } from "@/lib/news/influence";
import { relativeTime } from "@/lib/news/format";
import { blurbFor, GROUP_LABELS } from "@/lib/news/profiles";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";
import { cn } from "@/lib/utils";

export function ProfileRow({
  row,
  index,
  open,
  prefs,
  hideGroup,
  onToggle,
  onToggleNotify,
}: {
  row: InfluenceRow;
  index: number;
  open: boolean;
  prefs: ReturnType<typeof useFontesPrefs>;
  hideGroup?: boolean;
  onToggle: () => void;
  onToggleNotify: (handle: string) => void;
}) {
  const pausedRow = prefs.isDisabled(row.handle);
  const followers = row.followers ? formatCount(row.followers) : "";
  return (
    <li className={cn("border-b border-line", pausedRow && "opacity-55")}>
      <div className="flex items-start gap-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left"
        >
          <span className="w-4 shrink-0 text-right font-mono text-[10px] tabular-nums text-mute">
            {index + 1}
          </span>
          {row.avatar ? (
            <img
              src={row.avatar}
              alt=""
              className="size-7 shrink-0 rounded-full bg-paper-2 object-cover"
            />
          ) : (
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-paper-2 text-[10px] font-medium text-mute">
              {row.name.charAt(0)}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <span className="truncate text-sm font-medium text-ink">{row.name}</span>
              {row.verified ? (
                <BadgeCheck className="size-3 shrink-0 text-ink" aria-label="verificado" />
              ) : null}
              <FonteDisabledBadge show={pausedRow} />
              <ChevronDown
                className={cn(
                  "size-3 shrink-0 text-mute transition-transform",
                  open && "rotate-180",
                )}
              />
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-mute">
              {GROUP_LABELS[row.group] && row.group !== "novos" ? (
                <span className="inline-flex h-4 shrink-0 items-center rounded-full bg-paper-2 px-1.5 text-[9px] font-semibold leading-none text-ink-soft">
                  {GROUP_LABELS[row.group]}
                </span>
              ) : (
                <span className="truncate">@{row.handle}</span>
              )}
              {row.lastPost ? (
                <>
                  <span className="shrink-0 text-line-strong">·</span>
                  <time dateTime={row.lastPost.publishedAt} suppressHydrationWarning className="shrink-0 tabular-nums">
                    {relativeTime(row.lastPost.publishedAt)}
                  </time>
                </>
              ) : null}
              {followers ? (
                <>
                  <span className="shrink-0 text-line-strong">·</span>
                  <span className="shrink-0 tabular-nums">{followers}</span>
                </>
              ) : null}
            </span>
          </span>
        </button>
        <FonteControls
          handle={row.handle}
          starred={prefs.isStarred(row.handle)}
          disabled={pausedRow}
          notify={prefs.isNotify(row.handle)}
          onToggleStar={prefs.toggleStar}
          onToggleDisabled={prefs.toggleDisabled}
          onToggleNotify={onToggleNotify}
        />
      </div>

      {open ? (
        <div className="mb-2.5 ml-7 mr-0.5 rounded-md bg-paper-2 px-3 py-2.5">
          {hideGroup || row.group === "novos" ? null : (
            <p className="text-[12px] font-medium text-mute">{GROUP_LABELS[row.group]}</p>
          )}
          <p className={cn("text-[13px] leading-relaxed text-ink-soft", !hideGroup && row.group !== "novos" && "mt-1")}>
            {row.group === "novos" && row.bio ? row.bio : blurbFor(row.handle, row.name)}
          </p>
          {row.followers ? (
            <p className="mt-2 text-[12px] text-mute">{formatCount(row.followers)} seguidores</p>
          ) : null}
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              Último post
              {row.lastPost ? (
                <>
                  {" "}
                  <time dateTime={row.lastPost.publishedAt} suppressHydrationWarning>
                    · {relativeTime(row.lastPost.publishedAt)}
                  </time>
                </>
              ) : null}
            </p>
            {row.lastPost ? (
              <Link
                to="/materia/$id"
                params={{ id: row.lastPost.id }}
                className="mt-1 block text-sm font-medium leading-snug text-ink"
              >
                {row.lastPost.title}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-mute">Nenhum post nas últimas 48 horas.</p>
            )}
          </div>
          <Tip label={`Abrir @${row.handle} no X`}>
            <a
              href={`https://x.com/${row.handle}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Abrir @${row.handle} no X`}
              className="mt-3 grid size-8 place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
            >
              <XLogo className="size-3.5" />
            </a>
          </Tip>
        </div>
      ) : null}
    </li>
  );
}
