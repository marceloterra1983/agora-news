import { Link } from "@tanstack/react-router";
import {
  LogIn,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Settings,
  Smartphone,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authEnabled, signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  applyTheme,
  cycleTheme,
  getStoredTheme,
  resolveDark,
  type ThemeMode,
} from "@/lib/news/theme";
import { Tip } from "./icon-btn";

const THEME_LABEL: Record<ThemeMode, string> = {
  system: "Tema do sistema",
  light: "Tema claro",
  dark: "Tema escuro",
};

export function AppMenu() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("system");
  const box = useRef<HTMLDivElement>(null);
  const { isPending, user } = useCurrentUserState();

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
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const ThemeIcon = mode === "system" ? Monitor : resolveDark(mode) ? Moon : Sun;

  return (
    <div ref={box} className="relative">
      <Tip label={open ? "Fechar menu" : "Menu"}>
        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Menu"}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
          className="grid size-[44px] shrink-0 place-items-center rounded-full border border-line bg-card text-ink"
        >
          {open ? <X className="size-4" strokeWidth={2} /> : <Menu className="size-4" strokeWidth={2} />}
        </button>
      </Tip>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-lg border border-line bg-card shadow-lg"
        >
          {isPending ? (
            <p className="px-3 py-3 text-sm text-mute">Carregando…</p>
          ) : user ? (
            <>
              <Link
                to="/login"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink hover:bg-paper-2"
              >
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt=""
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
                  role="menuitem"
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
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink hover:bg-paper-2"
            >
              <LogIn className="size-4 shrink-0" />
              Entrar
            </Link>
          )}
          <div className="h-px bg-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => setMode(cycleTheme())}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-ink hover:bg-paper-2"
          >
            <ThemeIcon className="size-4 shrink-0" />
            {THEME_LABEL[mode]}
          </button>
          <Link
            to="/instalar"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-ink hover:bg-paper-2"
          >
            <Smartphone className="size-4 shrink-0" />
            Instalar o app
          </Link>
          <Link
            to="/configuracoes"
            role="menuitem"
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
