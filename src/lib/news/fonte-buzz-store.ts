import { cacheGetJson, cacheSetJson } from "./cache";
import {
  exportBuzzCache,
  importBuzzCache,
  type PostBuzz,
} from "./fonte-metrics";

const KEY = "agora:v2:fonte-buzz";
const TTL = 6 * 60 * 60;
let hydrated = false;

export async function persistBuzzCache(): Promise<void> {
  const map = exportBuzzCache();
  if (!Object.keys(map).length) return;
  await cacheSetJson(KEY, map, TTL);
  hydrated = true;
}

export async function hydrateBuzzCache(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  importBuzzCache(await cacheGetJson<Record<string, PostBuzz>>(KEY));
}
