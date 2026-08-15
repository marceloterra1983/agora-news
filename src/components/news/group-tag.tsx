import { GROUP_LABELS, profileByHandle, type ProfileGroup } from "@/lib/news/profiles";
import { cn } from "@/lib/utils";

export function groupOf(handle?: string | null): ProfileGroup {
  if (!handle) return "novos";
  return profileByHandle(handle)?.group ?? "novos";
}

export function groupLabelFor(handle?: string | null): string | null {
  if (!handle) return null;
  return GROUP_LABELS[groupOf(handle)];
}

export function GroupTag({
  handle,
  className,
}: {
  handle?: string | null;
  className?: string;
}) {
  const label = groupLabelFor(handle);
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex h-4 shrink-0 items-center rounded-full bg-paper-2 px-1.5 text-[9px] font-semibold leading-none text-ink-soft",
        className,
      )}
    >
      {label}
    </span>
  );
}
