export function packMediaLabel(
  label: string,
  meta?: Record<string, unknown> | null,
): string;
export function unpackMediaLabel(raw: unknown): {
  label: string;
  meta: Record<string, unknown> | null;
};
