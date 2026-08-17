import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AppChrome } from "@/components/news/app-chrome";
import { Tip } from "@/components/news/icon-btn";
import { debugFeedRead } from "@/lib/news/server";
import { routeMeta } from "@/lib/news/route-meta";

export const Route = createFileRoute("/referencias")({
  head: () => ({ meta: routeMeta("Referências", "Consulte o diagnóstico e as fontes técnicas do feed.") }),
  component: RefsPage,
});

function RefsPage() {
  const probe = useQuery({
    queryKey: ["feed-debug"],
    queryFn: () => debugFeedRead(),
    staleTime: 30_000,
  });
  const probeFailed = probe.data?.probes.some((row) => !row.ok) ?? false;
  return (
    <AppChrome category="ai">
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:px-6 max-sm:max-w-none">
        <p className="text-xs font-semibold uppercase tracking-widest text-mark">
          Infraestrutura
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
          Referências cruzadas
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">
          Estado técnico das fontes de dados usadas pelo Agora.
        </p>

        <section aria-busy={probe.isFetching} className="mt-8 rounded-md border border-ink bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-mark">
            Diagnóstico do feed
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">
            Leitura Supabase
          </h2>
          {(probe.isError || probeFailed) && !probe.isFetching ? (
            <div className="mt-3 text-sm text-mark" role="alert">
              <p>Não foi possível testar as URLs agora.</p>
              <button
                type="button"
                className="mt-3 h-11 rounded-md border border-line px-4 text-ink"
                onClick={() => void probe.refetch()}
              >
                Tentar novamente
              </button>
            </div>
          ) : null}
          {probe.isFetching && !probe.data ? (
            <p className="mt-3 text-sm text-mute" role="status">Testando as URLs…</p>
          ) : probe.data ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {probe.data.note}
              </p>
              <ul className="mt-4 divide-y divide-line rounded-sm border border-line">
                {probe.data.probes.map((row) => (
                  <li
                    key={row.url}
                    className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0 break-all text-ink-soft">
                      {row.url}
                    </span>
                    <span
                      className={
                        row.ok ? "shrink-0 text-ink" : "shrink-0 text-mute"
                      }
                    >
                      {row.ok ? `${row.items} itens` : (row.error ?? row.kind)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section className="mt-6 rounded-md border border-line bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-mark">
            Persistência
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">
            Domínios separados
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Notícias ficam em <code>public.posts</code>. Perfis, preferências,
            fontes acompanhadas e inscrições push usam tabelas próprias com
            acesso somente pelo servidor.
          </p>
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
