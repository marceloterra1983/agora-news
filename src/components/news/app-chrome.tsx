import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bookmark, Newspaper, Search, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { type Category } from "@/lib/news/types";
import { SECTIONS } from "@/lib/news/sections";
import { GROUP_LABELS, GROUP_ORDER, type ProfileGroup } from "@/lib/news/profiles";
import { groupStyle } from "@/lib/news/group-style";
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
}: {
  category: Category;
  query?: string;
  children: React.ReactNode;
  group?: ProfileGroup | "all";
  onGroup?: (g: ProfileGroup | "all") => void;
}) {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <PrefsSync />
      <GrokHeader category={category} group={group} onGroup={onGroup} />
      <div className="pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">{children}</div>
      <TabBar category={category} />
    </div>
  );
}

function GrokHeader({
  category,
  group = "all",
  onGroup,
}: {
  category: Category;
  group?: ProfileGroup | "all";
  onGroup?: (g: ProfileGroup | "all") => void;
}) {
  const navigate = useNavigate();
  const [secOpen, setSecOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = SECTIONS.find((s) => s.slug === category) ?? SECTIONS[0];

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
    if (slug === category) return;
    try {
      localStorage.setItem("agora-last-secao", slug);
    } catch {
      /* ignore */
    }
    void navigate({ to: "/", search: { secao: slug } });
  }

  function pickGroup(next: ProfileGroup | "all") {
    onGroup?.(next);
    try {
      sessionStorage.setItem(GROUP_KEY, next);
    } catch {
      /* ignore */
    }
  }

  return (
    <header data-chrome="compact" className="sticky top-0 z-30 border-b border-line bg-paper">
      <div className="mx-auto flex max-w-2xl items-center gap-1.5 px-3 py-2.5">
        <div ref={rootRef} className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={secOpen}
            aria-label={`Seção ${current.label}`}
            onClick={() => setSecOpen((v) => !v)}
            className="inline-flex h-8 items-center rounded-full bg-ink px-3 text-[12px] font-semibold tracking-wide text-paper"
          >
            {current.label}
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

        <div data-h-scroll className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            aria-pressed={group === "all"}
            onClick={() => pickGroup("all")}
            className={cn(
              "h-8 shrink-0 rounded-full px-2.5 text-[11px] font-semibold",
              group === "all" ? "bg-paper text-ink" : "bg-paper-2 text-mute",
            )}
          >
            Todos
          </button>
          {GROUP_ORDER.map((id) => {
            const st = groupStyle(id);
            const on = group === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => pickGroup(id)}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold",
                  on ? st.chipOn : st.chip,
                )}
              >
                <span className={cn("size-1.5 rounded-full", st.dot)} aria-hidden />
                {GROUP_LABELS[id]}
              </button>
            );
          })}
        </div>

        <AppMenu />
      </div>
    </header>
  );
}

function TabBar({ category }: { category: Category }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/" as const, label: "Feed", icon: Newspaper, search: { secao: category } },
    { to: "/fontes" as const, label: "Fontes", icon: User, search: { secao: category } },
    { to: "/buscar" as const, label: "Buscar", icon: Search, search: undefined },
    { to: "/salvos" as const, label: "Salvos", icon: Bookmark, search: undefined },
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
