import { Image, ImageOff } from "lucide-react";
import { useSettings } from "@/lib/news/use-settings";
import { cn } from "@/lib/utils";
import { Tip } from "./icon-btn";

export function ImagesSwitch() {
  const { settings, set } = useSettings();
  const on = settings.showImages;
  return (
    <Tip label={on ? "Ocultar fotos" : "Mostrar fotos"}>
      <button
        type="button"
        data-images-switch=""
        aria-pressed={on}
        aria-label={on ? "Ocultar fotos" : "Mostrar fotos"}
        onClick={() => set({ showImages: !settings.showImages })}
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-full bg-paper-2",
          on ? "bg-ink text-paper" : "text-mute",
        )}
      >
        {on ? <Image className="size-4" /> : <ImageOff className="size-4" />}
      </button>
    </Tip>
  );
}
