import { Bell, BellOff, Power, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tip } from "./icon-btn";

export function FonteControls({
  handle,
  starred,
  disabled,
  notify,
  onToggleStar,
  onToggleDisabled,
  onToggleNotify,
}: {
  handle: string;
  starred: boolean;
  disabled: boolean;
  notify: boolean;
  onToggleStar: (handle: string) => void;
  onToggleDisabled: (handle: string) => void;
  onToggleNotify: (handle: string) => void;
}) {
  const starLabel = starred ? "Remover dos favoritos" : "Marcar como favorito";
  const notifyLabel = notify ? "Desligar aviso deste perfil" : "Ativar aviso deste perfil";
  const powerLabel = disabled ? "Reativar no feed" : "Desabilitar no feed";
  return (
    <div className="-mr-1 flex shrink-0 items-center">
      <Tip label={starLabel}>
        <button
          type="button"
          aria-label={starLabel}
          aria-pressed={starred}
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-full transition-colors",
            starred ? "text-mark hover:bg-paper-2" : "text-mute hover:bg-paper-2 hover:text-mark",
          )}
          onClick={() => onToggleStar(handle)}
        >
          <Star className="size-3.5" fill={starred ? "currentColor" : "none"} strokeWidth={starred ? 0 : 1.75} />
        </button>
      </Tip>
      <Tip label={notifyLabel}>
        <button
          type="button"
          aria-label={notifyLabel}
          aria-pressed={notify}
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-full transition-colors",
            notify ? "text-mark hover:bg-paper-2" : "text-mute hover:bg-paper-2 hover:text-ink",
          )}
          onClick={() => onToggleNotify(handle)}
        >
          {notify ? <Bell className="size-3.5" fill="currentColor" strokeWidth={0} /> : <BellOff className="size-3.5" strokeWidth={1.75} />}
        </button>
      </Tip>
      <Tip label={powerLabel}>
        <button
          type="button"
          aria-label={powerLabel}
          aria-pressed={!disabled}
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-full transition-colors",
            disabled ? "text-mute hover:bg-paper-2 hover:text-ink" : "text-ink hover:bg-paper-2",
          )}
          onClick={() => onToggleDisabled(handle)}
        >
          <Power className="size-3.5" strokeWidth={1.75} />
        </button>
      </Tip>
    </div>
  );
}

export function FonteDisabledBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="shrink-0 rounded-full bg-paper-2 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-mute">
      pausada
    </span>
  );
}
