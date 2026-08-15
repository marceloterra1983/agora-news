import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-sm border border-line bg-card px-3 text-sm text-ink shadow-none outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-mute focus-visible:border-ink/40 focus-visible:ring-2 focus-visible:ring-ink/15",
        className,
      )}
      {...props}
    />
  );
}
