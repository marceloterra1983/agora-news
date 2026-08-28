import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { ArticleView } from "@/components/news/article-view";
import { Tip } from "@/components/news/icon-btn";
import { displayTitle } from "@/lib/news/format";
import type { Story } from "@/lib/news/types";

export function FeedStoryPopup({
  story,
  onClose,
}: {
  story: Story;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const title = displayTitle(story.title);
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
        if (active === first || active === box || !box.contains(active)) {
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pb-28 pt-16">
      <button
        type="button"
        aria-label="Fechar mensagem"
        className="fixed inset-0 bg-ink/45"
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Mensagem: ${title}`}
        tabIndex={-1}
        data-testid="feed-story-popup"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-md bg-paper-2 shadow-card outline-none"
      >
        <div className="flex items-center justify-end px-2 pt-1">
          <Tip label="Fechar mensagem">
            <button
              type="button"
              data-testid="story-popup-close"
              aria-label="Fechar mensagem"
              onClick={onClose}
              className="grid size-11 shrink-0 place-items-center rounded-full text-mute hover:bg-paper hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </Tip>
        </div>
        <div className="px-4 pb-5">
          <ArticleView story={story} embedded />
        </div>
      </div>
    </div>
  );
}
