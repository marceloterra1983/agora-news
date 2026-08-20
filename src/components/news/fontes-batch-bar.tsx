import { allGroupIds, groupLabel, groupStyle } from "@/lib/news/groups";

export function FontesBatchBar({
  count,
  groupIds = allGroupIds(),
  onMove,
}: {
  count: number;
  groupIds?: string[];
  onMove: (group: string) => void;
}) {
  if (count <= 0) return null;
  return (
    <div className="sticky top-[calc(var(--agora-header)+env(safe-area-inset-top,0px))] z-10 -mx-4 mb-2 border-b border-line bg-paper px-4 py-2">
      <p className="mb-1.5 text-[11px] text-mute">{count} selecionados · mover para</p>
      <div className="flex flex-wrap gap-1">
        {groupIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onMove(id)}
            className="min-h-[44px] rounded-full px-3 text-[11px] font-semibold"
            style={groupStyle(id)}
          >
            {groupLabel(id)}
          </button>
        ))}
      </div>
    </div>
  );
}
