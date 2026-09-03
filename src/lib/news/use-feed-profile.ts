import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fallbackFonteRow,
  feedHandle,
  resolveFeedProfileRow,
} from "@/lib/news/feed-profile.mjs";
import { emptyFonteRow, mergeExtraFontes, seedFontes } from "@/lib/news/fontes-sort";
import { profileByHandle } from "@/lib/news/profiles";
import { youtubeGroupOf } from "@/lib/news/youtube-catalog.mjs";
import { loadFontes } from "@/lib/news/server";
import type { Category, Story } from "@/lib/news/types";
import { useExtraFontes } from "@/lib/news/use-extra-fontes";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";

export function useFeedProfile(
  category: Category,
  stories: Story[],
  prefs: ReturnType<typeof useFontesPrefs>,
) {
  const [openHandle, setOpenHandle] = useState<string | null>(null);
  const extras = useExtraFontes();
  const seed = useMemo(() => seedFontes(category), [category]);
  const { data } = useQuery({
    queryKey: ["fontes", category],
    queryFn: () => loadFontes({ data: { category } }),
    staleTime: 45_000,
    enabled: Boolean(openHandle),
  });

  const row = useMemo(() => {
    if (!openHandle) return null;
    const base = data?.rows?.length ? data.rows : seed;
    const rows = mergeExtraFontes(base, extras, category).map((item) => ({
      ...item,
      group: prefs.groupOf(item.handle) ?? item.group ?? "novos",
    }));
    const story = stories.find((item) => feedHandle(item.source) === openHandle);
    const profile = profileByHandle(openHandle);
    const fallback = profile
      ? {
          ...emptyFonteRow(profile),
          avatar: story?.avatar ?? null,
          name: story?.sourceLabel || profile.name,
          group: prefs.groupOf(openHandle) ?? profile.group,
        }
      : fallbackFonteRow({
          handle: openHandle,
          name: story?.sourceLabel,
          avatar: story?.avatar,
          group: prefs.groupOf(openHandle) ?? (youtubeGroupOf(openHandle) || "novos"),
        });
    return resolveFeedProfileRow({
      handle: openHandle,
      rows,
      stories,
      fallback,
    });
  }, [openHandle, data, seed, extras, category, stories, prefs]);

  function openProfile(raw: string) {
    const key = feedHandle(raw);
    if (!key) return;
    setOpenHandle((current) => (current === key ? null : key));
  }

  return {
    openHandle,
    openProfile,
    closeProfile: () => setOpenHandle(null),
    row,
  };
}
