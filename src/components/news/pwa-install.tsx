import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import {
  canPromptInstall,
  initPwa,
  isStandalone,
  promptInstall,
  subscribePwa,
} from "@/lib/pwa";
import { Button } from "@/components/ui/button";
import { Tip } from "./icon-btn";

import { applySettings, readSettings } from "@/lib/news/settings";
import { applyTheme } from "@/lib/news/theme";
import { TypefaceLoader } from "@/lib/news/typeface-loader";

export function PwaRoot() {
  useEffect(() => {
    initPwa();
    applyTheme();
    applySettings(readSettings());
  }, []);
  return <TypefaceLoader />;
}

export function usePwaInstall() {
  const [, setTick] = useState(0);
  useEffect(() => subscribePwa(() => setTick((n) => n + 1)), []);
  return {
    canInstall: canPromptInstall() && !isStandalone(),
    installed: isStandalone(),
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
        <p className="text-xs font-semibold uppercase tracking-widest">Chrome Android</p>
        <h2 className="mt-2 font-display text-2xl tracking-tight">Instalar agora</h2>
        <p className="mt-2 text-sm leading-relaxed opacity-90">
          O Chrome neste telefone já reconhece o Agora como aplicativo. Um toque
          e ele vai para a tela inicial.
        </p>
        <Tip label="Instalar o Agora">
          <Button
            className="mt-4 bg-paper text-ink hover:bg-paper-2"
            size="icon"
            aria-label="Instalar o Agora"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void install().finally(() => setBusy(false));
            }}
          >
            <Download />
          </Button>
        </Tip>
      </div>
    );
  }

  return (
    <p className="flex items-start gap-2 text-sm text-mute">
      <Smartphone className="mt-0.5 size-4 shrink-0" />
      <span>
        Abra o link publicado no Chrome do Android. O botão nativo “Instalar
        app” aparece sozinho neste painel.
      </span>
    </p>
  );
}
