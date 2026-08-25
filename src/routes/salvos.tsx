import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppChrome } from "@/components/news/app-chrome";
import { StoryCard } from "@/components/news/story-card";
import { Tip } from "@/components/news/icon-btn";
import { useNewsStore } from "@/lib/news/store";
import { routeMeta } from "@/lib/news/route-meta";
import { groupSavedByCategory } from "@/lib/news/saved-groups.mjs";
import { listKnownSections } from "@/lib/news/sections";
import {
  DEFAULT_SECTION,
  labelFor,
  normalizeSection,
  type Category,
} from "@/lib/news/types";

type SalvosSearch = { secao: Category };

export const Route = createFileRoute("/salvos")({
  head: () => ({ meta: routeMeta("Salvos", "Consulte as matérias que você guardou neste aparelho.") }),
  validateSearch: (raw: Record<string, unknown>): SalvosSearch => ({
    secao: normalizeSection(
      typeof raw.secao === "string" ? raw.secao : DEFAULT_SECTION,
    ),
  }),
  component: SavedPage,
});

function SavedPage() {
  const { secao } = Route.useSearch();
  const savedIds = useNewsStore((s) => s.savedIds);
  const stories = useNewsStore((s) => s.stories);
  const items = savedIds.map((id) => stories[id]).filter(Boolean);
  const groups = groupSavedByCategory(
    items.map((s) => ({ ...s, category: normalizeSection(s.category) })),
    listKnownSections(),
  );

  return (
    <AppChrome category={secao}>
      <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:px-6 max-sm:max-w-none">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mark">
          Sua lista
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight">Salvos</h1>
        {items.length === 0 ? (
          <div className="mt-12 max-w-md">
            <p className="text-ink-soft">
              Ainda não há matérias guardadas. Abra uma manchete e toque em
              Salvar para ler depois neste aparelho.
            </p>
            <Tip label={`Voltar para ${labelFor(secao)}`}>
              <Link
                to="/"
                search={{ secao }}
                aria-label={`Voltar para ${labelFor(secao)}`}
                className="mt-6 grid size-[44px] place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
              >
                <ArrowLeft className="size-4" />
              </Link>
            </Tip>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.category} className="mt-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-mute">
                {labelFor(g.category)}
              </h2>
              <div className="mt-4 grid gap-6">
                {g.items.map((story) => (
                  <StoryCard key={story.id} story={story} variant="row" />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </AppChrome>
  );
}
