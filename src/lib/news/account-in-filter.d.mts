export function accountInFilter(accounts: unknown, extraHandles?: unknown): string;
export function accountsForQuery(
  catalog?: {
    handles?: string[];
    profiles?: Array<{ handle?: string }>;
    extras?: Array<{ handle?: string }>;
  } | null,
  requested?: unknown,
): string[];
