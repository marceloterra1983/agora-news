import { AppChrome } from "@/components/news/app-chrome";
import { FontesChip } from "@/components/news/fontes-chip";
import { ProfileRow } from "@/components/news/fontes-profile-row";
import { loadExtraFontes, syncExtraFontes } from "@/lib/news/extra-fontes";
import {
  FONTES_SORT_KEY,
  FONTES_SORTS,
  groupFontesRows,
  mergeExtraFontes,
  readStoredSort,
  seedFontes,
  sortFontesRows,
  type SortKey,
} from "@/lib/news/fontes-sort";
import { enableFavoriteNotify } from "@/lib/news/notify-favorites";
import { type ProfileGroup } from "@/lib/news/profiles";
import { loadFontes, loadFontesLive } from "@/lib/news/server";
import { relativeTime } from "@/lib/news/format";
import { DEFAULT_SECTION, normalizeSection, type Category } from "@/lib/news/types";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type FontesSearch = { secao: Category };

export const Route = createFileRoute("/fontes")({
  validateSearch: (raw: Record<string, unknown>): FontesSearch => ({
    secao: normalizeSection(typeof raw.secao === "string" ? raw.secao : DEFAULT_SECTION),
  }),
  loaderDeps: ({ search }) => ({ secao: search.secao }),
  loader: async ({ deps }) => loadFontes({ data: { category: deps.secao } }),
  component: FontesPage,
});

function FontesPage() {
  const { secao } = Route.useSearch();
  const initial = Route.useLoaderData();
  const prefs = useFontesPrefs();
  const [openHandle, setOpenHandle] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");
  const [openGroups, setOpenGroups] = useState<Set<ProfileGroup>>(() => new Set());
  const [extras, setExtras] = useState<ReturnType<typeof loadExtraFontes>>([]);
  const [liveEnabled, setLiveEnabled] = useState(false);

  useEffect(() => {
    setSort(readStoredSort());
    const refresh = () => setExtras(loadExtraFontes());
    refresh();
    syncExtraFontes();
    window.addEventListener("agora-extra-fontes", refresh);
    return () => window.removeEventListener("agora-extra-fontes", refresh);
  }, []);

  // Enrichment fxtwitter só depois do paint — não compete com a 1ª renderização
  useEffect(() => {
    setLiveEnabled(false);
    const t = window.setTimeout(() => setLiveEnabled(true), 280);
    return () => window.clearTimeout(t);
  }, [secao]);

  function changeSort(next: SortKey) {
    setSort(next);
    setOpenGroups(new Set());
    try {
      localStorage.setItem(FONTES_SORT_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const seed = useMemo(() => seedFontes(secao), [secao]);
  const { data } = useQuery({
    queryKey: ["fontes", secao],
    queryFn: () => loadFontes({ data: { category: secao } }),
    initialData: initial,
    staleTime: 45_000,
  });
  const { data: live } = useQuery({
    queryKey: ["fontes-live", secao],
    queryFn: () => loadFontesLive({ data: { category: secao } }),
    enabled: liveEnabled,
    staleTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });

  const base = live?.rows?.length ? live.rows : data?.rows?.length ? data.rows : seed;
  const withExtras = useMemo(() => mergeExtraFontes(base, extras), [base, extras]);
  const rows = useMemo(
    () => sortFontesRows(withExtras, sort, prefs.starred),
    [withExtras, prefs.starred, sort],
  );
  const grouped = useMemo(() => groupFontesRows(rows), [rows]);

  async function onToggleNotify(handle: string) {
    const turningOn = !prefs.isNotify(handle);
    if (turningOn) await enableFavoriteNotify();
    prefs.toggleNotify(handle);
  }

  function toggleGroup(id: ProfileGroup) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AppChrome category={secao}>
      <main className="mx-auto max-w-2xl px-4 pb-24">
        <h1 className="sr-only">Fontes</h1>
        <div className="sticky top-[57px] z-20 -mx-4 border-b border-line bg-paper px-4 py-1.5">
          <div className="flex gap-1">
            {FONTES_SORTS.map((s) => {
              const Icon = s.icon;
              return (
                <FontesChip key={s.id} active={sort === s.id} label={s.label} onClick={() => changeSort(s.id)}>
                  <Icon className="size-3.5" />
                </FontesChip>
              );
            })}
          </div>
        </div>

        {sort === "groups" ? (
          <ul>
            {grouped.map((g) => {
              const open = openGroups.has(g.id);
              return (
                <li key={g.id} className="border-b border-line">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggleGroup(g.id)}
                    className="flex w-full items-center gap-3 py-3 text-left"
                  >
                    <span className="flex shrink-0 -space-x-2">
                      {g.faces.length ? (
                        g.faces.map((f) => (
                          <img
                            key={f.handle}
                            src={f.avatar ?? ""}
                            alt=""
                            className="size-7 rounded-full border border-paper bg-paper-2 object-cover"
                          />
                        ))
                      ) : (
                        <span className="grid size-7 place-items-center rounded-full bg-paper-2 text-[10px] font-medium text-mute">
                          {g.items.length}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        <span className="text-sm font-medium text-ink">{g.label}</span>
                        <span className="font-mono text-[10px] tabular-nums text-mute">{g.items.length}</span>
                        {g.latest ? (
                          <time
                            dateTime={g.latest}
                            suppressHydrationWarning
                            className="ml-auto shrink-0 text-[10px] tabular-nums text-mute"
                          >
                            {relativeTime(g.latest)}
                          </time>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-mute">
                        {g.preview || g.hint}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-mute transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  {open ? (
                    <>
                      <p className="-mt-1 mb-2 text-[11px] leading-snug text-mute">{g.hint}</p>
                      <ol>
                        {g.items.map((row, i) => (
                          <ProfileRow
                            key={row.handle}
                            row={row}
                            index={i}
                            open={openHandle === row.handle.toLowerCase()}
                            prefs={prefs}
                            hideGroup
                            onToggle={() =>
                              setOpenHandle(
                                openHandle === row.handle.toLowerCase()
                                  ? null
                                  : row.handle.toLowerCase(),
                              )
                            }
                            onToggleNotify={onToggleNotify}
                          />
                        ))}
                      </ol>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-mute">
            {sort === "starred" ? "Nenhum favorito ainda. Toque na estrela de um perfil." : "Nenhum perfil."}
          </p>
        ) : (
          <ol>
            {rows.map((row, i) => (
              <ProfileRow
                key={row.handle}
                row={row}
                index={i}
                open={openHandle === row.handle.toLowerCase()}
                prefs={prefs}
                onToggle={() =>
                  setOpenHandle(
                    openHandle === row.handle.toLowerCase() ? null : row.handle.toLowerCase(),
                  )
                }
                onToggleNotify={onToggleNotify}
              />
            ))}
          </ol>
        )}
      </main>
    </AppChrome>
  );
}
