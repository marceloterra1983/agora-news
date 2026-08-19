import { BadgeCheck, CheckSquare, ChevronDown, Square } from "lucide-react";
import { FonteControls, FonteDisabledBadge } from "@/components/news/fonte-controls";
import { ClosedPostMeta } from "@/components/news/fontes-closed-post";
import { ProfileEr } from "@/components/news/fontes-profile-er";
import { GroupTag } from "@/components/news/group-tag";
import { Tip } from "@/components/news/icon-btn";
import { XLogo } from "@/components/news/x-logo";
import { FonteLastPosts } from "@/components/news/fontes-last-posts";
import { displayTitle, formatCount } from "@/lib/news/format";
import type { InfluenceRow } from "@/lib/news/influence";
import { groupLabel } from "@/lib/news/groups";
import { safeHttpHref } from "@/lib/news/last-post";
import { displayBlurb } from "@/lib/news/profiles";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

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
  const actionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    actionsRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [open]);
  return (
    <li data-testid="fonte-row" className="border-b border-line">
      <div className="flex items-start gap-1">
        <button
          type="button"
          aria-expanded={picking ? undefined : open}
          aria-pressed={picking ? Boolean(picked) : undefined}
          onClick={onToggle}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2.5 py-2 text-left"
        >
          <span className="w-4 shrink-0 text-right font-mono text-[10px] tabular-nums text-mute">
            {index + 1}
          </span>
          {row.avatar ? (
            <img
              src={row.avatar}
              alt=""
              width={28}
              height={28}
              loading={index === 0 ? "eager" : "lazy"}
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
                aria-hidden
                className={cn(
                  "ml-auto size-3.5 shrink-0 text-mute transition-transform",
                  open && "rotate-180",
                )}
              />
            </span>
          </span>
        </button>
      </div>
      {!open && row.lastPost ? (
        lastHref ? (
          <a
            data-testid="fonte-last-post"
            href={lastHref}
            target={lastHref.startsWith("http") ? "_blank" : undefined}
            rel={lastHref.startsWith("http") ? "noreferrer" : undefined}
            className="-mt-0.5 mb-2 ml-7 mr-0.5 block min-h-[44px] text-mute hover:text-ink"
          >
            <span className="block truncate text-[11px] leading-snug">
              {displayTitle(row.lastPost.title)}
            </span>
            <ClosedPostMeta row={row} />
          </a>
        ) : (
          <div data-testid="fonte-last-post" className="-mt-0.5 mb-2 ml-7 mr-0.5 min-h-[44px] text-mute">
            <span className="block truncate text-[11px] leading-snug">
              {displayTitle(row.lastPost.title)}
            </span>
            <ClosedPostMeta row={row} />
          </div>
        )
      ) : null}

      {open ? (
        <div className="mb-2.5 ml-7 mr-0.5 rounded-md bg-paper-2 px-3 py-2.5">
          {hideGroup || row.group === "novos" ? null : (
            <p className="text-[12px] font-medium text-mute">{groupLabel(row.group)}</p>
          )}
          <p className={cn("text-[13px] leading-relaxed text-ink-soft", !hideGroup && row.group !== "novos" && "mt-1")}>
            {displayBlurb(row.handle, row.name, row.bio)}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-mute">
            {row.followers ? <span>{formatCount(row.followers)} seguidores</span> : null}
            <ProfileEr handle={row.handle} fallback={row.er} />
          </p>
          <FonteLastPosts
            posts={
              row.lastPosts?.length
                ? row.lastPosts
                : row.lastPost
                  ? [row.lastPost]
                  : []
            }
          />
          <div
            ref={actionsRef}
            data-fonte-actions
            className="mt-3 flex flex-wrap items-center gap-1 border-t border-line pt-3"
          >
            <Tip label={`Abrir @${row.handle} no X`}>
              <a
                href={`https://x.com/${row.handle}`}
                target="_blank"
                rel="noreferrer"
                data-fonte-action="x"
                aria-label={`Abrir @${row.handle} no X`}
                className="grid size-[44px] place-items-center rounded-full border border-line bg-paper text-ink active:bg-paper-2"
              >
                <XLogo className="size-3.5 translate-x-px" />
              </a>
            </Tip>
            <FonteControls
              handle={row.handle}
              starred={prefs.isStarred(row.handle)}
              disabled={pausedRow}
              notify={prefs.isNotify(row.handle)}
              notifyBusy={prefs.notifyBusy === row.handle.toLowerCase()}
              group={row.group}
              onToggleStar={prefs.toggleStar}
              onToggleDisabled={prefs.toggleDisabled}
              onToggleNotify={onToggleNotify}
              onSetGroup={prefs.setGroup}
              onResetGroup={prefs.clearGroup}
            />
          </div>
        </div>
      ) : null}
    </li>
  );
}
