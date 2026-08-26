import type { ReactNode } from "react";
import { FONTES_SORTS, type SortKey } from "@/lib/news/fontes-sort";
import { cn } from "@/lib/utils";
import { tapIcon, Tip } from "./icon-btn";

/** Chips rotulados de ordenação, na linha abaixo do header (decisão do dono). */
export function FontesSortChips({
  sort,
  onChange,
}: {
  sort: SortKey;
  onChange: (next: SortKey) => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Ordenar fontes"
      data-testid="fontes-toolbar"
      className="mt-3 flex flex-wrap gap-2"
    >
      {FONTES_SORTS.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={sort === s.id}
          onClick={() => onChange(s.id)}
          className={cn(
            "inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold",
            sort === s.id ? "bg-ink text-paper" : "bg-paper-2 text-mute",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
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
