export type CatalogExtra = { handle: string; section?: string; group?: string };
export type CatalogCustomGroup = { id: string; label: string };
export type CatalogProfile = { handle: string; name: string; group: string; section: string };

export type SectionCatalog = {
  section: string;
  profiles: CatalogProfile[];
  extras: CatalogExtra[];
  handles: string[];
  groupIds: string[];
  groups: Array<{ id: string; label: string }>;
};

export function catalogFor(
  section: string,
  input?: {
    extras?: CatalogExtra[];
    customGroups?: CatalogCustomGroup[];
    overrides?: Record<string, string>;
    profiles?: CatalogProfile[];
  },
): SectionCatalog;

export function handleInCatalog(handle: string, catalog: SectionCatalog): boolean;
export function sectionOfHandle(
  handle: string,
  input?: {
    extras?: CatalogExtra[];
    profiles?: CatalogProfile[];
  },
): string;
export function filterStoriesForCatalog<T extends { source?: string; account?: string; sourceLabel?: string }>(
  stories: T[],
  catalog: Pick<SectionCatalog, "handles">,
): T[];
export function scopeCachedStories<T extends { source?: string; account?: string; sourceLabel?: string }>(
  stories: T[] | null | undefined,
  catalog: Pick<SectionCatalog, "handles">,
): T[];
export function chipGroupIds(catalog: SectionCatalog): string[];
