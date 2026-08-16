import { groupOverrideOf } from "@/lib/news/fontes-prefs";
import { groupStyle } from "@/lib/news/group-style";
import { groupLabel, groupPip, groupStyle as customGroupStyle } from "@/lib/news/groups";
import { GROUP_LABELS, profileByHandle, type ProfileGroup } from "@/lib/news/profiles";
import { cn } from "@/lib/utils";

export function groupOf(handle?: string | null): string {
  if (!handle) return "novos";
  return groupOverrideOf(handle) ?? profileByHandle(handle)?.group ?? "novos";
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
  const label = id in GROUP_LABELS ? GROUP_LABELS[id as ProfileGroup] : groupLabel(id);
  if (!label) return null;
  const builtIn = id in GROUP_LABELS;
  const st = builtIn ? groupStyle(id as ProfileGroup) : null;
  return (
    <span
      data-group={id}
      className={cn(
        "inline-flex h-4 shrink-0 items-center gap-1 rounded-full px-1.5 text-[9px] font-semibold leading-none",
        st ? st.tag : null,
        className,
      )}
      style={st ? undefined : customGroupStyle(id)}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", st ? st.dot : null)}
        style={st ? undefined : { background: groupPip(id) }}
        aria-hidden
      />
      {label}
    </span>
  );
}
