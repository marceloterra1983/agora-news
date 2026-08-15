import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactElement } from "react";
import { cloneElement, isValidElement, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const BASE =
  "grid size-8 shrink-0 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-paper-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50";

export function Tip({
  label,
  side = "top",
  children,
}: {
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const hold = useRef(0);

  function startHold() {
    window.clearTimeout(hold.current);
    hold.current = window.setTimeout(() => setOpen(true), 420);
  }
  function endHold() {
    window.clearTimeout(hold.current);
    if (open) hold.current = window.setTimeout(() => setOpen(false), 1100);
  }

  const child = isValidElement(children)
    ? cloneElement(children, {
        onTouchStart: startHold,
        onTouchEnd: endHold,
        onTouchCancel: () => {
          window.clearTimeout(hold.current);
          setOpen(false);
        },
      } as Record<string, unknown>)
    : children;

  return (
    <Tooltip open={open} onOpenChange={setOpen} delayDuration={280}>
      <TooltipTrigger asChild>{child}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

export function IconBtn({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <Tip label={label}>
      <button
        type="button"
        aria-label={label}
        className={cn(BASE, className)}
        {...props}
      >
        {children}
      </button>
    </Tip>
  );
}

export function IconLink({
  label,
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { label: string }) {
  return (
    <Tip label={label}>
      <a aria-label={label} className={cn(BASE, className)} {...props}>
        {children}
      </a>
    </Tip>
  );
}

export const iconBtnSolid = "border-ink bg-ink text-paper hover:bg-ink-soft hover:text-paper";
