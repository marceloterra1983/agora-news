import { useCallback, useEffect, useState } from "react";
import {
  getBaselineIds,
  getReadIds,
  getUnreadSince,
  hasBaseline,
  isUnreadNow,
  markRead as persistRead,
  seedBaseline as persistBaseline,
  subscribeUnread,
} from "./unread";

export function useUnread() {
  const [ready, setReady] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [baseline, setBaseline] = useState<Set<string>>(new Set());
  const [since, setSince] = useState<Map<string, number>>(new Map());

  const refresh = useCallback(() => {
    setRead(getReadIds());
    setBaseline(getBaselineIds());
    setSince(getUnreadSince());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    return subscribeUnread(refresh);
  }, [refresh]);

  const isUnread = useCallback(
    (id: string) => {
      if (!ready || !id) return false;
      return isUnreadNow({
        hasBaseline: baseline.size > 0,
        inRead: read.has(id),
        inBaseline: baseline.has(id),
        firstUnreadAt: since.get(id) ?? null,
        now: Date.now(),
      });
    },
    [ready, read, baseline, since],
  );

  const markRead = useCallback(
    (id: string) => {
      persistRead(id);
      refresh();
    },
    [refresh],
  );

  const seedBaseline = useCallback(
    (ids: string[]) => {
      if (hasBaseline()) return;
      persistBaseline(ids);
      refresh();
    },
    [refresh],
  );

  return { ready, isUnread, markRead, seedBaseline, hasBaseline: baseline.size > 0 };
}
