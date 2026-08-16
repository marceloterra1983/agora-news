export type SectionTaxonomy = {
  order: string[];
  labels: Record<string, string>;
  hints: Record<string, string>;
};

export const SECTION_TAXONOMY: Record<string, SectionTaxonomy>;

export function normalizeSection(value?: string | null): string;
export function taxonomyFor(section?: string | null): SectionTaxonomy;
export function groupOrderFor(section?: string | null): string[];
export function labelOfGroup(id?: string | null, section?: string | null): string;
export function hintOfGroup(id?: string | null, section?: string | null): string;
export function reservedGroupIds(): Set<string>;
export function isReservedGroup(id: string): boolean;
