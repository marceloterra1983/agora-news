import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ reset }: ErrorComponentProps) {
  return (
    <main id="conteudo-principal" tabIndex={-1} className="grid min-h-dvh place-items-center bg-paper px-6 text-center text-ink">
      <div role="alert">
        <TriangleAlert className="mx-auto size-8 text-mark" strokeWidth={1.75} />
        <h1 className="mt-4 font-display text-2xl">Algo deu errado</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          Não foi possível abrir esta página. Tente novamente ou volte ao início.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={reset} className="h-11 rounded-md border border-line px-4 text-sm">Tentar novamente</button>
          <Link to="/" search={{ secao: "ai" }} className="grid h-11 place-items-center rounded-md border border-line px-4 text-sm">Ir ao início</Link>
        </div>
      </div>
    </main>
  );
}
