export function groupSavedByCategory<T extends { category: string }>(
  items: T[],
  order: string[],
): { category: string; items: T[] }[];
