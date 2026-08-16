import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, ExternalLink, FolderOpen, X } from "lucide-react";
import { AppChrome } from "@/components/news/app-chrome";
import { IconLink, Tip } from "@/components/news/icon-btn";
import { debugFeedRead } from "@/lib/news/server";
import { allCrossRefs, LIVE_REF, NEWS_AI_FOLDER } from "@/lib/news/refs";

export const Route = createFileRoute("/referencias")({
  component: RefsPage,
});

function RefsPage() {
  const refs = allCrossRefs();
  const probe = useQuery({
    queryKey: ["feed-debug"],
    queryFn: () => debugFeedRead(),
    staleTime: 30_000,
  });
  return (
    <AppChrome category="ai">
      <main className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:px-6 max-sm:max-w-none">
        <p className="text-xs font-semibold uppercase tracking-widest text-mark">
          Drive · NEWS/AI
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
          Referências cruzadas
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-soft">
          O app lê o Supabase (tabela posts). Planilhas AGORA_FEED ficam listadas só como legado.
        </p>

        <section className="mt-8 rounded-md border border-ink bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-mark">
            Diagnóstico do feed
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">Leitura Supabase</h2>
          {probe.isFetching && !probe.data ? (
            <p className="mt-3 text-sm text-mute">Testando as URLs…</p>
          ) : probe.data ? (
            <>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{probe.data.note}</p>
              <p className="mt-2 font-mono text-xs text-mute break-all">{probe.data.sheetId}</p>
              <ul className="mt-4 divide-y divide-line rounded-sm border border-line">
                {probe.data.probes.map((row) => (
                  <li key={row.url} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                    <span className="min-w-0 break-all text-ink-soft">{row.url}</span>
                    <span className={row.ok ? "shrink-0 text-ink" : "shrink-0 text-mute"}>
                      {row.ok ? `${row.items} itens` : row.error ?? row.kind}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">Não foi possível testar as URLs agora.</p>
          )}
        </section>

        <section className="mt-6 rounded-md border border-ink bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-mark">Ativa</p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">{LIVE_REF.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{LIVE_REF.note}</p>
          <p className="mt-3 font-mono text-xs text-mute break-all">{LIVE_REF.id}</p>
          <p className="mt-1 text-sm text-mute">{LIVE_REF.where}</p>
          <IconLink href={LIVE_REF.url} target="_blank" rel="noreferrer" label="Abrir Supabase" className="mt-5">
            <ExternalLink className="size-4" />
          </IconLink>
        </section>

        <section className="mt-6">
          <h2 className="font-display text-2xl tracking-tight">Todas as referências</h2>
          <ul className="mt-4 divide-y divide-line rounded-md border border-line bg-card">
            {refs.map((ref) => (
              <li key={ref.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium text-ink">
                    {ref.status === "ativa" ? (
                      <Check className="size-4 text-ink" />
                    ) : (
                      <X className="size-4 text-mute" />
                    )}
                    {ref.name}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">{ref.note}</p>
                  <p className="mt-1 font-mono text-[11px] text-mute break-all">{ref.id}</p>
                </div>
                <Tip label={`Abrir ${ref.name}`}>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Abrir ${ref.name}`}
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </Tip>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-md border border-line bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-mark">Pasta</p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">{NEWS_AI_FOLDER.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{NEWS_AI_FOLDER.note}</p>
          <IconLink
            href={NEWS_AI_FOLDER.url}
            target="_blank"
            rel="noreferrer"
            label="Abrir pasta no Drive"
            className="mt-5"
          >
            <FolderOpen className="size-4" />
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
      </main>
    </AppChrome>
  );
}
