import type { Ref } from "react";
import { FonteControls } from "@/components/news/fonte-controls";
import { FonteLastPosts } from "@/components/news/fontes-last-posts";
import { ProfileEr } from "@/components/news/fontes-profile-er";
import { Tip } from "@/components/news/icon-btn";
import { XLogo } from "@/components/news/x-logo";
import { formatCount } from "@/lib/news/format";
import { groupLabel } from "@/lib/news/groups";
import type { InfluenceRow } from "@/lib/news/influence";
import { displayBlurb } from "@/lib/news/profiles";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";
import { cn } from "@/lib/utils";

export function FonteProfileCard({
  row,
  prefs,
  hideGroup,
  onToggleNotify,
  actionsRef,
  className,
}: {
  row: InfluenceRow;
  prefs: ReturnType<typeof useFontesPrefs>;
  hideGroup?: boolean;
  onToggleNotify: (handle: string) => void;
  actionsRef?: Ref<HTMLDivElement>;
  className?: string;
}) {
  const paused = prefs.isDisabled(row.handle);
  const showGroup = !hideGroup && row.group !== "novos";
  return (
    <div className={cn("rounded-md bg-paper-2 px-3 py-2.5", className)}>
      {showGroup ? (
        <p className="text-[12px] font-medium text-mute">{groupLabel(row.group)}</p>
      ) : null}
      <p className={cn("text-[13px] leading-relaxed text-ink-soft", showGroup && "mt-1")}>
        {displayBlurb(row.handle, row.name, row.bio)}
      </p>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-mute">
        {row.followers ? <span>{formatCount(row.followers)} seguidores</span> : null}
        <ProfileEr handle={row.handle} fallback={row.er} />
      </p>
      <FonteLastPosts
        posts={
          row.lastPosts?.length ? row.lastPosts : row.lastPost ? [row.lastPost] : []
        }
      />
      <div
        ref={actionsRef}
        data-fonte-actions
        className="relative z-50 mt-3 flex flex-wrap items-center gap-1 border-t border-line pt-3"
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
          disabled={paused}
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
  );
}
