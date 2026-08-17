import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Chrome, ExternalLink, Smartphone } from "lucide-react";
import { AppChrome } from "@/components/news/app-chrome";
import { IconLink, Tip } from "@/components/news/icon-btn";
import { AndroidInstallPanel } from "@/components/news/pwa-install";
import { routeMeta } from "@/lib/news/route-meta";

export const Route = createFileRoute("/instalar")({
  head: () => ({ meta: routeMeta("Instalar", "Adicione o Agora à tela inicial do seu celular.") }),
  component: InstallPage,
});

const LINKS = {
  appleHome: "https://support.apple.com/pt-br/guide/iphone/iph42ab2f3a7/ios",
  chromeInstall: "https://support.google.com/chrome/answer/9658366?hl=pt-BR",
  chromePlay:
    "https://play.google.com/store/apps/details?id=com.android.chrome",
} as const;

function InstallPage() {
  return (
    <AppChrome category="ai">
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:px-6 max-sm:max-w-none">
        <p className="text-xs font-semibold uppercase tracking-widest text-mark">
          App PWA
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
          Instalar no Android
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">
          O Agora instala na tela inicial pelo Chrome, abre em tela cheia e
          continua lendo o feed ao vivo.
        </p>

        <div className="mt-8">
          <AndroidInstallPanel />
        </div>

        <section className="mt-8 rounded-md border border-line bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-mark">
            Chrome · Android
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">
            Se o botão não aparecer
          </h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
            <li>Abra este link no Chrome do celular (não no app do Grok).</li>
            <li>Toque no menu (três pontos).</li>
            <li>Toque em Instalar app ou Adicionar à tela inicial.</li>
            <li>Confirme. O ícone vermelho com o A vai para a tela inicial.</li>
          </ol>
          <div className="mt-5 flex items-center gap-1.5">
            <IconLink
              href={LINKS.chromeInstall}
              target="_blank"
              rel="noreferrer"
              label="Guia oficial do Chrome"
            >
              <Chrome className="size-4" />
            </IconLink>
            <IconLink
              href={LINKS.chromePlay}
              target="_blank"
              rel="noreferrer"
              label="Chrome na Play Store"
            >
              <ExternalLink className="size-4" />
            </IconLink>
          </div>
        </section>

        <section className="mt-6 rounded-md border border-line bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-mark">
            iPhone
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">Safari</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft">
            <li>Abra no Safari.</li>
            <li>Compartilhar → Adicionar à Tela de Início.</li>
          </ol>
          <IconLink
            href={LINKS.appleHome}
            target="_blank"
            rel="noreferrer"
            label="Guia oficial da Apple"
            className="mt-5"
          >
            <Smartphone className="size-4" />
          </IconLink>
        </section>

        <Tip label="Voltar para IA">
          <Link
            to="/"
            search={{ secao: "ai" }}
            aria-label="Voltar para IA"
            className="mt-8 grid size-8 place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
          >
            <ArrowLeft className="size-4" />
          </Link>
        </Tip>
      </div>
    </AppChrome>
  );
}
