import { Bell, BellOff, Layers, Power, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { addCustomGroup, allGroupIds, groupLabel, groupPip, onCustomGroups, removeCustomGroup } from "@/lib/news/groups";
import { GROUP_ORDER } from "@/lib/news/profiles";
import { cn } from "@/lib/utils";
import { Tip } from "./icon-btn";

export function FonteControls({
  handle,
  starred,
  disabled,
  notify,
  group,
  onToggleStar,
  onToggleDisabled,
  onToggleNotify,
  onSetGroup,
  onResetGroup,
}: {
  handle: string;
  starred: boolean;
  disabled: boolean;
  notify: boolean;
  group: string;
  onToggleStar: (handle: string) => void;
  onToggleDisabled: (handle: string) => void;
  onToggleNotify: (handle: string) => void;
  onSetGroup: (handle: string, group: string) => void;
  onResetGroup?: (handle: string) => void;
}) {
  const starLabel = starred ? "Remover dos favoritos" : "Marcar como favorito";
  const notifyLabel = notify ? "Desligar aviso deste perfil" : "Ativar aviso deste perfil";
  const powerLabel = disabled ? "Reativar no feed" : "Desabilitar no feed";
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [ids, setIds] = useState<string[]>(() => allGroupIds());
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => onCustomGroups(() => setIds(allGroupIds())), []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function create(e: React.FormEvent) {
    e.preventDefault();
    const g = addCustomGroup(name);
    if (!g) return;
    onSetGroup(handle, g.id);
    setName("");
    setCreating(false);
    setOpen(false);
    setIds(allGroupIds());
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Tip label={starLabel}>
        <button
          type="button"
          aria-label={starLabel}
          aria-pressed={starred}
          className={cn(
            "grid size-8 place-items-center rounded-full border border-line transition-colors",
            starred ? "text-mark hover:bg-paper" : "text-mute hover:bg-paper hover:text-mark",
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
            "grid size-8 place-items-center rounded-full border border-line transition-colors",
            notify ? "text-mark hover:bg-paper" : "text-mute hover:bg-paper hover:text-ink",
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
            "grid size-8 place-items-center rounded-full border border-line transition-colors",
            disabled ? "text-mute hover:bg-paper hover:text-ink" : "text-ink hover:bg-paper",
          )}
          onClick={() => onToggleDisabled(handle)}
        >
          <Power className="size-3.5" strokeWidth={1.75} />
        </button>
      </Tip>
      <div ref={box} className="relative">
        <Tip label="Editar grupo">
          <button
            type="button"
            aria-label="Editar grupo"
            aria-expanded={open}
            aria-haspopup="listbox"
            className={cn(
              "grid size-8 place-items-center rounded-full border border-line transition-colors",
              open ? "bg-paper text-ink" : "text-ink hover:bg-paper",
            )}
            onClick={() => setOpen((v) => !v)}
          >
            <Layers className="size-3.5" strokeWidth={1.75} />
          </button>
        </Tip>
        {open ? (
          <ul
            role="listbox"
            aria-label="Grupo do perfil"
            className="absolute bottom-[calc(100%+6px)] left-0 z-50 max-h-64 min-w-40 overflow-y-auto rounded-xl border border-line bg-paper shadow-card"
          >
            {ids.map((id) => {
              const on = id === group;
              return (
                <li key={id} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => {
                      onSetGroup(handle, id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium",
                      on ? "bg-paper-2 text-ink" : "text-ink-soft hover:bg-paper-2 hover:text-ink",
                    )}
                  >
                    <span className="size-2 shrink-0 rounded-full" style={{ background: groupPip(id) }} />
                    {groupLabel(id)}
                  </button>
                </li>
              );
            })}
            {onResetGroup ? (
              <li className="border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    onResetGroup(handle);
                    setOpen(false);
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-[13px] font-medium text-ink-soft hover:bg-paper-2 hover:text-ink"
                >
                  Grupo padrão
                </button>
              </li>
            ) : null}
            {group && !(GROUP_ORDER as readonly string[]).includes(group) ? (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    removeCustomGroup(group);
                    onResetGroup?.(handle);
                    setOpen(false);
                    setIds(allGroupIds());
                  }}
                  className="flex w-full items-center px-3 py-2 text-left text-[13px] font-medium text-ink-soft hover:bg-paper-2 hover:text-ink"
                >
                  Apagar grupo
                </button>
              </li>
            ) : null}
            <li className="border-t border-line">
              {creating ? (
                <form onSubmit={create} className="px-2 py-1.5">
                  <input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do grupo"
                    className="h-8 w-full rounded-md border border-line bg-paper px-2 text-[13px] text-ink outline-none"
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center px-3 py-2 text-left text-[13px] font-medium text-ink-soft hover:bg-paper-2 hover:text-ink"
                >
                  Criar grupo
                </button>
              )}
            </li>
          </ul>
        ) : null}
      </div>
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
