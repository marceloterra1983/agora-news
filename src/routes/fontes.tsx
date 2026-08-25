import { AppChrome } from "@/components/news/app-chrome";
import { FontesBatchBar } from "@/components/news/fontes-batch-bar";
import { FontesChip, FontesSortSelect } from "@/components/news/fontes-chip";
import { FontesSites } from "@/components/news/fontes-sites";
import { ProfileRow } from "@/components/news/fontes-profile-row";
import { useExtraFontes } from "@/lib/news/use-extra-fontes";
import { useFontesLeave } from "@/lib/news/use-fontes-leave";
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
import { loadFontes } from "@/lib/news/server";
import { routeMeta } from "@/lib/news/route-meta";
import { relativeTime } from "@/lib/news/format";
import { DEFAULT_SECTION, normalizeSection, type Category } from "@/lib/news/types";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare, ChevronDown, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type FontesSearch = { secao: Category; q?: string; sort?: SortKey };
export const Route = createFileRoute("/fontes")({
  head: () => ({ meta: routeMeta("Fontes", "Organize os perfis que formam seu feed de notícias.") }),
  validateSearch: (raw: Record<string, unknown>): FontesSearch => {
    const sort = FONTES_SORTS.find(({ id }) => id === raw.sort)?.id;
    const q = typeof raw.q === "string" && raw.q ? raw.q.slice(0, 80) : undefined;
    return { secao: normalizeSection(typeof raw.secao === "string" ? raw.secao : DEFAULT_SECTION), q, sort };
  },
  loaderDeps: ({ search }) => ({ secao: search.secao }),
  loader: async ({ deps }) => loadFontes({ data: { category: deps.secao } }),
  component: FontesPage,
});

function FontesPage() {
  const { secao, q = "", sort: sortParam } = Route.useSearch();
  const navigate = Route.useNavigate();
  const sort = sortParam ?? "recent";
  const initial = Route.useLoaderData();
  const prefs = useFontesPrefs(secao);
  const [openHandle, setOpenHandle] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const extras = useExtraFontes();
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [groupIds, setGroupIds] = useState<string[]>([]);
  useFontesLeave(secao, openHandle, setOpenHandle);

  useEffect(() => {
    setGroupIds(allGroupIds(secao));
    setPicked(new Set());
    setPicking(false);
    return onCustomGroups(() => setGroupIds(allGroupIds(secao)));
  }, [secao]);

  useEffect(() => {
    if (sortParam) return;
    const stored = readStoredSort();
    if (stored !== "recent") void navigate({ search: (current) => ({ ...current, sort: stored }), replace: true, resetScroll: false });
  }, [navigate, sortParam]);
  function changeSort(next: SortKey) {
    setOpenGroups(new Set());
    void navigate({ search: (current) => ({ ...current, sort: next === "recent" ? undefined : next }), replace: true, resetScroll: false });
    try {
      localStorage.setItem(FONTES_SORT_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const seed = useMemo(() => seedFontes(secao), [secao]);
  const { data, isFetching } = useQuery({
    queryKey: ["fontes", secao],
    queryFn: () => loadFontes({ data: { category: secao } }),
    initialData: initial,
    staleTime: 45_000,
  });

  const base = data?.rows?.length ? data.rows : seed;
  const withExtras = useMemo(() => mergeExtraFontes(base, extras, secao), [base, extras, secao]);
  const rows = sortFontesRows(withExtras, sort, prefs.starred).map((r) => ({
    ...r,
    group: prefs.groupOf(r.handle) ?? r.group ?? "novos",
  }));
  const visible = filterFontesRows(rows, q, secao);
  const grouped = groupFontesRows(visible, groupIds);
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
          aria-label="Ordenar e editar fontes"
          data-testid="fontes-toolbar"
        >
          <FontesSortSelect sort={sort} onChange={changeSort} />
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
      <div aria-busy={isFetching} className="mx-auto max-w-2xl px-4 pb-24 max-sm:max-w-none">
        <h1 className="sr-only">Fontes</h1>
        <label className="mt-3 block">
          <span className="sr-only">Filtrar no catálogo</span>
          <input
            value={q}
            onChange={(e) => void navigate({ search: (current) => ({ ...current, q: e.target.value || undefined }), replace: true, resetScroll: false })}
            placeholder="Filtrar no catálogo"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false} autoComplete="off" name="fontes-filter"
            className="h-10 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          />
        </label>
        {picking ? <FontesBatchBar count={picked.size} groupIds={groupIds} onMove={movePicked} /> : null}
        {prefs.notifyBusy ? <p role="status" className="py-2 text-sm text-mute">Atualizando aviso…</p> : null}
        {prefs.notifyError ? <p role="alert" className="py-2 text-sm text-mark">{prefs.notifyError}</p> : null}

        {visible.length === 0 ? (
          <p role="status" className="py-10 text-center text-sm text-mute">
            {sort === "starred" ? "Nenhum favorito ainda. Toque na estrela de um perfil." : "Nenhum perfil."}
          </p>
        ) : sort === "groups" ? (
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
                              width={28}
                              height={28}
                              loading="lazy"
                              referrerPolicy="no-referrer"
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
                            onToggleNotify={prefs.toggleNotify}
                          />
                        ))}
                      </ol>
                    </>
                  ) : null}
                </li>
              );
            })}
          </ul>
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
                onToggleNotify={prefs.toggleNotify}
              />
            ))}
          </ol>
        )}
        <FontesSites section={secao} />
      </div>
    </AppChrome>
  );
}
