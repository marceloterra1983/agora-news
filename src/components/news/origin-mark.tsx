import { Rss, Youtube } from "lucide-react";
import { isRssAccount, isYouTubeAccount } from "@/lib/news/rss-catalog.mjs";
import { cn } from "@/lib/utils";
import { XLogo } from "./x-logo";

export function OriginMark({
  handle,
  origin,
  className,
}: {
  handle?: string;
  origin?: "x" | "rss" | "youtube";
  className?: string;
}) {
  const isYt = origin ? origin === "youtube" : isYouTubeAccount(handle || "");
  const rss = origin ? origin === "rss" : isRssAccount(handle || "");
  const label = rss ? "RSS" : "X";
  if (isYt) {
    return (
      <span
        data-origin-mark="youtube"
        role="img"
        aria-label="YouTube"
        title="YouTube"
        className={cn("inline-flex shrink-0 text-mute", className)}
      >
        <Youtube className="size-3" aria-hidden />
      </span>
    );
  }
  return (
    <span
      data-origin-mark={rss ? "rss" : "x"}
      role="img"
      aria-label={label}
      title={label}
      className={cn("inline-flex shrink-0 text-mute", className)}
    >
      {rss ? <Rss className="size-3" aria-hidden /> : <XLogo className="size-2.5" />}
    </span>
  );
}
