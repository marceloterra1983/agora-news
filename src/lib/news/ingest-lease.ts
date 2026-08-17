import { randomUUID } from "node:crypto";
import {
  CACHE_KEYS,
  cacheSetNx,
  releaseCacheLease,
  renewCacheLease,
} from "./cache";

const LEASE_SEC = 90;
const RENEW_MS = 30_000;

export async function acquireIngestLease() {
  const token = randomUUID();
  if (!(await cacheSetNx(CACHE_KEYS.lock, token, LEASE_SEC))) return null;

  let owned = true;
  let renewal: Promise<void> | null = null;
  const renew = async () => {
    if (!owned) return;
    if (!renewal) {
      renewal = renewCacheLease(CACHE_KEYS.lock, token, LEASE_SEC)
        .then((ok) => {
          if (!ok) owned = false;
        })
        .catch(() => {
          owned = false;
        })
        .finally(() => {
          renewal = null;
        });
    }
    await renewal;
  };
  const timer = setInterval(() => void renew(), RENEW_MS);

  return {
    async assertOwned() {
      await renew();
      if (!owned) throw new Error("ingest_lock_lost");
    },
    async release() {
      clearInterval(timer);
      const pending = renewal;
      if (pending) await pending;
      owned = false;
      await releaseCacheLease(CACHE_KEYS.lock, token);
    },
  };
}
