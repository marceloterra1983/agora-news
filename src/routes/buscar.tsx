import { AppChrome } from "@/components/news/app-chrome";
import { BuscarHitList } from "@/components/news/buscar-hit-list";
import { BuscarInterests } from "@/components/news/buscar-interests";
import { Input } from "@/components/ui/input";
import { loadExtraFontes, syncExtraFontes } from "@/lib/news/extra-fontes";
import { loadInterests, removeInterest } from "@/lib/news/profile-interests";
import { profilesFor } from "@/lib/news/profiles";
import { catalogFor, handleInCatalog } from "@/lib/news/section-catalog.mjs";
import { searchXUsers } from "@/lib/news/server";
import { DEFAULT_SECTION, normalizeSection, type Category } from "@/lib/news/types";
import { useOpenXProfile } from "@/lib/news/use-open-x-profile";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type BuscarSearch = { secao: Category };

export const Route = createFileRoute("/buscar")({
  validateSearch: (raw: Record<string, unknown>): BuscarSearch => ({
    secao: normalizeSection(typeof raw.secao === "string" ? raw.secao : DEFAULT_SECTION),
  }),
  component: BuscarPage,
});

function BuscarPage() {
  const { secao } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Awaited<ReturnType<typeof searchXUsers>>["users"]>([]);
  const [searching, setSearching] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [fontesTick, setFontesTick] = useState(0);
  const searchSeq = useRef(0);
  const profile = useOpenXProfile();
  void fontesTick;

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
        const catalog = catalogFor(secao, { profiles: profilesFor(secao), extras: loadExtraFontes() });
        setHits(
          res.users.map((u) => ({
            ...u,
            inFeed: handleInCatalog(u.handle, catalog),
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
  }, [query, secao]);

  function toggleSearch(handle: string) {
    if (profile.isActive("search", handle)) {
      profile.close();
      return;
    }
    profile.setOpenFrom("search");
    void profile.openHandle(handle);
  }

  function toggleInterest(handle: string) {
    if (profile.isActive("interest", handle)) {
      profile.close();
      return;
    }
    profile.setOpenFrom("interest");
    void profile.openHandle(handle);
  }

  const showList = query.replace(/^@+/, "").trim().length >= 2;

  return (
    <AppChrome category={secao}>
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:px-6">
        <h1 className="sr-only">Buscar</h1>

        <label className="relative block">
          <span className="sr-only">Buscar perfil novo</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              profile.resetOnQuery();
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
          <BuscarHitList
            secao={secao}
            hits={hits}
            searching={searching}
            result={profile.result}
            summary={profile.summary}
            summarizing={profile.summarizing}
            loading={profile.loading}
            openingHandle={profile.openingHandle}
            isRowActive={(handle) => profile.isActive("search", handle)}
            onToggle={toggleSearch}
            onInterests={setInterests}
          />
        ) : null}

        {profile.error ? (
          <p className="mt-4 text-sm text-mark" role="alert">
            {profile.error}
          </p>
        ) : null}

        <BuscarInterests
          secao={secao}
          interests={interests}
          result={profile.result}
          summary={profile.summary}
          summarizing={profile.summarizing}
          loading={profile.loading}
          isOpen={(handle) => profile.isActive("interest", handle)}
          onToggle={toggleInterest}
          onCloseCard={profile.dismissResult}
          onInterests={setInterests}
          onRemove={(handle) => {
            setInterests(removeInterest(handle));
            if (profile.result?.handle.toLowerCase() === handle.toLowerCase()) {
              profile.dismissResult();
            }
          }}
        />
      </main>
    </AppChrome>
  );
}
