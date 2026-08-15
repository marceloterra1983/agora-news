import { useCallback, useEffect, useState } from "react";
import {
  getBaselineIds,
  getReadIds,
  hasBaseline,
  markRead as persistRead,
  seedBaseline as persistBaseline,
  subscribeUnread,
} from "./unread";

export function useUnread() {
  const [ready, setReady] = useState(false);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [baseline, setBaseline] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    setRead(getReadIds());
    setBaseline(getBaselineIds());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    return subscribeUnread(refresh);
  }, [refresh]);

  const isUnread = useCallback(
    (id: string) => {
      if (!ready || !id) return false;
      if (!baseline.size) return false;
      if (read.has(id)) return false;
      if (baseline.has(id)) return false;
      return true;
    },
    [ready, read, baseline],
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
