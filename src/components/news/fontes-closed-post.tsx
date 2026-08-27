import { Eye, MessageCircle, Percent } from "lucide-react";
import { Tip } from "@/components/news/icon-btn";
import { formatPostEr, formatPostQuality, formatPostReach } from "@/lib/news/fonte-metrics";
import type { InfluenceRow } from "@/lib/news/influence";

export function ClosedPostMeta({ row }: { row: InfluenceRow }) {
  if (!row.lastPost) return null;
  const metrics = [
    { key: "er", label: "Engajamento", value: formatPostEr(row.lastPost, row.er), Icon: Percent },
    { key: "alc", label: "Alcance", value: formatPostReach(row.lastPost, row.followers), Icon: Eye },
    { key: "ql", label: "Qualidade", value: formatPostQuality(row.lastPost), Icon: MessageCircle },
  ].filter((m) => m.value);
  if (!metrics.length) return null;
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-mute">
      {metrics.map((m) => (
        <Tip key={m.key} label={`${m.label} ${m.value}`}>
          <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums">
            <m.Icon className="size-3" aria-hidden />
            <span className="sr-only">{m.label} </span>
            {m.value}
          </span>
        </Tip>
      ))}
    </span>
  );
}
