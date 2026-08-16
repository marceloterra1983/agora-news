import { BadgeCheck, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import type { XUserHit } from "@/lib/news/server";

export function HitRow({
  hit,
  active,
  onToggle,
  children,
}: {
  hit: XUserHit;
  active: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        aria-expanded={active}
        onClick={onToggle}
        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
          active ? "bg-paper-2" : ""
        } ${hit.inFeed ? "opacity-60" : ""}`}
      >
        {hit.avatar ? (
          <img
            src={hit.avatar}
            alt=""
            className="size-9 shrink-0 rounded-full bg-paper-2 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-paper-2 text-xs font-medium text-mute">
            {hit.name.charAt(0)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-sm font-medium text-ink">{hit.name}</span>
            {hit.verified ? <BadgeCheck className="size-3.5 shrink-0 text-ink" /> : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-mute">@{hit.handle}</span>
        </span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-mute transition-transform ${
            active ? "rotate-180" : ""
          }`}
        />
      </button>
      {children}
    </li>
  );
}
