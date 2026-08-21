import { useEffect, useRef } from "react";
import { BadgeCheck } from "lucide-react";
import { FonteProfileCard } from "@/components/news/fonte-profile-card";
import { GroupTag } from "@/components/news/group-tag";
import { formatCount } from "@/lib/news/format";
import type { InfluenceRow } from "@/lib/news/influence";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";

function PopupIdentity({ row }: { row: InfluenceRow }) {
  const followers = row.followers ? formatCount(row.followers) : "";
  return (
    <div
      data-testid="feed-profile-identity"
      className="flex items-start gap-3 border-b border-line px-3 pb-2.5 pt-0.5"
    >
      {row.avatar ? (
        <img
          src={row.avatar}
          alt=""
          width={56}
          height={56}
          referrerPolicy="no-referrer"
          className="size-14 shrink-0 rounded-full bg-paper object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-full bg-paper text-lg font-medium text-mute"
        >
          {(row.name || row.handle).charAt(0)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-base font-medium text-ink">{row.name}</span>
          {row.verified ? (
            <BadgeCheck className="size-4 shrink-0 text-ink" aria-label="verificado" />
          ) : null}
          <GroupTag group={row.group} />
        </p>
        <p className="text-sm text-mute">@{row.handle}</p>
        {followers ? (
          <p className="mt-0.5 text-[12px] tabular-nums text-mute">
            {followers} seguidores
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function FeedProfilePopup({
  row,
  prefs,
  onClose,
  onToggleNotify,
}: {
  row: InfluenceRow;
  prefs: ReturnType<typeof useFontesPrefs>;
  onClose: () => void;
  onToggleNotify: (handle: string) => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (panel.current?.querySelector('[data-fonte-action="group"][aria-expanded="true"]')) {
        return;
      }
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pb-28 pt-20">
      <button
        type="button"
        aria-label="Fechar perfil"
        className="fixed inset-0 bg-ink/45"
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil @${row.handle}`}
        tabIndex={-1}
        data-testid="feed-profile-popup"
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-md bg-paper-2 shadow-card outline-none"
      >
        <PopupIdentity row={row} />
        <FonteProfileCard
          row={row}
          prefs={prefs}
          hideGroup
          hideFollowers
          onToggleNotify={onToggleNotify}
          className="rounded-none bg-transparent shadow-none"
        />
      </div>
    </div>
  );
}
