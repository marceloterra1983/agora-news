export function postsNeedingPt<T extends { content?: string; translation_pt?: string }>(
  rows: T[] | null | undefined,
): T[];
export function listRecentNewsPosts(limit?: number): Promise<Array<Record<string, string>>>;
export function retranslateMissingPt(opts?: {
  listRecent?: (limit?: number) => Promise<Array<Record<string, string>>>;
  translate?: (text: string, opts?: { onFail?: () => void }) => Promise<string>;
  upsert?: (
    rows: Array<Record<string, string>>,
    beforeChunk?: () => Promise<void>,
  ) => Promise<{ ok: boolean; count: number }>;
  assertOwned?: () => Promise<void>;
  onFail?: () => void;
  limit?: number;
}): Promise<number>;
