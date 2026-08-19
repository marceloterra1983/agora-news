import { Link } from "@tanstack/react-router";
import {
  LogIn,
  LogOut,
  Menu,
  Settings,
  Smartphone,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { applyTheme, getStoredTheme, setTheme, type ThemeMode } from "@/lib/news/theme";
import { FONT_STEPS } from "@/lib/news/font-scale";
import { useSettings } from "@/lib/news/use-settings";
import { cn } from "@/lib/utils";
import { Tip } from "./icon-btn";
import { ThemeSwitch } from "./settings-ui";

export function AppMenu() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("system");
  const box = useRef<HTMLDivElement>(null);
  const { isPending, user } = useCurrentUserState();
  const { settings, set } = useSettings();

  useEffect(() => {
    applyTheme();
    setMode(getStoredTheme());
    const onCustom = () => setMode(getStoredTheme());
    window.addEventListener("agora-theme", onCustom);
    return () => window.removeEventListener("agora-theme", onCustom);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (next && box.current?.contains(next)) return;
      setOpen(false);
    };
    const root = box.current;
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    root?.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      root?.removeEventListener("focusout", onFocusOut);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <Tip label={open ? "Fechar menu" : "Menu"}>
        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="grid size-[44px] shrink-0 place-items-center rounded-full border border-line bg-card text-ink"
        >
          {open ? <X className="size-4" strokeWidth={2} /> : <Menu className="size-4" strokeWidth={2} />}
        </button>
      </Tip>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-lg border border-line bg-card shadow-lg">
          {isPending ? (
            <p className="px-3 py-3 text-sm text-mute">Carregando…</p>
          ) : user ? (
            <>
              <Link
                to="/login"
                search={{ cadastro: false }}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink hover:bg-paper-2"
              >
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <UserRound className="size-4 shrink-0" />
                )}
                <span className="min-w-0 truncate">{user.displayName ?? user.primaryEmail ?? "Conta"}</span>
              </Link>
              {authEnabled ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink hover:bg-paper-2"
                >
                  <LogOut className="size-4 shrink-0" />
                  Sair
                </button>
              ) : null}
            </>
          ) : (
            <Link
              to="/login"
              search={{ cadastro: false }}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink hover:bg-paper-2"
            >
              <LogIn className="size-4 shrink-0" />
              Entrar
            </Link>
          )}
          <div className="h-px bg-line" />
          <div className="px-3 py-2.5">
            <ThemeSwitch
              value={mode}
              onChange={(id) => {
                setTheme(id);
                setMode(id);
              }}
            />
          </div>
          <div className="px-3 py-2.5">
            <p className="mb-1.5 text-[11px] text-mute">Tamanho do texto</p>
            <div className="grid grid-cols-3 gap-1">
              {FONT_STEPS.map((step) => {
                const on = settings.fontSize === step.id || (step.id === "lg" && settings.fontSize === "xl");
                return (
                  <button
                    key={step.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={step.label}
                    onClick={() => set({ fontSize: step.id })}
                    className={cn(
                      "rounded-md border px-1 py-1.5 text-[11px]",
                      on ? "border-ink bg-paper-2 text-ink" : "border-line text-mute",
                    )}
                  >
                    {step.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Link
            to="/instalar"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink hover:bg-paper-2"
          >
            <Smartphone className="size-4 shrink-0" />
            Instalar o app
          </Link>
          <Link
            to="/configuracoes"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink hover:bg-paper-2"
          >
            <Settings className="size-4 shrink-0" />
            Configurações
          </Link>
        </div>
      ) : null}
    </div>
  );
}
