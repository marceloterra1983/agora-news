import { useEffect, useMemo, useState } from "react";
import { loadExtraFontes, type ExtraFonte } from "./extra-fontes";
import { getGroupOverrides } from "./fontes-prefs";
import { loadCustomGroups } from "./groups";
import { profilesFor } from "./profiles";
import { catalogFor, type SectionCatalog } from "./section-catalog.mjs";
import type { Category } from "./types";

/** Catálogo vivo do tema: seed + extras + grupos deste recorte. */
export function useSectionCatalog(section: Category): SectionCatalog {
  const [extras, setExtras] = useState<ExtraFonte[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setExtras(loadExtraFontes());
      setTick((n) => n + 1);
    };
    refresh();
    window.addEventListener("agora-extra-fontes", refresh);
    window.addEventListener("agora-custom-groups", refresh);
    window.addEventListener("agora-fontes-prefs", refresh);
    return () => {
      window.removeEventListener("agora-extra-fontes", refresh);
      window.removeEventListener("agora-custom-groups", refresh);
      window.removeEventListener("agora-fontes-prefs", refresh);
    };
  }, [section]);

  return useMemo(
    () =>
      catalogFor(section, {
        profiles: profilesFor(section),
        extras,
        customGroups: loadCustomGroups(section),
        overrides: getGroupOverrides(section),
      }),
    [section, extras, tick],
  );
}
