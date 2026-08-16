import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppChrome } from "@/components/news/app-chrome";
import { StoryCard } from "@/components/news/story-card";
import { Tip } from "@/components/news/icon-btn";
import { useNewsStore } from "@/lib/news/store";
import { DEFAULT_SECTION, labelFor, normalizeSection, type Category } from "@/lib/news/types";

type SalvosSearch = { secao: Category };

export const Route = createFileRoute("/salvos")({
  validateSearch: (raw: Record<string, unknown>): SalvosSearch => ({
    secao: normalizeSection(typeof raw.secao === "string" ? raw.secao : DEFAULT_SECTION),
  }),
  component: SavedPage,
});

function SavedPage() {
  const { secao } = Route.useSearch();
  const savedIds = useNewsStore((s) => s.savedIds);
  const stories = useNewsStore((s) => s.stories);
  const items = savedIds
    .map((id) => stories[id])
    .filter(Boolean)
    .filter((s) => normalizeSection(s.category) === secao);

  return (
    <AppChrome category={secao}>
      <main className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mark">
          Sua lista
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">Salvos</h1>
        {items.length === 0 ? (
          <div className="mt-12 max-w-md">
            <p className="text-ink-soft">
              Ainda não há matérias guardadas neste tema. Abra uma manchete e toque em
              Salvar para ler depois, mesmo offline neste aparelho.
            </p>
            <Tip label={`Voltar para ${labelFor(secao)}`}>
              <Link
                to="/"
                search={{ secao }}
                aria-label={`Voltar para ${labelFor(secao)}`}
                className="mt-6 grid size-8 place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
              >
                <ArrowLeft className="size-4" />
              </Link>
            </Tip>
          </div>
        ) : (
          <div className="mt-8 grid gap-6">
            {items.map((story) => (
              <StoryCard key={story.id} story={story} variant="row" />
            ))}
          </div>
        )}
      </main>
    </AppChrome>
  );
}
