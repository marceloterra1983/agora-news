import { Percent } from "lucide-react";
import { formatRate } from "@/lib/news/fonte-metrics";

export function ProfileEr({ fallback }: { handle?: string; fallback: number }) {
  if (fallback <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 tabular-nums" title="ER médio dos últimos posts">
      <Percent className="size-3" aria-hidden />
      {formatRate(fallback)} ER do perfil
    </span>
  );
}
