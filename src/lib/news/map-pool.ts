/** Pool de concorrência compartilhado (ingest + enrich). */
export async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  const n = Math.max(1, size);
  for (let i = 0; i < items.length; i += n) {
    out.push(...(await Promise.all(items.slice(i, i + n).map(fn))));
  }
  return out;
}
