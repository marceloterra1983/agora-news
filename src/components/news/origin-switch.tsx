import { Rss, Youtube } from "lucide-react";
import { useSettings } from "@/lib/news/use-settings";
import { cn } from "@/lib/utils";
import { Tip } from "./icon-btn";
import { XLogo } from "./x-logo";

export function OriginSwitch() {
  const { settings, set } = useSettings();
  return (
    <div
      role="group"
      aria-label="Origem dos posts"
      data-origin-switch=""
      className="flex shrink-0 items-center gap-0.5 rounded-full bg-paper-2 p-0.5"
    >
      <Tip label={settings.showX ? "Ocultar posts do X" : "Mostrar posts do X"}>
        <button
          type="button"
          data-origin="x"
          aria-pressed={settings.showX}
          aria-label={settings.showX ? "Ocultar posts do X" : "Mostrar posts do X"}
          onClick={() => set({ showX: !settings.showX })}
          className={cn(
            "grid size-10 place-items-center rounded-full",
            settings.showX ? "bg-ink text-paper" : "text-mute",
          )}
        >
          <XLogo className="size-3.5" />
        </button>
      </Tip>
      <Tip label={settings.showRss ? "Ocultar posts RSS" : "Mostrar posts RSS"}>
        <button
          type="button"
          data-origin="rss"
          aria-pressed={settings.showRss}
          aria-label={settings.showRss ? "Ocultar posts RSS" : "Mostrar posts RSS"}
          onClick={() => set({ showRss: !settings.showRss })}
          className={cn(
            "grid size-10 place-items-center rounded-full",
            settings.showRss ? "bg-ink text-paper" : "text-mute",
          )}
        >
          <Rss className="size-4" />
        </button>
      </Tip>
      <Tip label={settings.showYouTube ? "Ocultar vídeos do YouTube" : "Mostrar vídeos do YouTube"}>
        <button
          type="button"
          data-origin="youtube"
          aria-pressed={settings.showYouTube}
          aria-label={settings.showYouTube ? "Ocultar vídeos do YouTube" : "Mostrar vídeos do YouTube"}
          onClick={() => set({ showYouTube: !settings.showYouTube })}
          className={cn(
            "grid size-10 place-items-center rounded-full",
            settings.showYouTube ? "bg-ink text-paper" : "text-mute",
          )}
        >
          <Youtube className="size-4" />
        </button>
      </Tip>
    </div>
  );
}
