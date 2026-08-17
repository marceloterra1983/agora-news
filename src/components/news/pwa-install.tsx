import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import {
  canPromptInstall,
  initPwa,
  isStandalone,
  promptInstall,
  subscribePwa,
} from "@/lib/pwa";
import { Tip } from "./icon-btn";

import { applySettings, readSettings } from "@/lib/news/settings";
import { applyTheme, watchSystemTheme } from "@/lib/news/theme";
import { useNewsStore } from "@/lib/news/store";
import { TypefaceLoader } from "@/lib/news/typeface-loader";
import { reconcileFavoritePush } from "@/lib/news/notify-favorites";

export function PwaRoot() {
  useEffect(() => {
    initPwa();
    applyTheme();
    applySettings(readSettings());
    void useNewsStore.persist.rehydrate();
    void reconcileFavoritePush();
    return watchSystemTheme();
  }, []);
  return <TypefaceLoader />;
}

function usePwaInstall() {
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);
  useEffect(() => {
    setMounted(true);
    return subscribePwa(() => setTick((n) => n + 1));
  }, []);
  return {
    canInstall: mounted && canPromptInstall() && !isStandalone(),
    installed: mounted && isStandalone(),
    install: promptInstall,
  };
}

export function AndroidInstallPanel() {
  const { canInstall, installed, install } = usePwaInstall();
  const [busy, setBusy] = useState(false);

  if (installed) {
    return (
      <p className="rounded-md border border-line bg-paper-2 px-4 py-3 text-sm text-ink-soft">
        O Agora já está instalado neste aparelho.
      </p>
    );
  }

  if (canInstall) {
    return (
      <div className="rounded-md border border-line bg-hero px-4 py-5 text-hero-fg">
        <p className="text-xs font-semibold uppercase tracking-widest">
          Chrome Android
        </p>
        <h2 className="mt-2 font-display text-2xl tracking-tight">
          Instalar agora
        </h2>
        <p className="mt-2 text-sm leading-relaxed opacity-90">
          O Chrome neste telefone já reconhece o Agora como aplicativo. Um toque
          e ele vai para a tela inicial.
        </p>
        <Tip label="Instalar o Agora">
          <button
            type="button"
            className="mt-4 grid size-11 place-items-center rounded-sm bg-paper text-ink transition-colors hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-paper/40 disabled:opacity-50"
            aria-label="Instalar o Agora"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void install().finally(() => setBusy(false));
            }}
          >
            <Download className="size-4" />
          </button>
        </Tip>
      </div>
    );
  }

  return (
    <p className="flex items-start gap-2 text-sm text-mute">
      <Smartphone className="mt-0.5 size-4 shrink-0" />
      <span>
        Abra este site no Chrome do Android. Se o navegador oferecer instalação,
        o botão aparece neste painel.
      </span>
    </p>
  );
}
