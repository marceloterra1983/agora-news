import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tip } from "./icon-btn";

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
          "grid size-8 shrink-0 place-items-center rounded-full",
          active ? "bg-ink text-paper" : "bg-paper-2 text-mute",
        )}
      >
        {children}
      </button>
    </Tip>
  );
}
