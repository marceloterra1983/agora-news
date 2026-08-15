import { AppChrome } from "@/components/news/app-chrome";
import { IconBtn, IconLink, iconBtnSolid, Tip } from "@/components/news/icon-btn";
import { XLogo } from "@/components/news/x-logo";
import { Input } from "@/components/ui/input";
import {
  addExtraFonte,
  isExtraFonte,
  loadExtraFontes,
  removeExtraFonte,
  syncExtraFontes,
} from "@/lib/news/extra-fontes";
import { formatCount } from "@/lib/news/influence";
import { relativeTime } from "@/lib/news/format";
import {
  hasInterest,
  loadInterests,
  removeInterest,
  saveInterest,
} from "@/lib/news/profile-interests";
import { profileByHandle } from "@/lib/news/profiles";
import { lookupXProfile, searchXUsers, summarizeProfile, type XUserHit } from "@/lib/news/server";
import { DEFAULT_SECTION } from "@/lib/news/types";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Bookmark, BookmarkCheck, ChevronDown, Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export const Route = createFileRoute("/buscar")({
  component: BuscarPage,
});

type Found = Extract<Awaited<ReturnType<typeof lookupXProfile>>, { found: true }>;

function addFromResult(result: Found, summary: string) {
  addExtraFonte({
    handle: result.handle,
    name: result.name,
    avatar: result.avatar,
    verified: result.verified,
    followers: result.followers,
    summary,
    lastPost: result.lastPost
      ? {
          id: result.lastPost.id,
          title: result.lastPost.text,
          publishedAt: result.lastPost.publishedAt,
        }
      : null,
  });
}

function BuscarPage() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<XUserHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Found | null>(null);
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [fontesTick, setFontesTick] = useState(0);
  const [openFrom, setOpenFrom] = useState<"search" | "interest" | null>(null);
  const [openingHandle, setOpeningHandle] = useState<string | null>(null);
  const seq = useRef(0);
  const searchSeq = useRef(0);

  useEffect(() => {
    setInterests(loadInterests());
    const refresh = () => setInterests(loadInterests());
    window.addEventListener("agora-profile-interests", refresh);
    const refreshFontes = () => setFontesTick((n) => n + 1);
    window.addEventListener("agora-extra-fontes", refreshFontes);
    syncExtraFontes();
    return () => {
      window.removeEventListener("agora-profile-interests", refresh);
      window.removeEventListener("agora-extra-fontes", refreshFontes);
    };
  }, []);

  useEffect(() => {
    const q = query.replace(/^@+/, "").trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    const id = ++searchSeq.current;
    setSearching(true);
    const t = window.setTimeout(async () => {
      try {
        const res = await searchXUsers({ data: { q } });
        if (id !== searchSeq.current) return;
        const extras = new Set(loadExtraFontes().map((e) => e.handle.toLowerCase()));
        setHits(
          res.users.map((u) => ({
            ...u,
            inFeed: u.inFeed || extras.has(u.handle.toLowerCase()),
          })),
        );
      } catch {
        if (id !== searchSeq.current) return;
        setHits([]);
      } finally {
        if (id === searchSeq.current) setSearching(false);
      }
    }, 280);
    return () => window.clearTimeout(t);
  }, [query]);

  const openHandle = useCallback(async (raw: string) => {
    const q = raw.replace(/^@+/, "").trim();
    if (!q) return;
    const id = ++seq.current;
    setOpeningHandle(q.toLowerCase());
    setLoading(true);
    setSummarizing(false);
    setError(null);
    setSummary("");
    try {
      const profile = await lookupXProfile({ data: { handle: q } });
      if (id !== seq.current) return;
      setLoading(false);
      if (!profile.found) {
        setResult(null);
        setOpeningHandle(null);
        setError("Perfil não encontrado. Confira o @ e tente de novo.");
        return;
      }
      setResult(profile);
      if (profile.summary) setSummary(profile.summary);
      if (profileByHandle(profile.handle) && profile.summary) return;
      setSummarizing(true);
      const extra = await summarizeProfile({
        data: {
          handle: profile.handle,
          name: profile.name,
          bio: profile.bio,
        },
      });
      if (id !== seq.current) return;
      if (extra.summary) {
        setSummary(extra.summary);
        void fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handle: profile.handle,
            name: profile.name,
            bio: profile.bio,
            summary_pt: extra.summary,
            avatar: profile.avatar,
            followers: profile.followers,
          }),
        }).catch(() => {});
      }
    } catch {
      if (id !== seq.current) return;
      setResult(null);
      setOpeningHandle(null);
      setError("Não deu para abrir o perfil agora. Tente de novo.");
    } finally {
      if (id === seq.current) {
        setLoading(false);
        setSummarizing(false);
      }
    }
  }, []);

  function toggleSearch(handle: string) {
    const key = handle.toLowerCase();
    const same =
      openFrom === "search" &&
      (result?.handle.toLowerCase() === key || openingHandle === key);
    if (same) {
      seq.current += 1;
      setOpenFrom(null);
      setResult(null);
      setOpeningHandle(null);
      setLoading(false);
      setSummarizing(false);
      setError(null);
      return;
    }
    setOpenFrom("search");
    void openHandle(handle);
  }

  const saved = result ? hasInterest(result.handle) : false;
  const known = result ? Boolean(profileByHandle(result.handle)) : false;
  const inFontes = result ? known || isExtraFonte(result.handle) : false;
  void fontesTick;
  const novos = hits.filter((h) => !h.inFeed);
  const jaNoFeed = hits.filter((h) => h.inFeed);
  const showList = query.replace(/^@+/, "").trim().length >= 2;

  function searchCard(handle: string) {
    const key = handle.toLowerCase();
    const open = openFrom === "search" && result?.handle.toLowerCase() === key;
    if (open && result) {
      return (
        <ProfileCard
          result={result}
          summary={summary}
          summarizing={summarizing}
          known={known}
          saved={saved}
          inFontes={inFontes}
          nested
          showFace={false}
          onSave={() => setInterests(saveInterest(result.handle))}
          onRemove={() => setInterests(removeInterest(result.handle))}
          onAddFonte={() => addFromResult(result, summary)}
          onRemoveFonte={() => removeExtraFonte(result.handle)}
        />
      );
    }
    if (openFrom === "search" && loading && openingHandle === key) {
      return <p className="px-3 pb-3 text-sm text-mute">Abrindo perfil…</p>;
    }
    return null;
  }

  return (
    <AppChrome category={DEFAULT_SECTION}>
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:px-6">
        <h1 className="sr-only">Buscar</h1>

        <label className="relative block">
          <span className="sr-only">Buscar perfil novo</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              seq.current += 1;
              setResult(null);
              setSummary("");
              setError(null);
              setOpenFrom(null);
              setOpeningHandle(null);
              setLoading(false);
              setSummarizing(false);
            }}
            placeholder="@lexfridman, Dwarkesh, Fei…"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            className="h-11 pl-10"
          />
        </label>

        {showList ? (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
            {novos.map((p) => (
              <HitRow
                key={p.handle}
                hit={p}
                active={
                  openFrom === "search" &&
                  (result?.handle.toLowerCase() === p.handle.toLowerCase() ||
                    openingHandle === p.handle.toLowerCase())
                }
                onToggle={() => toggleSearch(p.handle)}
              >
                {searchCard(p.handle)}
              </HitRow>
            ))}
            {searching && hits.length === 0 ? (
              <li className="px-3 py-3 text-sm text-mute">Buscando no X…</li>
            ) : null}
            {!searching && novos.length === 0 && jaNoFeed.length === 0 ? (
              <li className="px-3 py-3 text-sm text-ink-soft">
                Nenhum perfil novo com esse nome. Tente outro @ ou um sobrenome.
              </li>
            ) : null}
            {jaNoFeed.length > 0 ? (
              <li className="bg-paper-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-mute">
                Já no feed
              </li>
            ) : null}
            {jaNoFeed.map((p) => (
              <HitRow
                key={p.handle}
                hit={p}
                active={
                  openFrom === "search" &&
                  (result?.handle.toLowerCase() === p.handle.toLowerCase() ||
                    openingHandle === p.handle.toLowerCase())
                }
                onToggle={() => toggleSearch(p.handle)}
              >
                {searchCard(p.handle)}
              </HitRow>
            ))}
          </ul>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm text-mark" role="alert">
            {error}
          </p>
        ) : null}

        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-mute">
            Novos interesses
          </h2>
          {interests.length === 0 ? (
            <p className="mt-3 text-sm text-ink-soft">
              Ainda não há contas novas salvas. Busque um @ que ainda não está no feed.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {interests.map((handle) => {
                const open =
                  openFrom === "interest" &&
                  (result?.handle.toLowerCase() === handle.toLowerCase() ||
                    openingHandle === handle.toLowerCase());
                return (
                  <li key={handle}>
                    <div className="flex min-h-12 items-center gap-2 py-1.5">
                      <button
                        type="button"
                        aria-expanded={open}
                        className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
                        onClick={() => {
                          if (open) {
                            seq.current += 1;
                            setOpenFrom(null);
                            setResult(null);
                            setOpeningHandle(null);
                            setLoading(false);
                            setSummarizing(false);
                            return;
                          }
                          setOpenFrom("interest");
                          void openHandle(handle);
                        }}
                      >
                        <span className="truncate text-sm font-medium text-ink">@{handle}</span>
                        <ChevronDown
                          className={`size-3.5 shrink-0 text-mute transition-transform ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                      <Tip label={`Remover @${handle}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setInterests(removeInterest(handle));
                            if (result?.handle.toLowerCase() === handle.toLowerCase()) {
                              setResult(null);
                              setOpenFrom(null);
                              setOpeningHandle(null);
                            }
                          }}
                          className="grid size-8 shrink-0 place-items-center rounded-full text-mute hover:bg-paper-2 hover:text-ink"
                          aria-label={`Remover @${handle}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </Tip>
                    </div>
                    {open && result && result.handle.toLowerCase() === handle.toLowerCase() ? (
                      <ProfileCard
                        result={result}
                        summary={summary}
                        summarizing={summarizing}
                        known={Boolean(profileByHandle(result.handle))}
                        saved
                        inFontes={
                          Boolean(profileByHandle(result.handle)) || isExtraFonte(result.handle)
                        }
                        nested
                        onSave={() => setInterests(saveInterest(result.handle))}
                        onRemove={() => {
                          setInterests(removeInterest(result.handle));
                          setResult(null);
                          setOpenFrom(null);
                        }}
                        onAddFonte={() => addFromResult(result, summary)}
                        onRemoveFonte={() => removeExtraFonte(result.handle)}
                      />
                    ) : open && loading ? (
                      <p className="mb-3 text-sm text-mute">Abrindo perfil…</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </AppChrome>
  );
}

function HitRow({
  hit,
  active,
  onToggle,
  children,
}: {
  hit: XUserHit;
  active: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        aria-expanded={active}
        onClick={onToggle}
        className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
          active ? "bg-paper-2" : ""
        } ${hit.inFeed ? "opacity-60" : ""}`}
      >
        {hit.avatar ? (
          <img
            src={hit.avatar}
            alt=""
            className="size-9 shrink-0 rounded-full bg-paper-2 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-paper-2 text-xs font-medium text-mute">
            {hit.name.charAt(0)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-sm font-medium text-ink">{hit.name}</span>
            {hit.verified ? <BadgeCheck className="size-3.5 shrink-0 text-ink" /> : null}
          </span>
          <span className="mt-0.5 block truncate text-xs text-mute">@{hit.handle}</span>
        </span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-mute transition-transform ${
            active ? "rotate-180" : ""
          }`}
        />
      </button>
      {children}
    </li>
  );
}

function ProfileCard({
  result,
  summary,
  summarizing,
  known,
  saved,
  inFontes,
  nested,
  showFace = true,
  onSave,
  onRemove,
  onAddFonte,
  onRemoveFonte,
}: {
  result: Found;
  summary: string;
  summarizing: boolean;
  known: boolean;
  saved: boolean;
  inFontes: boolean;
  nested?: boolean;
  showFace?: boolean;
  onSave: () => void;
  onRemove: () => void;
  onAddFonte: () => void;
  onRemoveFonte: () => void;
}) {
  return (
    <article
      className={`border-t border-line bg-paper ${nested ? "rounded-none border-x-0" : "mt-5 overflow-hidden rounded-lg border border-line bg-card"}`}
    >
      <div className="flex gap-3 p-4">
        {showFace &&
          (result.avatar ? (
            <img
              src={result.avatar}
              alt=""
              className="size-14 shrink-0 rounded-full bg-paper-2 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-paper-2 text-lg font-medium text-mute">
              {result.name.charAt(0)}
            </span>
          ))}
        <div className="min-w-0 flex-1">
          {showFace ? (
            <>
              <p className="flex items-center gap-1 truncate text-base font-medium text-ink">
                {result.name}
                {result.verified ? <BadgeCheck className="size-4 shrink-0 text-ink" /> : null}
              </p>
              <p className="text-sm text-mute">@{result.handle}</p>
            </>
          ) : null}
          <p className={showFace ? "mt-1 text-xs text-mute" : "text-xs text-mute"}>
            {formatCount(result.followers)} seguidores
            {known ? " · já está no feed" : " · novo"}
          </p>
          <p className="mt-2 text-sm leading-snug text-ink-soft">
            {summary || (summarizing ? "Gerando resumo…" : "")}
          </p>
        </div>
      </div>
      {result.lastPost ? (
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
            Último post
            <time dateTime={result.lastPost.publishedAt} className="font-normal normal-case tracking-normal">
              {" "}
              · {relativeTime(result.lastPost.publishedAt)}
            </time>
          </p>
          <a
            href={result.lastPost.url}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 block text-sm leading-snug text-ink"
          >
            {result.lastPost.text.length > 220
              ? `${result.lastPost.text.slice(0, 217).trimEnd()}…`
              : result.lastPost.text}
          </a>
        </div>
      ) : null}
      <div className="flex items-center gap-1.5 border-t border-line px-3 py-2">
        {known ? (
          <span className="mr-auto text-xs text-mute">Já no feed</span>
        ) : inFontes ? (
          <IconBtn label="Remover das Fontes" onClick={onRemoveFonte}>
            <X className="size-4" />
          </IconBtn>
        ) : (
          <IconBtn label="Adicionar às Fontes" onClick={onAddFonte} className={iconBtnSolid}>
            <Plus className="size-4" />
          </IconBtn>
        )}
        {known ? null : saved ? (
          <IconBtn label="Remover interesse" onClick={onRemove}>
            <BookmarkCheck className="size-4" />
          </IconBtn>
        ) : (
          <IconBtn label="Salvar interesse" onClick={onSave}>
            <Bookmark className="size-4" />
          </IconBtn>
        )}
        <IconLink
          href={`https://x.com/${result.handle}`}
          target="_blank"
          rel="noreferrer"
          label="Abrir no X"
        >
          <XLogo className="size-3.5" />
        </IconLink>
      </div>
    </article>
  );
}
