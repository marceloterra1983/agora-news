import { useEffect, useRef } from "react";
import { FonteProfileCard } from "@/components/news/fonte-profile-card";
import type { InfluenceRow } from "@/lib/news/influence";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";

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
        className="relative z-10 w-full max-w-lg outline-none"
      >
        <FonteProfileCard
          row={row}
          prefs={prefs}
          onToggleNotify={onToggleNotify}
          className="shadow-card"
        />
      </div>
    </div>
  );
}
