import { useEffect, useState } from "react";
import { groupOf } from "@/lib/news/fontes-prefs";
import { groupLabel, groupStyle as customGroupStyle } from "@/lib/news/groups";
import { profileByHandle } from "@/lib/news/profiles";
import { cn } from "@/lib/utils";

export function GroupTag({
  handle,
  group,
  className,
}: {
  handle?: string | null;
  group?: string | null;
  className?: string;
}) {
  const initial = group || profileByHandle(handle || "")?.group || "novos";
  const [id, setId] = useState(initial);
  useEffect(() => {
    const refresh = () => setId(group || groupOf(handle));
    refresh();
    window.addEventListener("agora-fontes-prefs", refresh);
    window.addEventListener("agora-custom-groups", refresh);
    return () => {
      window.removeEventListener("agora-fontes-prefs", refresh);
      window.removeEventListener("agora-custom-groups", refresh);
    };
  }, [group, handle]);
  const label = groupLabel(id);
  if (!label) return null;
  return (
    <span
      data-group={id}
      className={cn(
        "inline-flex min-h-[1.125rem] shrink-0 items-center rounded-full px-1.5 text-[length:var(--agora-kicker)] font-semibold leading-none",
        className,
      )}
      style={customGroupStyle(id)}
    >
      {label}
    </span>
  );
}
