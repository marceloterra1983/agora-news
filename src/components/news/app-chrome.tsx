import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bookmark, ChevronDown, Newspaper, Search, Wifi } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

function SectionSelect({ category }: { category: Category }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = SECTIONS.find((s) => s.slug === category) ?? SECTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(slug: Category) {
    setOpen(false);
    if (slug === category) return;
    try {
      localStorage.setItem("agora-last-secao", slug);
    } catch {
      /* ignore */
    }
    void navigate({ to: "/", search: { secao: slug } });
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Seção ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 min-w-[5.5rem] items-center justify-between gap-1.5 rounded-full bg-ink px-3.5 text-sm font-semibold tracking-wide text-paper"
      >
        <span>{current.label}</span>
        <ChevronDown className={cn("size-4 opacity-80 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Escolher seção"
          className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[8.5rem] overflow-hidden rounded-xl border border-line bg-paper shadow-card"
        >
          {SECTIONS.map((s) => {
            const on = s.slug === category;
            return (
              <li key={s.slug} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => pick(s.slug)}
                  className={cn(
                    "flex w-full items-center px-3.5 py-2.5 text-left text-sm font-semibold",
                    on ? "bg-paper-2 text-ink" : "text-ink-soft hover:bg-paper-2 hover:text-ink",
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
  );
}

function CompactHeader({ category }: { category: Category }) {
  return (
    <header data-chrome="compact" className="sticky top-0 z-30 border-b border-line bg-paper">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
        <SectionSelect category={category} />
        <div className="min-w-0 flex-1" />
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
