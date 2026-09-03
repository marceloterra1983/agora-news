export function validPushEndpoint(value: unknown): value is string;
export function cleanSub<T extends { endpoint: string; keys?: { p256dh?: string; auth?: string }; handles?: string[] }>(
  sub: T,
): { endpoint: string; keys: { p256dh: string; auth: string }; handles: string[] } | null;
