import { Link, useRouterState } from "@tanstack/react-router";
import { Bookmark, Newspaper, Search, Wifi } from "lucide-react";
import { readerDate } from "@/lib/news/format";
import { type Category } from "@/lib/news/types";
import { SECTIONS } from "@/lib/news/sections";
import { cn } from "@/lib/utils";
import { AppMenu } from "./app-menu";
import { Tip } from "./icon-btn";
import { PrefsSync } from "./prefs-sync";

export function AppChrome({
  category,
  children,
}: {
  category: Category;
  query?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <PrefsSync />
      <CompactHeader category={category} />
      {children}
      <TabBar category={category} />
    </div>
  );
}

function CompactHeader({ category }: { category: Category }) {
  return (
    <header data-chrome="compact" className="sticky top-0 z-30 border-b border-line bg-paper">
      <div className="row mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {SECTIONS.map((s) => {
            const on = s.slug === category;
            return (
              <Link
                key={s.slug}
                to="/"
                search={{ secao: s.slug }}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold tracking-wide no-underline",
                  on ? "bg-ink text-paper" : "bg-paper-2 text-mute",
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
        <p className="hidden shrink-0 font-sans text-sm text-ink-soft sm:block" suppressHydrationWarning>
          {readerDate()}
        </p>
        <AppMenu />
      </div>
    </header>
  );
}

function TabBar({ category }: { category: Category }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/" as const, label: "Feed", icon: Newspaper, search: { secao: category } },
    { to: "/fontes" as const, label: "Fontes", icon: Wifi, search: { secao: category } },
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
