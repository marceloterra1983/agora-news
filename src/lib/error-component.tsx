import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-6 text-center text-ink">
      <div>
        <TriangleAlert className="mx-auto size-8 text-mark" strokeWidth={1.75} />
        <h1 className="mt-4 font-display text-2xl">Algo deu errado</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          {error.message || "Erro inesperado. Recarregue a página."}
        </p>
      </div>
    </main>
  );
}
