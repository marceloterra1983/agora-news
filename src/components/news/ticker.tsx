import type { Story } from "@/lib/news/types";
import { labelFor } from "@/lib/news/types";
import { Badge } from "@/components/ui/badge";

export function Ticker({ stories, category }: { stories: Story[]; category?: string }) {
  const items = stories.slice(0, 10);
  if (items.length === 0) return null;
  const loop = [...items, ...items];
  return (
    <div className="flex items-stretch overflow-hidden rounded-md border border-line bg-card">
      <div className="flex shrink-0 items-center bg-mark px-3">
        <Badge variant="mark" className="px-0 tracking-[0.18em]">
          {labelFor(category ?? stories[0]?.category ?? "ai")}
        </Badge>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden py-2.5">
        <div className="ticker-track flex w-max gap-8 pr-8">
          {loop.map((s, i) => (
            <a
              key={`${s.id}-${i}`}
              href={`/materia/${s.id}`}
              className="shrink-0 text-sm text-ink-soft hover:text-ink"
            >
              <span className="mr-2 font-semibold uppercase tracking-wider text-mark">
                {s.sourceLabel}
              </span>
              {s.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
