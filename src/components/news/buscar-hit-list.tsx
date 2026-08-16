import { HitRow } from "@/components/news/x-hit-row";
import { ProfileCard } from "@/components/news/x-profile-card";
import type { FoundProfile } from "@/lib/news/server";
import { addExtraFonteFromProfile, loadExtraFontes, removeExtraFonte } from "@/lib/news/extra-fontes";
import { hasInterest, removeInterest, saveInterest } from "@/lib/news/profile-interests";
import { profilesFor } from "@/lib/news/profiles";
import { catalogFor, handleInCatalog } from "@/lib/news/section-catalog.mjs";
import type { Category } from "@/lib/news/types";
import type { XUserHit } from "@/lib/news/server";

export function BuscarHitList({
  secao,
  hits,
  searching,
  result,
  summary,
  summarizing,
  loading,
  openingHandle,
  isRowActive,
  onToggle,
  onInterests,
}: {
  secao: Category;
  hits: XUserHit[];
  searching: boolean;
  result: FoundProfile | null;
  summary: string;
  summarizing: boolean;
  loading: boolean;
  openingHandle: string | null;
  isRowActive: (handle: string) => boolean;
  onToggle: (handle: string) => void;
  onInterests: (next: string[]) => void;
}) {
  const novos = hits.filter((h) => !h.inFeed);
  const jaNoFeed = hits.filter((h) => h.inFeed);
  const saved = result ? hasInterest(result.handle) : false;
  const catalog = catalogFor(secao, { profiles: profilesFor(secao), extras: loadExtraFontes() });
  const known = result ? handleInCatalog(result.handle, catalog) : false;
  const inFontes = known;

  function card(handle: string) {
    const key = handle.toLowerCase();
    const open = result?.handle.toLowerCase() === key;
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
          onSave={() => onInterests(saveInterest(result.handle))}
          onRemove={() => onInterests(removeInterest(result.handle))}
          onAddFonte={() => addExtraFonteFromProfile(result, summary, secao)}
          onRemoveFonte={() => removeExtraFonte(result.handle)}
        />
      );
    }
    if (loading && openingHandle === key) {
      return <p className="px-3 pb-3 text-sm text-mute">Abrindo perfil…</p>;
    }
    return null;
  }

  return (
    <ul className="mt-3 divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
      {novos.map((p) => (
        <HitRow key={p.handle} hit={p} active={isRowActive(p.handle)} onToggle={() => onToggle(p.handle)}>
          {card(p.handle)}
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
        <HitRow key={p.handle} hit={p} active={isRowActive(p.handle)} onToggle={() => onToggle(p.handle)}>
          {card(p.handle)}
        </HitRow>
      ))}
    </ul>
  );
}
