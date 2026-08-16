import { groupOverrideOf } from "@/lib/news/fontes-prefs";
import { groupStyle, hasGroupStyle } from "@/lib/news/group-style";
import { groupLabel, groupStyle as customGroupStyle } from "@/lib/news/groups";
import { profileByHandle } from "@/lib/news/profiles";
import { cn } from "@/lib/utils";

export function groupOf(handle?: string | null, section?: string): string {
  if (!handle) return "novos";
  return groupOverrideOf(handle, section) ?? profileByHandle(handle)?.group ?? "novos";
}

export function groupLabelFor(handle?: string | null): string | null {
  if (!handle) return null;
  return groupLabel(groupOf(handle));
}

export function GroupTag({
  handle,
  group,
  className,
}: {
  handle?: string | null;
  group?: string | null;
  className?: string;
}) {
  const id = group || groupOf(handle);
  const label = groupLabel(id);
  if (!label) return null;
  const st = hasGroupStyle(id) ? groupStyle(id) : null;
  return (
    <span
      data-group={id}
      className={cn(
        "inline-flex h-4 shrink-0 items-center rounded-full px-1.5 text-[9px] font-semibold leading-none",
        st ? st.tag : null,
        className,
      )}
      style={st ? undefined : customGroupStyle(id)}
    >
      {label}
    </span>
  );
}
