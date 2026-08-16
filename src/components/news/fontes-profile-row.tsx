import { BadgeCheck, CheckSquare, ChevronDown, Eye, MessageCircle, Percent, Square } from "lucide-react";
import { FonteControls, FonteDisabledBadge } from "@/components/news/fonte-controls";
import { ProfileEr } from "@/components/news/fontes-profile-er";
import { GroupTag } from "@/components/news/group-tag";
import { Tip } from "@/components/news/icon-btn";
import { XLogo } from "@/components/news/x-logo";
import { formatPostEr, formatPostQuality, formatPostReach } from "@/lib/news/fonte-metrics";
import { displayTitle, formatCount, relativeTime } from "@/lib/news/format";
import type { InfluenceRow } from "@/lib/news/influence";
import { groupLabel } from "@/lib/news/groups";
import { safeHttpHref } from "@/lib/news/last-post";
import { blurbFor } from "@/lib/news/profiles";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";
import { cn } from "@/lib/utils";

export function ProfileRow({
  row,
  index,
  open,
  prefs,
  hideGroup,
  picking,
  picked,
  onToggle,
  onToggleNotify,
}: {
  row: InfluenceRow;
  index: number;
  open: boolean;
  prefs: ReturnType<typeof useFontesPrefs>;
  hideGroup?: boolean;
  picking?: boolean;
  picked?: boolean;
  onToggle: () => void;
  onToggleNotify: (handle: string) => void;
}) {
  const pausedRow = prefs.isDisabled(row.handle);
  const followers = row.followers ? formatCount(row.followers) : "";
  const lastHref = row.lastPost ? safeHttpHref(row.lastPost.href) : "";
  return (
    <li data-testid="fonte-row" className={cn("border-b border-line", pausedRow && "opacity-55")}>
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
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-ink">{row.name}</span>
              {row.verified ? (
                <BadgeCheck className="size-3 shrink-0 text-ink" aria-label="verificado" />
              ) : null}
              {followers ? (
                <span className="shrink-0 text-[11px] tabular-nums text-mute">{followers}</span>
              ) : null}
              <GroupTag group={row.group} />
              {picking ? (
                picked ? (
                  <CheckSquare className="size-3.5 shrink-0 text-ink" />
                ) : (
                  <Square className="size-3.5 shrink-0 text-mute" />
                )
              ) : null}
              <FonteDisabledBadge show={pausedRow} />
              <ChevronDown
                className={cn(
                  "size-3 shrink-0 text-mute transition-transform",
                  open && "rotate-180",
                )}
              />
            </span>
            {row.lastPost?.title ? (
              <span className="mt-0.5 block truncate text-[11px] leading-snug text-mute">
                {displayTitle(row.lastPost.title)}
              </span>
            ) : null}
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-mute">
              {row.lastPost ? (
                <>
                  <time dateTime={row.lastPost.publishedAt} suppressHydrationWarning className="shrink-0 tabular-nums">
                    {relativeTime(row.lastPost.publishedAt)}
                  </time>
                  {[
                    { key: "er", label: "Engajamento", value: formatPostEr(row.lastPost), Icon: Percent },
                    { key: "alc", label: "Alcance", value: formatPostReach(row.lastPost, row.followers), Icon: Eye },
                    { key: "ql", label: "Qualidade", value: formatPostQuality(row.lastPost), Icon: MessageCircle },
                  ]
                    .filter((m) => m.value)
                    .map((m) => (
                      <Tip key={m.key} label={`${m.label} ${m.value}`}>
                        <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums">
                          <m.Icon className="size-3" aria-hidden />
                          <span className="sr-only">{m.label} </span>
                          {m.value}
                        </span>
                      </Tip>
                    ))}
                </>
              ) : null}
            </span>
          </span>
        </button>
      </div>

      {open ? (
        <div className="mb-2.5 ml-7 mr-0.5 rounded-md bg-paper-2 px-3 py-2.5">
          {hideGroup || row.group === "novos" ? null : (
            <p className="text-[12px] font-medium text-mute">{groupLabel(row.group)}</p>
          )}
          <p className={cn("text-[13px] leading-relaxed text-ink-soft", !hideGroup && row.group !== "novos" && "mt-1")}>
            {row.group === "novos" && row.bio ? row.bio : blurbFor(row.handle, row.name)}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-mute">
            {row.followers ? <span>{formatCount(row.followers)} seguidores</span> : null}
            <ProfileEr handle={row.handle} fallback={row.er} />
          </p>
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
            {row.lastPost && lastHref ? (
              <a
                href={lastHref}
                target={lastHref.startsWith("http") ? "_blank" : undefined}
                rel={lastHref.startsWith("http") ? "noreferrer" : undefined}
                className="mt-1 block text-sm font-medium leading-snug text-ink"
              >
                {row.lastPost.title}
              </a>
            ) : (
              <p className="mt-1 text-sm text-mute">Nenhum post encontrado.</p>
            )}
          </div>
          <div className="mt-3 flex items-center gap-1">
            <Tip label={`Abrir @${row.handle} no X`}>
              <a
                href={`https://x.com/${row.handle}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`Abrir @${row.handle} no X`}
                className="grid size-8 place-items-center rounded-full border border-line text-ink hover:bg-paper"
              >
                <XLogo className="size-3.5" />
              </a>
            </Tip>
            <FonteControls
              handle={row.handle}
              starred={prefs.isStarred(row.handle)}
              disabled={pausedRow}
              notify={prefs.isNotify(row.handle)}
              group={row.group}
              onToggleStar={prefs.toggleStar}
              onToggleDisabled={prefs.toggleDisabled}
              onToggleNotify={onToggleNotify}
              onSetGroup={prefs.setGroup}
            />
          </div>
        </div>
      ) : null}
    </li>
  );
}
