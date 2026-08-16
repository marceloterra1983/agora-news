import { cloudKvGet, cloudKvSet } from "./cloud-kv";
import { exportBuzzCache, importBuzzCache } from "./fonte-metrics";

const KEY = "fonte-buzz";
const TTL = 6 * 60 * 60;
let hydrated = false;

export async function persistBuzzCache(): Promise<void> {
  const map = exportBuzzCache();
  if (!Object.keys(map).length) return;
  await cloudKvSet(KEY, JSON.stringify(map), TTL);
  hydrated = true;
}

export async function hydrateBuzzCache(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const raw = await cloudKvGet(KEY);
  if (!raw) return;
  try {
    importBuzzCache(JSON.parse(raw) as Record<string, import("./fonte-metrics").PostBuzz>);
  } catch {
    /* ignore broken cache */
  }
}
