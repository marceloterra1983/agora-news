import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { FONTES_SORTS, type SortKey } from "@/lib/news/fontes-sort";
import { cn } from "@/lib/utils";
import { tapIcon, Tip } from "./icon-btn";

export function FontesSortSelect({
  sort,
  onChange,
}: {
  sort: SortKey;
  onChange: (next: SortKey) => void;
}) {
  return (
    <span className="relative shrink-0">
      <select
        value={sort}
        onChange={(event) => onChange(event.target.value as SortKey)}
        aria-label="Ordenar fontes"
        className="h-11 appearance-none rounded-full bg-paper-2 pl-3 pr-8 text-[13px] font-semibold text-ink"
      >
        {FONTES_SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-mute"
      />
    </span>
  );
}

export function FontesChip({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Tip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          tapIcon,
          active ? "bg-ink text-paper" : "bg-paper-2 text-mute",
        )}
      >
        {children}
      </button>
    </Tip>
  );
}
