export const CUSTOM_KEY: string;
export const GROUP_MAP_KEY: string;

export type CustomGroup = { id: string; label: string };
export type SectionSlice = {
  groups: Record<string, string>;
  customGroups: CustomGroup[];
};

export function migrateLegacyCustom(raw: unknown): Record<string, CustomGroup[]>;
export function migrateLegacyGroups(raw: unknown): Record<string, Record<string, string>>;
export function readCustomGroups(section: string): CustomGroup[];
export function writeCustomGroups(section: string, list: CustomGroup[]): CustomGroup[];
export function readGroupOverrides(section: string): Record<string, string>;
export function writeGroupOverrides(section: string, map: Record<string, string>): void;
export function findCustomGroup(id: string): CustomGroup | undefined;
export function snapshotBySection(): Record<string, SectionSlice>;
export function applyBySection(
  bySection: Record<string, { groups?: Record<string, string>; customGroups?: CustomGroup[] } | undefined>,
): void;
