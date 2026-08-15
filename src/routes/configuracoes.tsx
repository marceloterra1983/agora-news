import { createFileRoute, Link } from "@tanstack/react-router";
import { LogIn, RotateCcw, Smartphone } from "lucide-react";
import { AppChrome } from "@/components/news/app-chrome";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useNewsStore } from "@/lib/news/store";
import { FONT_STEPS, TYPEFACES, type Density, type FontSize, type Typeface } from "@/lib/news/settings";
import { TypefaceLoader, typefaceFamily } from "@/lib/news/typeface-loader";
import { useSettings } from "@/lib/news/use-settings";
import { resetUnread } from "@/lib/news/unread";
import { useNotifyFavorites } from "@/lib/news/use-notify-favorites";
import {
  applyTheme,
  getStoredTheme,
  setTheme,
  type ThemeMode,
} from "@/lib/news/theme";
import { DEFAULT_SECTION } from "@/lib/news/types";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/configuracoes")({
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, set, reset } = useSettings();
  const { user } = useCurrentUserState();
  const savedCount = useNewsStore((s) => s.savedIds.length);
  const clearSaved = useNewsStore((s) => s.clearSaved);
  const notify = useNotifyFavorites();
  const [theme, setThemeMode] = useState<ThemeMode>("system");
  const [note, setNote] = useState("");

  useEffect(() => {
    applyTheme();
    setThemeMode(getStoredTheme());
    const on = () => setThemeMode(getStoredTheme());
    window.addEventListener("agora-theme", on);
    return () => window.removeEventListener("agora-theme", on);
  }, []);

  function flash(msg: string) {
    setNote(msg);
    window.setTimeout(() => setNote(""), 2200);
  }

  return (
    <AppChrome category={DEFAULT_SECTION}>
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mark">App</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">Configurações</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Vale só neste aparelho. Muda na hora.
        </p>

        <Section title="Leitura">
          <p className="mb-3 text-xs text-mute">Tamanho da letra</p>
          <div className="flex items-end gap-1.5">
            {FONT_STEPS.map((step, i) => (
              <Choice
                key={step.id}
                active={settings.fontSize === step.id}
                onClick={() => set({ fontSize: step.id as FontSize })}
                label={["Menor", "Normal", "Grande", "Maior"][i] ?? step.id}
                className="flex-1"
              >
                <span style={{ fontSize: 13 + i * 4 }} className="font-display leading-none">
                  A
                </span>
              </Choice>
            ))}
          </div>
          <p className="mt-4 font-display text-lg leading-snug text-ink">
            A letra do feed e dos posts muda com o tamanho escolhido.
          </p>
          <p className="mt-5 mb-3 text-xs text-mute">Espaçamento</p>
          <div className="grid grid-cols-2 gap-1.5">
            <Choice
              active={settings.density === "regular"}
              onClick={() => set({ density: "regular" as Density })}
              label="Confortável"
            >
              Confortável
            </Choice>
            <Choice
              active={settings.density === "compact"}
              onClick={() => set({ density: "compact" as Density })}
              label="Compacto"
            >
              Compacto
            </Choice>
          </div>
          <p className="mt-5 mb-3 text-xs text-mute">Letra</p>
          <TypefaceLoader all />
          <div className="grid grid-cols-1 gap-1.5">
            {TYPEFACES.map((face) => (
              <button
                key={face.id}
                type="button"
                aria-pressed={settings.typeface === face.id}
                onClick={() => set({ typeface: face.id as Typeface })}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left",
                  settings.typeface === face.id
                    ? "border-ink bg-paper-2"
                    : "border-line",
                )}
              >
                <span className="min-w-0">
                  <span
                    className="block text-[1.15rem] leading-snug text-ink"
                    style={{ fontFamily: typefaceFamily(face.id) }}
                  >
                    A leitura muda o jeito de pensar.
                  </span>
                  <span className="mt-0.5 block text-[11px] text-mute">
                    {face.label} · {face.hint}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Aparência">
          <p className="mb-3 text-xs text-mute">Tema</p>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                ["system", "Sistema"],
                ["light", "Claro"],
                ["dark", "Escuro"],
              ] as const
            ).map(([id, label]) => (
              <Choice
                key={id}
                active={theme === id}
                onClick={() => {
                  setTheme(id);
                  setThemeMode(id);
                }}
                label={label}
              >
                {label}
              </Choice>
            ))}
          </div>
          <Toggle
            on={settings.showImages}
            onClick={() => set({ showImages: !settings.showImages })}
            title="Mostrar fotos"
            hint="Desligue para um feed só de texto, mais leve."
          />
          <Toggle
            on={settings.reduceMotion}
            onClick={() => set({ reduceMotion: !settings.reduceMotion })}
            title="Menos movimento"
            hint="Corta animações do app."
          />
        </Section>

        <Section title="Avisos">
          <Toggle
            on={settings.highlightUnread}
            onClick={() => set({ highlightUnread: !settings.highlightUnread })}
            title="Marcar posts novos"
            hint="Destaque até você abrir o app e ler."
          />
          <Toggle
            on={notify.enabled}
            onClick={() => void notify.toggle()}
            title="Avisar favoritos"
            hint={
              !notify.supported
                ? "Este aparelho não permite avisos."
                : notify.permission === "denied"
                  ? "O navegador bloqueou. Libere nas permissões do site."
                  : "Só contas com estrela e aviso ligado em Fontes."
            }
          />
        </Section>

        <Section title="Neste aparelho">
          <Row
            title={`Limpar ${savedCount} salvo${savedCount === 1 ? "" : "s"}`}
            hint="Tira as matérias da lista Salvos."
            action={() => {
              clearSaved();
              flash("Salvos limpos");
            }}
            disabled={savedCount === 0}
          />
          <Row
            title="Esquecer o que já li"
            hint="Os destaques de novos posts recomeçam daqui."
            action={() => {
              resetUnread();
              flash("Leitura reiniciada");
            }}
          />
          <Row
            title="Restaurar padrão"
            hint="Volta letra, tema de leitura e fotos ao original."
            action={() => {
              reset();
              flash("Configurações restauradas");
            }}
          />
        </Section>

        <Section title="App">
          <Link
            to="/instalar"
            className="flex items-center gap-3 border-b border-line py-3.5 text-sm text-ink"
          >
            <Smartphone className="size-4 shrink-0 text-mute" />
            Instalar no celular
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-3 border-b border-line py-3.5 text-sm text-ink"
          >
            <LogIn className="size-4 shrink-0 text-mute" />
            {user ? user.displayName ?? "Conta" : "Entrar"}
          </Link>
          <Link
            to="/referencias"
            className="flex items-center gap-3 py-3.5 text-sm text-ink"
          >
            <RotateCcw className="size-4 shrink-0 text-mute" />
            Diagnóstico do feed
          </Link>
        </Section>

        {note ? (
          <p className="mt-6 text-center text-sm text-mute" role="status">
            {note}
          </p>
        ) : null}
      </main>
    </AppChrome>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-mute">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Choice({
  active,
  onClick,
  label,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid min-h-11 place-items-center rounded-md border px-2 py-2 text-sm",
        active ? "border-ink bg-paper-2 text-ink" : "border-line text-mute",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Toggle({
  on,
  onClick,
  title,
  hint,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-line py-3.5 text-left last:border-0"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-mute">{hint}</span>
      </span>
      <span
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors",
          on ? "bg-ink" : "bg-paper-2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-paper transition-transform",
            on ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

function Row({
  title,
  hint,
  action,
  disabled,
}: {
  title: string;
  hint: string;
  action: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={action}
      disabled={disabled}
      className="flex w-full flex-col items-start border-b border-line py-3.5 text-left last:border-0 disabled:opacity-40"
    >
      <span className="text-sm text-ink">{title}</span>
      <span className="mt-0.5 text-xs text-mute">{hint}</span>
    </button>
  );
}
