import { useEffect, useState } from "react";
import { loadExtraFontes, type ExtraFonte } from "./extra-fontes";
import { getGroupOverrides } from "./fontes-prefs";
import { loadCustomGroups, type CustomGroup } from "./groups";
import { profilesFor } from "./profiles";
import { rssExtrasFor } from "./rss-catalog.mjs";
import { loadRssFeeds } from "./rss-feeds";
import { catalogFor, type SectionCatalog } from "./section-catalog.mjs";
import { normalizeSection, type Category } from "./types";

/** Catálogo vivo do tema: seed + extras + grupos deste recorte. */
export function useSectionCatalog(section: Category): SectionCatalog {
  const [extras, setExtras] = useState<ExtraFonte[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomGroup[]>([]);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    const refresh = () => {
      setExtras(loadExtraFontes());
      setCustomGroups(loadCustomGroups(section));
      setOverrides(getGroupOverrides(section));
    };
    refresh();
    window.addEventListener("agora-extra-fontes", refresh);
    window.addEventListener("agora-custom-groups", refresh);
    window.addEventListener("agora-fontes-prefs", refresh);
    window.addEventListener("agora-rss-feeds", refresh);
    return () => {
      window.removeEventListener("agora-extra-fontes", refresh);
      window.removeEventListener("agora-custom-groups", refresh);
      window.removeEventListener("agora-fontes-prefs", refresh);
      window.removeEventListener("agora-rss-feeds", refresh);
    };
  }, [section]);

  return catalogFor(section, {
    profiles: profilesFor(section),
    extras: [
      ...extras,
      ...rssExtrasFor(section, loadRssFeeds()).map((row) => ({
        handle: row.handle,
        name: row.name,
        avatar: null,
        verified: false,
        followers: 0,
        summary: "",
        section: normalizeSection(row.section),
        group: row.group,
        lastPost: null,
      })),
    ],
    customGroups,
    overrides,
  });
}
