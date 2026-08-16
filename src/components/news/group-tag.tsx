import { GROUP_LABELS, profileByHandle, type ProfileGroup } from "@/lib/news/profiles";
import { groupStyle } from "@/lib/news/group-style";
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
  const g = groupOf(handle);
  const label = GROUP_LABELS[g];
  if (!label) return null;
  const st = groupStyle(g);
  return (
    <span
      className={cn(
        "inline-flex h-4 shrink-0 items-center gap-1 rounded-full px-1.5 text-[9px] font-semibold leading-none",
        st.tag,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", st.dot)} aria-hidden />
      {label}
    </span>
  );
}
