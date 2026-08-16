import { AppChrome } from "@/components/news/app-chrome";
import { FontesBatchBar } from "@/components/news/fontes-batch-bar";
import { FontesChip } from "@/components/news/fontes-chip";
import { ProfileRow } from "@/components/news/fontes-profile-row";
import { groupOf } from "@/components/news/group-tag";
import { loadExtraFontes, syncExtraFontes } from "@/lib/news/extra-fontes";
import {
  FONTES_SORT_KEY,
  FONTES_SORTS,
  groupFontesRows,
  filterFontesRows,
  mergeExtraFontes,
  readStoredSort,
  seedFontes,
  sortFontesRows,
  type SortKey,
} from "@/lib/news/fontes-sort";
import { allGroupIds, onCustomGroups } from "@/lib/news/groups";
import { enableFavoriteNotify } from "@/lib/news/notify-favorites";
import { loadFontes } from "@/lib/news/server";
import { relativeTime } from "@/lib/news/format";
import { DEFAULT_SECTION, normalizeSection, type Category } from "@/lib/news/types";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare, ChevronDown, Square } from "lucide-react";
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
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const [extras, setExtras] = useState<ReturnType<typeof loadExtraFontes>>([]);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [groupIds, setGroupIds] = useState<string[]>(() => allGroupIds());
  const [q, setQ] = useState("");

  useEffect(() => {
    setSort(readStoredSort());
    const refresh = () => setExtras(loadExtraFontes());
    refresh();
    syncExtraFontes();
    window.addEventListener("agora-extra-fontes", refresh);
    return () => window.removeEventListener("agora-extra-fontes", refresh);
  }, []);

  useEffect(() => onCustomGroups(() => setGroupIds(allGroupIds())), []);

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

  const base = data?.rows?.length ? data.rows : seed;
  const withExtras = useMemo(() => mergeExtraFontes(base, extras, secao), [base, extras, secao]);
  const rows = useMemo(
    () =>
      sortFontesRows(withExtras, sort, prefs.starred).map((r) => ({
        ...r,
        group: prefs.groupOf(r.handle) ?? groupOf(r.handle),
      })),
    [withExtras, prefs.starred, prefs.groups, sort],
  );
  const visible = useMemo(() => filterFontesRows(rows, q), [rows, q]);
  const grouped = useMemo(() => groupFontesRows(visible, groupIds), [visible, groupIds]);

  async function onToggleNotify(handle: string) {
    const turningOn = !prefs.isNotify(handle);
    if (turningOn) await enableFavoriteNotify();
    prefs.toggleNotify(handle);
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePicked(handle: string) {
    const key = handle.toLowerCase();
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function movePicked(group: string) {
    for (const h of picked) prefs.setGroup(h, group);
    setPicked(new Set());
    setPicking(false);
  }

  function rowToggle(handle: string) {
    if (picking) {
      togglePicked(handle);
      return;
    }
    const key = handle.toLowerCase();
    setOpenHandle(openHandle === key ? null : key);
  }

  return (
    <AppChrome
      category={secao}
      toolbar={
        <div
          className="flex min-w-0 flex-1 items-center gap-1"
          role="toolbar"
          aria-label="Ordenar fontes"
          data-testid="fontes-toolbar"
        >
          {FONTES_SORTS.map((s) => {
            const Icon = s.icon;
            return (
              <FontesChip key={s.id} active={sort === s.id} label={s.label} onClick={() => changeSort(s.id)}>
                <Icon className="size-3.5" />
              </FontesChip>
            );
          })}
          <FontesChip
            active={picking}
            label="Mover em lote"
            onClick={() => {
              setPicking((v) => !v);
              setPicked(new Set());
            }}
          >
            {picking ? <CheckSquare className="size-3.5" /> : <Square className="size-3.5" />}
          </FontesChip>
        </div>
      }
    >
      <main className="mx-auto max-w-2xl px-4 pb-24">
        <h1 className="sr-only">Fontes</h1>
        <label className="mt-3 block">
          <span className="sr-only">Filtrar no catálogo</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar no catálogo"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="h-10 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none"
          />
        </label>
        {picking ? <FontesBatchBar count={picked.size} groupIds={groupIds} onMove={movePicked} /> : null}

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
                        g.faces.map((f) =>
                          f.avatar ? (
                            <img
                              key={f.handle}
                              src={f.avatar}
                              alt=""
                              className="size-7 rounded-full border border-paper bg-paper-2 object-cover"
                            />
                          ) : (
                            <span
                              key={f.handle}
                              className="grid size-7 place-items-center rounded-full border border-paper bg-paper-2 text-[10px] font-medium text-mute"
                            >
                              {(f.handle || "?").charAt(0).toUpperCase()}
                            </span>
                          ),
                        )
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
                      <ol data-testid="fontes-list">
                        {g.items.map((row, i) => (
                          <ProfileRow
                            key={row.handle}
                            row={row}
                            index={i}
                            open={!picking && openHandle === row.handle.toLowerCase()}
                            prefs={prefs}
                            hideGroup
                            picking={picking}
                            picked={picked.has(row.handle.toLowerCase())}
                            onToggle={() => rowToggle(row.handle)}
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
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-mute">
            {sort === "starred" ? "Nenhum favorito ainda. Toque na estrela de um perfil." : "Nenhum perfil."}
          </p>
        ) : (
          <ol data-testid="fontes-list">
            {visible.map((row, i) => (
              <ProfileRow
                key={row.handle}
                row={row}
                index={i}
                open={!picking && openHandle === row.handle.toLowerCase()}
                prefs={prefs}
                picking={picking}
                picked={picked.has(row.handle.toLowerCase())}
                onToggle={() => rowToggle(row.handle)}
                onToggleNotify={onToggleNotify}
              />
            ))}
          </ol>
        )}
      </main>
    </AppChrome>
  );
}
