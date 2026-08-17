export function categoryForCsvRow(
  source: string,
  rawCategory: string,
  input?: {
    extras?: Array<{ handle: string; section?: string }>;
    profiles?: Array<{ handle: string; section?: string }>;
  },
): string;
