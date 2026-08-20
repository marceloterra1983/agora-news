import { tapIcon, Tip } from "@/components/news/icon-btn";
import { ProfileCard } from "@/components/news/x-profile-card";
import type { FoundProfile } from "@/lib/news/server";
import { addExtraFonteFromProfile, loadExtraFontes, removeExtraFonte } from "@/lib/news/extra-fontes";
import { removeInterest, saveInterest } from "@/lib/news/profile-interests";
import { profilesFor } from "@/lib/news/profiles";
import { catalogFor, handleInCatalog } from "@/lib/news/section-catalog.mjs";
import type { Category } from "@/lib/news/types";
import { ChevronDown, X } from "lucide-react";

export function BuscarInterests({
  secao,
  interests,
  result,
  summary,
  summarizing,
  loading,
  isOpen,
  onToggle,
  onRemove,
  onCloseCard,
  onInterests,
}: {
  secao: Category;
  interests: string[];
  result: FoundProfile | null;
  summary: string;
  summarizing: boolean;
  loading: boolean;
  isOpen: (handle: string) => boolean;
  onToggle: (handle: string) => void;
  onRemove: (handle: string) => void;
  onCloseCard: () => void;
  onInterests: (next: string[]) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-mute">Novos interesses</h2>
      {interests.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          Ainda não há contas novas salvas. Busque um @ que ainda não está no feed.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {interests.map((handle) => {
            const open = isOpen(handle);
            return (
              <li key={handle}>
                <div className="flex min-h-12 items-center gap-2 py-1.5">
                  <button
                    type="button"
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
                    onClick={() => onToggle(handle)}
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
                      onClick={() => onRemove(handle)}
                      className={`${tapIcon} text-mute hover:bg-paper-2 hover:text-ink`}
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
                    known={handleInCatalog(result.handle, catalogFor(secao, { profiles: profilesFor(secao), extras: loadExtraFontes() }))}
                    saved
                    inFontes={handleInCatalog(result.handle, catalogFor(secao, { profiles: profilesFor(secao), extras: loadExtraFontes() }))}
                    nested
                    onSave={() => onInterests(saveInterest(result.handle))}
                    onRemove={() => {
                      onInterests(removeInterest(result.handle));
                      onCloseCard();
                    }}
                    onAddFonte={() => addExtraFonteFromProfile(result, summary, secao)}
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
  );
}
