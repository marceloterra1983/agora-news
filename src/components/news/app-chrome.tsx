import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bookmark, Newspaper, Search, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Category } from "@/lib/news/types";
import { SECTIONS } from "@/lib/news/sections";
import {
  keepsSectionInUrl,
  readLastSection,
  sectionNavTarget,
  writeLastSection,
} from "@/lib/news/section-pref";
import { GROUP_LABELS, type ProfileGroup } from "@/lib/news/profiles";
import { groupStyle } from "@/lib/news/group-style";
import { groupLabel } from "@/lib/news/groups";
import { useSectionCatalog } from "@/lib/news/use-section-catalog";
import { cn } from "@/lib/utils";
import { AppMenu } from "./app-menu";
import { Tip } from "./icon-btn";
import { PrefsSync } from "./prefs-sync";

const GROUP_KEY = "agora-feed-group";

export function AppChrome({
  category,
  children,
  group,
  onGroup,
  toolbar,
}: {
  category: Category;
  query?: string;
  children: React.ReactNode;
  group?: string;
  onGroup?: (g: string) => void;
  toolbar?: React.ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [remembered, setRemembered] = useState<Category | null>(null);
  const shown = keepsSectionInUrl(pathname) ? category : (remembered ?? category);

  useEffect(() => {
    if (keepsSectionInUrl(pathname)) {
      writeLastSection(category);
      setRemembered(null);
      return;
    }
    setRemembered((cur) => cur ?? readLastSection());
  }, [pathname, category]);

  function pickSec(slug: Category) {
    if (slug === shown) return;
    writeLastSection(slug);
    const dest = sectionNavTarget(pathname, slug);
    if (dest) void navigate(dest);
    else setRemembered(slug);
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <PrefsSync />
      <GrokHeader
        category={shown}
        group={group}
        onGroup={onGroup}
        onPickSec={pickSec}
        toolbar={toolbar}
      />
      <div className="pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">{children}</div>
      <TabBar category={shown} />
    </div>
  );
}

function GrokHeader({
  category,
  group = "all",
  onGroup,
  onPickSec,
  toolbar,
}: {
  category: Category;
  group?: string;
  onGroup?: (g: string) => void;
  onPickSec: (slug: Category) => void;
  toolbar?: React.ReactNode;
}) {
  const [secOpen, setSecOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = SECTIONS.find((s) => s.slug === category) ?? SECTIONS[0];
  const catalog = useSectionCatalog(category);

  useEffect(() => {
    if (!secOpen) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setSecOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSecOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [secOpen]);

  function pickSec(slug: Category) {
    setSecOpen(false);
    onPickSec(slug);
  }

  function pickGroup(next: string) {
    onGroup?.(next);
    try {
      sessionStorage.setItem(`${GROUP_KEY}:${category}`, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <header data-chrome="compact" className="sticky top-0 z-30 border-b border-line bg-paper">
      <div className="mx-auto flex h-[var(--agora-header)] max-w-2xl items-center gap-1.5 pr-3 pl-2">
        <div ref={rootRef} className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={secOpen}
            aria-label={`Assunto ${current.label}`}
            onClick={() => setSecOpen((v) => !v)}
            className="inline-flex h-7 items-center rounded-full bg-ink px-2.5 text-[13px] font-semibold tracking-wide text-paper"
          >
            <span>{current.label}</span>
          </button>
          {secOpen ? (
            <ul
              role="listbox"
              className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[7.5rem] overflow-hidden rounded-xl border border-line bg-paper shadow-card"
            >
              {SECTIONS.map((s) => {
                const on = s.slug === category;
                return (
                  <li key={s.slug} role="option" aria-selected={on}>
                    <button
                      type="button"
                      onClick={() => pickSec(s.slug)}
                      className={cn(
                        "flex w-full items-center px-3.5 py-2.5 text-left text-sm font-semibold",
                        on ? "bg-paper-2 text-ink" : "text-ink-soft hover:bg-paper-2",
                      )}
                    >
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        {toolbar ?? (onGroup ? (
          <div data-h-scroll className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              aria-pressed={group === "all"}
              onClick={() => pickGroup("all")}
              className={cn(
                "h-8 shrink-0 rounded-full px-2.5 text-[11px] font-semibold",
                group === "all" ? "bg-ink text-paper ring-1 ring-ink/40" : "bg-paper-2 text-mute",
              )}
            >
              Todos
            </button>
            {catalog.groupIds.map((id) => {
              const builtIn = id in GROUP_LABELS;
              const st = groupStyle((builtIn ? id : "novos") as ProfileGroup);
              const on = group === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pickGroup(id)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center rounded-full px-2.5 text-[11px] font-semibold",
                    on ? st.chipOn : st.chip,
                  )}
                >
                  {builtIn ? GROUP_LABELS[id as ProfileGroup] : groupLabel(id)}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="min-w-0 flex-1" />
        ))}

        <AppMenu />
      </div>
    </header>
  );
}

function TabBar({ category }: { category: Category }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/" as const, label: "Feed", icon: Newspaper, search: { secao: category } },
    { to: "/fontes" as const, label: "Fontes", icon: UserRound, search: { secao: category } },
    { to: "/buscar" as const, label: "Buscar", icon: Search, search: { secao: category } },
    { to: "/salvos" as const, label: "Salvos", icon: Bookmark, search: { secao: category } },
  ];
  return (
    <nav
      data-chrome="tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4">
        {items.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Tip key={item.to} label={item.label} side="top">
              <Link
                to={item.to}
                search={item.search}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center no-underline",
                  active ? "text-ink" : "text-mute",
                )}
                aria-label={item.label}
              >
                <Icon className="size-6" strokeWidth={active ? 2.2 : 1.7} />
              </Link>
            </Tip>
          );
        })}
      </div>
    </nav>
  );
}
