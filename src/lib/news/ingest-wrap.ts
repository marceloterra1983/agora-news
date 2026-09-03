import { acquireIngestLease } from "./ingest-lease";
import { ingestSurvives, runRssIngest } from "./rss-ingest";
import { runYouTubeIngest } from "./youtube-ingest";
import { elapsedMs, logTiming, nowMs } from "./timing";

type OwnedResult = Record<string, unknown> & { ok?: boolean };

export async function runIngestWithRss<T extends OwnedResult>(
  runOwned: (
    opts: { limitHandles?: number; withProfiles?: boolean } | undefined,
    t0: number,
    assertOwned: () => Promise<void>,
  ) => Promise<T>,
  opts?: { limitHandles?: number; withProfiles?: boolean; withRss?: boolean; withYouTube?: boolean; onlyYouTube?: boolean },
) {
  const t0 = nowMs();
  const lease = await acquireIngestLease();
  if (!lease) return { ok: true, skipped: true, reason: "locked" as const };
  try {
    if (opts?.onlyYouTube) {
      const youtube = await runYouTubeIngest({ assertOwned: lease.assertOwned });
      logTiming("ingest", elapsedMs(t0), { ok: true, youtube: youtube.written });
      return { ok: true, youtube };
    }
    const x = await runOwned(opts, t0, lease.assertOwned).catch(() => ({
      ok: false as const,
      xFailed: true as const,
    }));
    const rss = opts?.withRss
      ? await runRssIngest({ assertOwned: lease.assertOwned })
      : { written: 0, ok: true, feeds: 0 };
    const youtube = opts?.withYouTube ?? opts?.withRss
      ? await runYouTubeIngest({ assertOwned: lease.assertOwned })
      : { written: 0, ok: true, feeds: 0 };
    if ("xFailed" in x) {
      if (!ingestSurvives(true, rss.written, youtube.written)) {
        logTiming("ingest", elapsedMs(t0), { ok: false, error: true });
        throw new Error("ingest_failed");
      }
      logTiming("ingest", elapsedMs(t0), { ok: true, rss: rss.written, youtube: youtube.written });
      return { ok: true, xFailed: true, rss, youtube };
    }
    return { ...x, rss, youtube };
  } catch (err) {
    if (err instanceof Error && err.message === "ingest_failed") throw err;
    logTiming("ingest", elapsedMs(t0), { ok: false, error: true });
    throw new Error("ingest_failed");
  } finally {
    await lease.release();
  }
}
