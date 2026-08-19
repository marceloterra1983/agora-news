import {
  IMPRESSION_MS,
  IMPRESSION_RATIO,
  impressionReady,
} from "./unread";

export function observeUnreadImpressions(
  root: ParentNode,
  markRead: (id: string) => void,
): () => void {
  if (
    typeof IntersectionObserver === "undefined" ||
    typeof document === "undefined"
  ) {
    return () => {};
  }

  const timers = new Map<string, number>();

  const clearTimer = (id: string) => {
    const handle = timers.get(id);
    if (handle == null) return;
    window.clearTimeout(handle);
    timers.delete(id);
  };

  const pauseAll = () => {
    for (const id of [...timers.keys()]) clearTimer(id);
  };

  const io = new IntersectionObserver(
    (entries) => {
      if (document.visibilityState !== "visible") {
        pauseAll();
        return;
      }
      for (const entry of entries) {
        const id = (entry.target as HTMLElement).dataset.storyId;
        if (!id) continue;
        if (entry.isIntersecting && entry.intersectionRatio >= IMPRESSION_RATIO) {
          if (timers.has(id)) continue;
          const ratio = entry.intersectionRatio;
          timers.set(
            id,
            window.setTimeout(() => {
              timers.delete(id);
              if (
                impressionReady({
                  ratio,
                  visible: document.visibilityState === "visible",
                  elapsedMs: IMPRESSION_MS,
                })
              ) {
                markRead(id);
              }
            }, IMPRESSION_MS),
          );
        } else {
          clearTimer(id);
        }
      }
    },
    { threshold: IMPRESSION_RATIO },
  );

  root
    .querySelectorAll<HTMLElement>("[data-unread='1'][data-story-id]")
    .forEach((el) => io.observe(el));

  const onHidden = () => {
    if (document.visibilityState !== "visible") pauseAll();
  };
  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("pagehide", pauseAll);

  return () => {
    pauseAll();
    io.disconnect();
    document.removeEventListener("visibilitychange", onHidden);
    window.removeEventListener("pagehide", pauseAll);
  };
}
