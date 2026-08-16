import { useQuery } from "@tanstack/react-query";
import { Percent } from "lucide-react";
import { formatRate } from "@/lib/news/fonte-metrics";
import { loadFonteMetrics } from "@/lib/news/server";

export function ProfileEr({ handle, fallback }: { handle: string; fallback: number }) {
  const { data } = useQuery({
    queryKey: ["profile-er", handle.toLowerCase()],
    queryFn: () => loadFonteMetrics({ data: { handle } }),
    staleTime: 20 * 60_000,
  });
  const er = data?.profileEr || fallback || 0;
  if (er <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 tabular-nums" title="ER médio dos últimos posts">
      <Percent className="size-3" aria-hidden />
      {formatRate(er)} ER do perfil
    </span>
  );
}
