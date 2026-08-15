import { Link, useNavigate } from "@tanstack/react-router";
import { Bookmark, LogIn, Menu, Search, Smartphone, Users, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listCategories } from "@/lib/news/catalog";
import { loadCatalogMeta } from "@/lib/news/server";
import { labelFor, normalizeSection, type Category } from "@/lib/news/types";
import { mastheadDate } from "@/lib/news/format";
import { useNewsStore } from "@/lib/news/store";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { UserButton } from "@/lib/auth/gates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tip } from "./icon-btn";

export function Masthead({
  category,
  query,
}: {
  category: Category;
  query?: string;
}) {
  const section = normalizeSection(category);
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(Boolean(query));
  const [draft, setDraft] = useState(query ?? "");
  const navigate = useNavigate();
  const savedCount = useNewsStore((s) => s.savedIds.length);
  const { user, isPending } = useCurrentUserState();
  const { data: meta } = useQuery({
    queryKey: ["news-meta", section],
    queryFn: () => loadCatalogMeta({ data: { refresh: false, category: section } }),
    staleTime: 15_000,
    refetchInterval: 45_000,
    refetchOnWindowFocus: true,
  });
  const categories = meta?.categories?.length ? meta.categories : listCategories();

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = draft.trim();
    void navigate({ to: "/", search: { secao: section, q: q || undefined } });
  }

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Tip label={open ? "Fechar menu" : "Abrir menu"}>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-sm text-ink lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </Tip>
        <Link to="/" search={{ secao: section }} className="min-w-0 text-center lg:text-left">
          <p className="font-display text-[2.1rem] font-medium leading-none tracking-[-0.04em] text-ink sm:text-5xl">
            {labelFor(section)}
          </p>
          <p className="mt-1 hidden text-[11px] uppercase tracking-[0.18em] text-mute sm:block">
            NEWS · {mastheadDate()}
          </p>
        </Link>
        <div className="flex items-center gap-1">
          <Tip label="Buscar">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Buscar"
              onClick={() => setSearchOpen((v) => !v)}
            >
              <Search />
            </Button>
          </Tip>
          <Tip label="Perfis do X">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/fontes" search={{ secao: section }} aria-label="Perfis do X">
                <Users />
              </Link>
            </Button>
          </Tip>
          <Tip label="Instalar o app">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/instalar" aria-label="Instalar o app">
                <Smartphone />
              </Link>
            </Button>
          </Tip>
          <Tip label="Matérias salvas">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/salvos" aria-label="Matérias salvas">
                <span className="relative">
                  <Bookmark />
                  {savedCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-mark px-1 text-[10px] font-semibold text-mark-fg">
                      {savedCount}
                    </span>
                  )}
                </span>
              </Link>
            </Button>
          </Tip>
          {isPending ? (
            <div className="hidden h-8 w-8 animate-pulse rounded-full bg-paper-2 sm:block" />
          ) : user ? (
            <div className="hidden sm:block">
              <UserButton />
            </div>
          ) : (
            <Tip label="Entrar">
              <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
                <Link to="/login" aria-label="Entrar">
                  <LogIn />
                </Link>
              </Button>
            </Tip>
          )}
        </div>
      </div>
      <p className="px-4 pb-2 text-center text-[11px] uppercase tracking-[0.16em] text-mute sm:hidden">
        NEWS · {mastheadDate()}
      </p>
      <div className="h-px bg-mark" />
      <nav className="mx-auto hidden max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2 sm:px-6 lg:flex">
        {categories.map((c) => (
          <Link
            key={c}
            to="/"
            search={{ secao: c, q: undefined }}
            className={cn(
              "rounded-sm px-3 py-2 text-sm font-medium tracking-wide text-ink-soft transition-colors duration-150 hover:text-ink",
              section === c && "bg-paper-2 text-ink",
            )}
          >
            {labelFor(c)}
          </Link>
        ))}
        <Link
          to="/referencias"
          className="ml-auto rounded-sm px-3 py-2 text-sm font-medium tracking-wide text-ink-soft hover:text-ink"
        >
          Planilha
        </Link>
        <Link
          to="/fontes"
          search={{ secao: section }}
          className="rounded-sm px-3 py-2 text-sm font-medium tracking-wide text-ink-soft hover:text-ink"
        >
          Perfis
        </Link>
      </nav>
      {open && (
        <nav className="grid gap-1 border-t border-line px-3 py-3 lg:hidden">
          {categories.map((c) => (
            <Link
              key={c}
              to="/"
              search={{ secao: c, q: undefined }}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-sm px-3 py-3 text-base text-ink-soft",
                section === c && "bg-paper-2 font-medium text-ink",
              )}
            >
              {labelFor(c)}
            </Link>
          ))}
          <Link
            to="/referencias"
            onClick={() => setOpen(false)}
            className="px-3 py-3 text-ink-soft"
          >
            Planilha
          </Link>
          <Link
            to="/fontes"
            search={{ secao: section }}
            onClick={() => setOpen(false)}
            className="px-3 py-3 text-ink-soft"
          >
            Perfis do X
          </Link>
          <Link
            to="/instalar"
            onClick={() => setOpen(false)}
            className="px-3 py-3 text-ink-soft"
          >
            Instalar o app
          </Link>
          <Link to="/login" onClick={() => setOpen(false)} className="px-3 py-3 text-ink-soft">
            Entrar
          </Link>
        </nav>
      )}
      {searchOpen && (
        <form
          onSubmit={submitSearch}
          className="mx-auto flex max-w-6xl gap-2 px-4 pb-3 sm:px-6"
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Buscar em ${labelFor(section)}`}
            aria-label="Buscar notícias"
            autoFocus
          />
          <Tip label="Buscar">
            <Button type="submit" size="icon" aria-label="Buscar">
              <Search />
            </Button>
          </Tip>
        </form>
      )}
    </header>
  );
}
