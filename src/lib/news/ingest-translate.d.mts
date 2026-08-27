export function postsNeedingPt<T extends { content?: string; translation_pt?: string }>(
  rows: T[] | null | undefined,
): T[];
export function mergeRetranslateRows<T extends { post_id?: string }>(
  empty: T[] | null | undefined,
  recent: T[] | null | undefined,
): T[];
export function listRecentNewsPosts(limit?: number): Promise<Array<Record<string, string>>>;
export function listPostsForRetranslate(): Promise<Array<Record<string, string>>>;
export function retranslateMissingPt(opts?: {
  listRecent?: () => Promise<Array<Record<string, string>>>;
  translate?: (text: string, opts?: { onFail?: () => void }) => Promise<string>;
  upsert?: (
    rows: Array<Record<string, string>>,
    beforeChunk?: () => Promise<void>,
  ) => Promise<{ ok: boolean; count: number }>;
  assertOwned?: () => Promise<void>;
  onFail?: () => void;
  limit?: number;
}): Promise<number>;
