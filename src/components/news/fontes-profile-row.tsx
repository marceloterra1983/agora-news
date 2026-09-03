import { BadgeCheck, CheckSquare, ChevronDown, Square } from "lucide-react";
import { FonteDisabledBadge } from "@/components/news/fonte-controls";
import { ClosedPostMeta } from "@/components/news/fontes-closed-post";
import { FonteProfileCard } from "@/components/news/fonte-profile-card";
import { FontePostLink } from "@/components/news/fonte-post-link";
import { GroupTag } from "@/components/news/group-tag";
import { OriginMark } from "@/components/news/origin-mark";
import { SourceAvatar } from "@/components/news/source-avatar";
import { displayTitle, formatCount, relativeTime } from "@/lib/news/format";
import type { InfluenceRow } from "@/lib/news/influence";
import { safeHttpHref } from "@/lib/news/last-post";
import { youtubeAvatarFor } from "@/lib/news/youtube-catalog.mjs";
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
  const face = youtubeAvatarFor(row.handle) || row.avatar || null;
  const actionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    actionsRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [open]);
  return (
    <li data-testid="fonte-row" data-fonte-handle={row.handle} className="border-b border-line">
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
          <SourceAvatar
            src={face}
            initial={(row.name || row.handle || "?").charAt(0)}
            size={28}
            className="size-7"
            loading={index === 0 ? "eager" : "lazy"}
            fallbackClassName="text-[10px] font-medium text-mute"
          />
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
              {row.lastPost ? (
                <time
                  dateTime={row.lastPost.publishedAt}
                  suppressHydrationWarning
                  className="shrink-0 text-[11px] tabular-nums text-mute"
                >
                  {relativeTime(row.lastPost.publishedAt)}
                </time>
              ) : null}
              {picking ? (
                picked ? (
                  <CheckSquare className="size-3.5 shrink-0 text-ink" />
                ) : (
                  <Square className="size-3.5 shrink-0 text-mute" />
                )
              ) : null}
              <FonteDisabledBadge show={pausedRow} />
              <span className="ml-auto flex shrink-0 items-center gap-1">
                <OriginMark handle={row.handle} />
                <ChevronDown
                  aria-hidden
                  className={cn(
                    "size-3.5 shrink-0 text-mute transition-transform",
                    open && "rotate-180",
                  )}
                />
              </span>
            </span>
          </span>
        </button>
      </div>
      {!open && row.lastPost ? (
        lastHref ? (
          <FontePostLink
            testId="fonte-last-post"
            href={lastHref}
            className="-mt-0.5 mb-2 ml-7 mr-0.5 block min-h-[44px] text-mute hover:text-ink"
          >
            <span className="block truncate text-[11px] leading-snug">
              {displayTitle(row.lastPost.title)}
            </span>
            <ClosedPostMeta row={row} />
          </FontePostLink>
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
        <div className="mb-2.5 ml-7 mr-0.5">
          <FonteProfileCard
            row={row}
            prefs={prefs}
            hideGroup={hideGroup}
            onToggleNotify={onToggleNotify}
            actionsRef={actionsRef}
          />
        </div>
      ) : null}
    </li>
  );
}
