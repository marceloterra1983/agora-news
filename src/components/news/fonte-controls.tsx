import { Bell, BellOff, Layers, Power, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isReservedGroup } from "@/lib/news/catalog-taxonomy.mjs";
import { groupMenuOpensUp } from "@/lib/news/fonte-menu-place.mjs";
import {
  addCustomGroup,
  allGroupIds,
  groupLabel,
  groupPip,
  onCustomGroups,
  removeCustomGroup,
} from "@/lib/news/groups";
import { readLastSection } from "@/lib/news/section-pref";
import { cn } from "@/lib/utils";
import { Tip } from "./icon-btn";

const ACTION =
  "grid size-[44px] place-items-center rounded-full border border-line bg-paper transition-colors active:bg-paper-2";

export function FonteControls({
  handle,
  starred,
  disabled,
  notify,
  notifyBusy,
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
  notifyBusy?: boolean;
  group: string;
  onToggleStar: (handle: string) => void;
  onToggleDisabled: (handle: string) => void;
  onToggleNotify: (handle: string) => void;
  onSetGroup: (handle: string, group: string) => void;
  onResetGroup?: (handle: string) => void;
}) {
  const starLabel = starred ? "Remover dos favoritos" : "Marcar como favorito";
  const notifyLabel = notify
    ? "Desligar aviso deste perfil"
    : "Ativar aviso deste perfil";
  const powerLabel = disabled ? "Reativar no feed" : "Desabilitar no feed";
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [ids, setIds] = useState<string[]>(() =>
    allGroupIds(readLastSection()),
  );
  const box = useRef<HTMLDivElement>(null);

  useEffect(
    () => onCustomGroups(() => setIds(allGroupIds(readLastSection()))),
    [],
  );

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

  function toggleMenu() {
    if (open) {
      setOpen(false);
      setCreating(false);
      return;
    }
    const r = box.current?.getBoundingClientRect();
    const header = document.querySelector("[data-chrome=compact]");
    const nav = document.querySelector("[data-chrome=tabs]");
    const top = header?.getBoundingClientRect().bottom ?? 0;
    const bottom = nav?.getBoundingClientRect().top ?? window.innerHeight;
    if (r) {
      setUp(
        groupMenuOpensUp({
          spaceAbove: r.top - top,
          spaceBelow: bottom - r.bottom,
        }),
      );
    }
    setOpen(true);
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    const g = addCustomGroup(name, readLastSection());
    if (!g) return;
    onSetGroup(handle, g.id);
    setName("");
    setCreating(false);
    setOpen(false);
    setIds(allGroupIds(readLastSection()));
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Tip label={starLabel}>
        <button
          type="button"
          aria-label={starLabel}
          aria-pressed={starred}
          className={cn(
            ACTION,
            starred ? "text-mark" : "text-mute active:text-mark",
          )}
          data-fonte-action="star"
          onClick={(event) => {
            event.stopPropagation();
            onToggleStar(handle);
          }}
        >
          <Star
            className="size-3.5"
            fill={starred ? "currentColor" : "none"}
            strokeWidth={starred ? 0 : 1.75}
          />
        </button>
      </Tip>
      <Tip label={notifyLabel}>
        <button
          type="button"
          aria-label={notifyLabel}
          aria-pressed={notify}
          aria-busy={notifyBusy || undefined}
          disabled={notifyBusy}
          className={cn(
            ACTION,
            notify ? "text-mark" : "text-mute active:text-ink",
          )}
          data-fonte-action="notify"
          onClick={(event) => {
            event.stopPropagation();
            onToggleNotify(handle);
          }}
        >
          {notify ? (
            <Bell className="size-3.5" fill="currentColor" strokeWidth={0} />
          ) : (
            <BellOff className="size-3.5" strokeWidth={1.75} />
          )}
        </button>
      </Tip>
      <Tip label={powerLabel}>
        <button
          type="button"
          aria-label={powerLabel}
          aria-pressed={!disabled}
          className={cn(ACTION, disabled ? "text-mute" : "text-ink")}
          data-fonte-action="power"
          onClick={(event) => {
            event.stopPropagation();
            onToggleDisabled(handle);
          }}
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
            className={cn(ACTION, open && "text-ink")}
            data-fonte-action="group"
            onClick={toggleMenu}
          >
            <Layers className="size-3.5" strokeWidth={1.75} />
          </button>
        </Tip>
        {open ? (
          <ul
            aria-label="Grupo do perfil"
            className={cn(
              "absolute left-0 z-50 max-h-64 min-w-40 overflow-y-auto rounded-xl border border-line bg-paper shadow-card",
              up ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]",
            )}
          >
            {ids.map((id) => {
              const on = id === group;
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      onSetGroup(handle, id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium",
                      on
                        ? "bg-paper-2 text-ink"
                        : "text-ink-soft hover:bg-paper-2 hover:text-ink",
                    )}
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: groupPip(id) }}
                    />
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
            {group && !isReservedGroup(group) ? (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Apagar o grupo ${groupLabel(group)}?`)) return;
                    removeCustomGroup(group, readLastSection());
                    onResetGroup?.(handle);
                    setOpen(false);
                    setIds(allGroupIds(readLastSection()));
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
                    aria-label="Nome do novo grupo"
                    name="new-group"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome do grupo"
                    autoComplete="off"
                    className="h-8 w-full rounded-md border border-line bg-paper px-2 text-[13px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
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
