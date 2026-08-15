import { AppChrome } from "@/components/news/app-chrome";
import { FonteControls, FonteDisabledBadge } from "@/components/news/fonte-controls";
import { formatCount } from "@/lib/news/influence";
import type { InfluenceRow } from "@/lib/news/influence";
import { extraFonteToRow, loadExtraFontes, syncExtraFontes } from "@/lib/news/extra-fontes";
import { enableFavoriteNotify } from "@/lib/news/notify-favorites";
import { normHandle } from "@/lib/news/fontes-prefs";
import { GROUP_HINTS, GROUP_LABELS, GROUP_ORDER, blurbFor, profilesFor, type ProfileGroup } from "@/lib/news/profiles";
import { loadFontes, loadFontesLive } from "@/lib/news/server";
import { relativeTime } from "@/lib/news/format";
import { DEFAULT_SECTION, normalizeSection, type Category } from "@/lib/news/types";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, ChevronDown, Clock, Layers, Star, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Tip } from "@/components/news/icon-btn";
import { XLogo } from "@/components/news/x-logo";

type FontesSearch = { secao: Category };
type SortKey = "recent" | "followers" | "groups" | "starred";

const SORT_KEY = "agora-fontes-sort";

const SORTS: { id: SortKey; label: string; icon: typeof Clock }[] = [
  { id: "recent", label: "Recente", icon: Clock },
  { id: "followers", label: "Seguidores", icon: Users },
  { id: "groups", label: "Grupos", icon: Layers },
  { id: "starred", label: "Fav", icon: Star },
];

function readStoredSort(): SortKey {
  if (typeof window === "undefined") return "recent";
  try {
    const v = localStorage.getItem(SORT_KEY);
    if (v === "recent" || v === "followers" || v === "groups" || v === "starred") return v;
  } catch {
    /* ignore */
  }
  return "recent";
}

export const Route = createFileRoute("/fontes")({
  validateSearch: (raw: Record<string, unknown>): FontesSearch => ({
    secao: normalizeSection(typeof raw.secao === "string" ? raw.secao : DEFAULT_SECTION),
  }),
  loaderDeps: ({ search }) => ({ secao: search.secao }),
  loader: async ({ deps }) => loadFontes({ data: { category: deps.secao } }),
  component: FontesPage,
});

function Chip({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Tip label={label}>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          active ? "bg-ink text-paper" : "bg-paper-2 text-mute",
        )}
      >
        {children}
      </button>
    </Tip>
  );
}

function byRecent(a: InfluenceRow, b: InfluenceRow): number {
  const ta = a.lastPost ? Date.parse(a.lastPost.publishedAt) : 0;
  const tb = b.lastPost ? Date.parse(b.lastPost.publishedAt) : 0;
  return tb - ta || a.name.localeCompare(b.name, "pt");
}

function emptyRow(p: ReturnType<typeof profilesFor>[number]): InfluenceRow {
  return {
    handle: p.handle,
    name: p.name,
    group: p.group,
    followers: 0,
    following: 0,
    tweets: 0,
    verified: false,
    avatar: null,
    bio: null,
    lastPost: null,
    inFeed: 0,
    articles: 0,
    longform: 0,
    likes: 0,
    engagement: 0,
    views: 0,
    er: 0,
    score: 0,
  };
}

function FontesPage() {
  const { secao } = Route.useSearch();
  const initial = Route.useLoaderData();
  const prefs = useFontesPrefs();
  const [openHandle, setOpenHandle] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");
  const [openGroups, setOpenGroups] = useState<Set<ProfileGroup>>(() => new Set());
  const [extras, setExtras] = useState<ReturnType<typeof loadExtraFontes>>([]);

  useEffect(() => {
    setSort(readStoredSort());
    const refresh = () => setExtras(loadExtraFontes());
    refresh();
    syncExtraFontes();
    window.addEventListener("agora-extra-fontes", refresh);
    return () => window.removeEventListener("agora-extra-fontes", refresh);
  }, []);

  function changeSort(next: SortKey) {
    setSort(next);
    setOpenGroups(new Set());
    try {
      localStorage.setItem(SORT_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const seed = useMemo(() => profilesFor(secao).map(emptyRow), [secao]);
  const { data } = useQuery({
    queryKey: ["fontes", secao],
    queryFn: () => loadFontes({ data: { category: secao } }),
    initialData: initial,
    staleTime: 30_000,
  });
  const { data: live } = useQuery({
    queryKey: ["fontes-live", secao],
    queryFn: () => loadFontesLive({ data: { category: secao } }),
    staleTime: 10 * 60_000,
  });

  const base = live?.rows?.length ? live.rows : data?.rows?.length ? data.rows : seed;
  const withExtras = useMemo(() => {
    const seen = new Set(base.map((r) => r.handle.toLowerCase()));
    const added = extras
      .filter((e) => !seen.has(e.handle.toLowerCase()))
      .map(extraFonteToRow);
    return [...added, ...base];
  }, [base, extras]);

  const rows = useMemo(() => {
    const starred = new Set(prefs.starred);
    const list = sort === "starred" ? withExtras.filter((r) => starred.has(normHandle(r.handle))) : withExtras;
    return [...list].sort((a, b) => {
      if (sort === "followers") return (b.followers || 0) - (a.followers || 0) || byRecent(a, b);
      return byRecent(a, b);
    });
  }, [withExtras, prefs.starred, sort]);

  const grouped = useMemo(() => {
    return GROUP_ORDER.map((id) => {
      const items = rows.filter((r) => r.group === id).sort(byRecent);
      const latest = items.find((r) => r.lastPost)?.lastPost?.publishedAt ?? null;
      const known = [...items].sort((a, b) => (b.followers || 0) - (a.followers || 0));
      return {
        id,
        label: GROUP_LABELS[id],
        hint: GROUP_HINTS[id],
        items,
        latest,
        faces: known.filter((r) => r.avatar).slice(0, 3),
        preview: known
          .slice(0, 3)
          .map((r) => r.name)
          .join(" · "),
      };
    })
      .filter((g) => g.items.length)
      .sort((a, b) => {
        const ta = a.latest ? Date.parse(a.latest) : 0;
        const tb = b.latest ? Date.parse(b.latest) : 0;
        return tb - ta;
      });
  }, [rows]);

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
            {SORTS.map((s) => {
              const Icon = s.icon;
              return (
                <Chip key={s.id} active={sort === s.id} label={s.label} onClick={() => changeSort(s.id)}>
                  <Icon className="size-3.5" />
                </Chip>
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

function ProfileRow({
  row,
  index,
  open,
  prefs,
  hideGroup,
  onToggle,
  onToggleNotify,
}: {
  row: InfluenceRow;
  index: number;
  open: boolean;
  prefs: ReturnType<typeof useFontesPrefs>;
  hideGroup?: boolean;
  onToggle: () => void;
  onToggleNotify: (handle: string) => void;
}) {
  const pausedRow = prefs.isDisabled(row.handle);
  const followers = row.followers ? formatCount(row.followers) : "";
  return (
    <li className={cn("border-b border-line", pausedRow && "opacity-55")}>
      <div className="flex items-start gap-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left"
        >
          <span className="w-4 shrink-0 text-right font-mono text-[10px] tabular-nums text-mute">
            {index + 1}
          </span>
          {row.avatar ? (
            <img
              src={row.avatar}
              alt=""
              className="size-7 shrink-0 rounded-full bg-paper-2 object-cover"
            />
          ) : (
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-paper-2 text-[10px] font-medium text-mute">
              {row.name.charAt(0)}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <span className="truncate text-sm font-medium text-ink">{row.name}</span>
              {row.verified ? (
                <BadgeCheck className="size-3 shrink-0 text-ink" aria-label="verificado" />
              ) : null}
              <FonteDisabledBadge show={pausedRow} />
              <ChevronDown
                className={cn(
                  "size-3 shrink-0 text-mute transition-transform",
                  open && "rotate-180",
                )}
              />
            </span>
            <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-mute">
              {GROUP_LABELS[row.group] && row.group !== "novos" ? (
                <span className="inline-flex h-4 shrink-0 items-center rounded-full bg-paper-2 px-1.5 text-[9px] font-semibold leading-none text-ink-soft">
                  {GROUP_LABELS[row.group]}
                </span>
              ) : (
                <span className="truncate">@{row.handle}</span>
              )}
              {row.lastPost ? (
                <>
                  <span className="shrink-0 text-line-strong">·</span>
                  <time dateTime={row.lastPost.publishedAt} suppressHydrationWarning className="shrink-0 tabular-nums">
                    {relativeTime(row.lastPost.publishedAt)}
                  </time>
                </>
              ) : null}
              {followers ? (
                <>
                  <span className="shrink-0 text-line-strong">·</span>
                  <span className="shrink-0 tabular-nums">{followers}</span>
                </>
              ) : null}
            </span>
          </span>
        </button>
        <FonteControls
          handle={row.handle}
          starred={prefs.isStarred(row.handle)}
          disabled={pausedRow}
          notify={prefs.isNotify(row.handle)}
          onToggleStar={prefs.toggleStar}
          onToggleDisabled={prefs.toggleDisabled}
          onToggleNotify={onToggleNotify}
        />
      </div>

      {open ? (
        <div className="mb-2.5 ml-7 mr-0.5 rounded-md bg-paper-2 px-3 py-2.5">
          {hideGroup || row.group === "novos" ? null : (
            <p className="text-[12px] font-medium text-mute">{GROUP_LABELS[row.group]}</p>
          )}
          <p className={cn("text-[13px] leading-relaxed text-ink-soft", !hideGroup && row.group !== "novos" && "mt-1")}>
            {row.group === "novos" && row.bio ? row.bio : blurbFor(row.handle, row.name)}
          </p>
          {row.followers ? (
            <p className="mt-2 text-[12px] text-mute">{formatCount(row.followers)} seguidores</p>
          ) : null}
          <div className="mt-3 border-t border-line pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
              Último post
              {row.lastPost ? (
                <>
                  {" "}
                  <time dateTime={row.lastPost.publishedAt} suppressHydrationWarning>
                    · {relativeTime(row.lastPost.publishedAt)}
                  </time>
                </>
              ) : null}
            </p>
            {row.lastPost ? (
              <Link
                to="/materia/$id"
                params={{ id: row.lastPost.id }}
                className="mt-1 block text-sm font-medium leading-snug text-ink"
              >
                {row.lastPost.title}
              </Link>
            ) : (
              <p className="mt-1 text-sm text-mute">Nenhum post nas últimas 48 horas.</p>
            )}
          </div>
          <Tip label={`Abrir @${row.handle} no X`}>
            <a
              href={`https://x.com/${row.handle}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Abrir @${row.handle} no X`}
              className="mt-3 grid size-8 place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
            >
              <XLogo className="size-3.5" />
            </a>
          </Tip>
        </div>
      ) : null}
    </li>
  );
}
