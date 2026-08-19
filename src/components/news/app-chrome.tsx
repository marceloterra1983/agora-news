import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bookmark, Newspaper, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { type Category } from "@/lib/news/types";
import { SECTIONS } from "@/lib/news/sections";
import {
  keepsSectionInUrl,
  readLastSection,
  sectionNavTarget,
  writeLastSection,
} from "@/lib/news/section-pref";
import { groupStyle } from "@/lib/news/group-style";
import { useSectionCatalog } from "@/lib/news/use-section-catalog";
import { cn } from "@/lib/utils";
import { AppMenu } from "./app-menu";
import { Tip } from "./icon-btn";
import { PrefsSync } from "./prefs-sync";

const GROUP_CHIP =
  "inline-flex h-[32px] shrink-0 items-center rounded-full px-3 text-[12px] font-semibold shadow-sm";

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
  const shown = keepsSectionInUrl(pathname)
    ? category
    : (remembered ?? category);

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
    <div
      data-chrome-root=""
      data-groups-dock={onGroup ? "" : undefined}
      className="min-h-dvh w-full min-w-0 overflow-x-clip bg-paper text-ink"
    >
      <PrefsSync />
      <GrokHeader category={shown} onPickSec={pickSec} toolbar={toolbar} />
      <main
        id="conteudo-principal"
        tabIndex={-1}
        data-chrome-main=""
        className={cn(
          "pb-[calc(var(--agora-nav-tap)+env(safe-area-inset-bottom,0px))] max-sm:pt-[calc(var(--agora-header)+env(safe-area-inset-top,0px))]",
          onGroup &&
            "pb-[calc(var(--agora-nav-tap)+var(--agora-groups)+env(safe-area-inset-bottom,0px))]",
        )}
      >
        {children}
      </main>
      {onGroup ? (
        <GroupDock
          category={shown}
          group={group ?? "all"}
          onPick={onGroup}
        />
      ) : null}
      <TabBar category={shown} />
    </div>
  );
}

function GrokHeader({
  category,
  onPickSec,
  toolbar,
}: {
  category: Category;
  onPickSec: (slug: Category) => void;
  toolbar?: React.ReactNode;
}) {
  const current = SECTIONS.find((s) => s.slug === category) ?? SECTIONS[0];

  return (
    <header
      data-chrome="compact"
      className="sticky top-0 z-40 w-full min-w-0 overflow-x-clip border-b border-line bg-paper pt-[env(safe-area-inset-top,0px)]"
    >
      <div className="mx-auto flex h-[var(--agora-header)] w-full min-w-0 max-w-2xl items-center gap-1.5 pr-3 pl-2 max-sm:max-w-none">
        <div className="relative shrink-0">
          <label htmlFor="agora-section" className="sr-only">
            Assunto
          </label>
          <select
            id="agora-section"
            data-section-select=""
            value={current.slug}
            onChange={(event) => onPickSec(event.target.value as Category)}
            className="h-[44px] min-w-[44px] rounded-full border-0 bg-ink px-3 text-[13px] font-semibold tracking-wide text-paper"
          >
            {SECTIONS.map((section) => (
              <option key={section.slug} value={section.slug}>
                {section.label}
              </option>
            ))}
          </select>
        </div>

        <div
          data-h-scroll
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto"
        >
          {toolbar}
        </div>

        <AppMenu />
      </div>
    </header>
  );
}

function GroupDock({
  category,
  group,
  onPick,
}: {
  category: Category;
  group: string;
  onPick: (g: string) => void;
}) {
  const catalog = useSectionCatalog(category);
  return (
    <div
      data-chrome="groups"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--agora-nav-tap)+env(safe-area-inset-bottom,0px)+8px)] z-[35] px-3"
    >
      <div
        data-group-dock=""
        className="pointer-events-auto mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-1.5"
      >
        <button
          type="button"
          data-group-chip=""
          aria-pressed={group === "all"}
          onClick={() => onPick("all")}
          className={cn(
            GROUP_CHIP,
            group === "all"
              ? "bg-ink text-paper ring-1 ring-ink/40 opacity-95"
              : "bg-paper-2 text-ink-soft opacity-70",
          )}
        >
          Todos
        </button>
        {catalog.groups.map((g) => {
          const st = groupStyle(g.id);
          const on = group === g.id;
          return (
            <button
              key={g.id}
              type="button"
              data-group-chip=""
              aria-pressed={on}
              onClick={() => onPick(g.id)}
              className={cn(
                GROUP_CHIP,
                on ? st.chipOn : st.chip,
                on ? "opacity-95" : "opacity-70",
              )}
            >
              {g.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TabBar({ category }: { category: Category }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    {
      to: "/" as const,
      label: "Feed",
      icon: Newspaper,
      search: { secao: category },
    },
    {
      to: "/fontes" as const,
      label: "Fontes",
      icon: UserRound,
      search: { secao: category },
    },
    {
      to: "/buscar" as const,
      label: "Buscar",
      icon: Search,
      search: { secao: category },
    },
    {
      to: "/salvos" as const,
      label: "Salvos",
      icon: Bookmark,
      search: { secao: category },
    },
  ];
  return (
    <nav
      data-chrome="tabs"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="mx-auto grid h-[var(--agora-nav-tap)] w-full max-w-2xl grid-cols-4 max-sm:max-w-none">
        {items.map((item) => {
          const active =
            item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Tip key={item.to} label={item.label}>
              <Link
                to={item.to}
                search={item.search}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[var(--agora-tap)] min-h-[var(--agora-tap)] w-full flex-col items-center justify-center no-underline",
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
