import { useEffect, useRef } from "react";
import { BadgeCheck, X } from "lucide-react";
import { FonteProfileCard } from "@/components/news/fonte-profile-card";
import { GroupTag } from "@/components/news/group-tag";
import { Tip } from "@/components/news/icon-btn";
import { formatCount } from "@/lib/news/format";
import type { InfluenceRow } from "@/lib/news/influence";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";

function PopupIdentity({
  row,
  onClose,
}: {
  row: InfluenceRow;
  onClose: () => void;
}) {
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
          <GroupTag handle={row.handle} group={row.group} />
        </p>
        <p className="text-sm text-mute">@{row.handle}</p>
        {followers ? (
          <p className="mt-0.5 text-[12px] tabular-nums text-mute">
            {followers} seguidores
          </p>
        ) : null}
      </div>
      <Tip label="Fechar perfil">
        <button
          type="button"
          data-testid="profile-close"
          aria-label="Fechar perfil"
          onClick={onClose}
          className="grid size-11 shrink-0 place-items-center rounded-full text-mute hover:bg-paper hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </Tip>
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
    function trapTab(event: KeyboardEvent) {
      const box = panel.current;
      if (!box) return;
      const focusables = [
        ...box.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), select, input, [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !box.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (active === last || !box.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Tab") {
        trapTab(event);
        return;
      }
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
        <PopupIdentity row={row} onClose={onClose} />
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
