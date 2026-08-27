import { Rss } from "lucide-react";
import { isRssAccount } from "@/lib/news/rss-catalog.mjs";
import { cn } from "@/lib/utils";
import { XLogo } from "./x-logo";

export function OriginMark({
  handle,
  className,
}: {
  handle: string;
  className?: string;
}) {
  const rss = isRssAccount(handle);
  const label = rss ? "RSS" : "X";
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
