import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { IconBtn, Tip } from "@/components/news/icon-btn";
import { XLogo } from "@/components/news/x-logo";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-6 text-ink">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          search={{ secao: "ai" }}
          className="font-display text-4xl tracking-tight"
        >
          IA
        </Link>
        <p className="mt-2 text-sm text-ink-soft">
          Entre para levar favoritos, fontes e o tamanho da letra para qualquer aparelho.
        </p>
        <div className="mt-8 flex items-center gap-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <IconBtn
                key={p.providerId}
                label={`Continuar com ${p.label}`}
                className="size-11"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                {p.idp === "google" ? <GoogleMark /> : <XLogo className="size-4" />}
              </IconBtn>
            ))
          ) : (
            <p className="text-sm text-mute">O login está desligado.</p>
          )}
        </div>
        <Tip label="Voltar sem entrar">
          <Link
            to="/"
            search={{ secao: "ai" }}
            aria-label="Voltar sem entrar"
            className="mt-8 grid size-8 place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
          >
            <ArrowLeft className="size-4" />
          </Link>
        </Tip>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.72.12-1.43.36-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
    </svg>
  );
}
