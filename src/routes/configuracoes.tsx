import { createFileRoute, Link } from "@tanstack/react-router";
import { LogIn, RotateCcw, Smartphone } from "lucide-react";
import { AppChrome } from "@/components/news/app-chrome";
import { LlmAccountsSettings } from "@/components/news/llm-accounts-settings";
import {
  SettingsChoice,
  SettingsRow,
  SettingsSection,
  SettingsToggle,
  ThemeSwitch,
} from "@/components/news/settings-ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useNewsStore } from "@/lib/news/store";
import { routeMeta } from "@/lib/news/route-meta";
import { FONT_STEPS } from "@/lib/news/font-scale";
import {
  TYPEFACES,
  type Density,
  type FontSize,
  type Typeface,
  typefaceFamily,
} from "@/lib/news/settings";
import { TypefaceLoader } from "@/lib/news/typeface-loader";
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
  head: () => ({ meta: routeMeta("Configurações", "Ajuste leitura, aparência, avisos e dados deste aparelho.") }),
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
      <div className="mx-auto max-w-2xl px-4 pb-28 pt-6 max-sm:max-w-none">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mark">
          App
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">
          Configurações
        </h1>
        <p className="mt-2 text-sm text-ink-soft">Neste aparelho agora. Se você entrar, favoritos e letra sobem para a nuvem.</p>

        <SettingsSection title="Leitura">
          <p className="mb-3 text-xs text-mute">Tamanho do texto</p>
          <div className="flex items-end gap-1.5">
            {FONT_STEPS.map((step, i) => (
              <SettingsChoice
                key={step.id}
                active={
                  settings.fontSize === step.id ||
                  (step.id === "lg" && settings.fontSize === "xl")
                }
                onClick={() => set({ fontSize: step.id as FontSize })}
                label={step.label}
                className="flex-1"
              >
                <span className="flex flex-col items-center gap-1">
                  <span
                    style={{ fontSize: 14 + i * 4 }}
                    className="font-display leading-none"
                  >
                    A
                  </span>
                  <span className="text-[11px]">{step.label}</span>
                </span>
              </SettingsChoice>
            ))}
          </div>
          <p className="mt-4 font-display text-lg leading-snug text-ink">
            A letra do feed e dos posts muda com o tamanho escolhido.
          </p>
          <p className="mt-5 mb-3 text-xs text-mute">Espaçamento</p>
          <div className="grid grid-cols-2 gap-1.5">
            <SettingsChoice
              active={settings.density === "regular"}
              onClick={() => set({ density: "regular" as Density })}
              label="Confortável"
            >
              Confortável
            </SettingsChoice>
            <SettingsChoice
              active={settings.density === "compact"}
              onClick={() => set({ density: "compact" as Density })}
              label="Compacto"
            >
              Compacto
            </SettingsChoice>
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
        </SettingsSection>

        <SettingsSection title="Aparência">
          <div className="mb-3">
            <ThemeSwitch
              value={theme}
              onChange={(id) => {
                setTheme(id);
                setThemeMode(id);
              }}
            />
          </div>
          <SettingsToggle
            on={settings.showImages}
            onClick={() => set({ showImages: !settings.showImages })}
            title="Mostrar fotos"
            hint="Desligue para um feed só de texto, mais leve."
          />
          <SettingsToggle
            on={settings.reduceMotion}
            onClick={() => set({ reduceMotion: !settings.reduceMotion })}
            title="Menos movimento"
            hint="Corta animações do app."
          />
        </SettingsSection>

        <SettingsSection title="Avisos">
          <SettingsToggle
            on={settings.highlightUnread}
            onClick={() => set({ highlightUnread: !settings.highlightUnread })}
            title="Marcar posts novos"
            hint="Destaque some ao passar no feed ou após 12 horas."
          />
          <SettingsToggle
            on={notify.enabled}
            onClick={() => void notify.toggle()}
            disabled={notify.busy}
            busy={notify.busy}
            title="Avisar favoritos"
            hint={
              !notify.supported
                ? "Este aparelho não permite avisos."
                : notify.permission === "denied"
                  ? "O navegador bloqueou. Libere nas permissões do site."
                  : "Contas com o sino ligado em Fontes. Entre para gravar o aviso na nuvem."
            }
          />
          {notify.error ? <p className="mt-2 text-sm text-mark" role="alert">{notify.error}</p> : null}
        </SettingsSection>

        <LlmAccountsSettings />

        <SettingsSection title="Neste aparelho">
          <SettingsRow
            title={`Limpar ${savedCount} salvo${savedCount === 1 ? "" : "s"}`}
            hint="Tira as matérias da lista Salvos."
            action={() => {
              if (!window.confirm("Limpar todas as matérias salvas?")) return;
              clearSaved();
              flash("Salvos limpos");
            }}
            disabled={savedCount === 0}
          />
          <SettingsRow
            title="Esquecer o que já li"
            hint="Os destaques de novos posts recomeçam daqui."
            action={() => {
              if (!window.confirm("Esquecer todo o histórico de leitura?")) return;
              resetUnread();
              flash("Leitura reiniciada");
            }}
          />
          <SettingsRow
            title="Restaurar padrão"
            hint="Volta letra, tema de leitura e fotos ao original."
            action={() => {
              if (!window.confirm("Restaurar todas as configurações?")) return;
              reset();
              flash("Configurações restauradas");
            }}
          />
        </SettingsSection>

        <SettingsSection title="App">
          <Link
            to="/instalar"
            className="flex items-center gap-3 border-b border-line py-3.5 text-sm text-ink"
          >
            <Smartphone className="size-4 shrink-0 text-mute" />
            Instalar no celular
          </Link>
          <Link
            to="/login"
            search={{ cadastro: false }}
            className="flex items-center gap-3 border-b border-line py-3.5 text-sm text-ink"
          >
            <LogIn className="size-4 shrink-0 text-mute" />
            {user ? (user.displayName ?? "Conta") : "Entrar"}
          </Link>
          <Link
            to="/referencias"
            className="flex items-center gap-3 py-3.5 text-sm text-ink"
          >
            <RotateCcw className="size-4 shrink-0 text-mute" />
            Diagnóstico do feed
          </Link>
        </SettingsSection>

        {note ? (
          <p className="mt-6 text-center text-sm text-mute" role="status">
            {note}
          </p>
        ) : null}
      </div>
    </AppChrome>
  );
}
