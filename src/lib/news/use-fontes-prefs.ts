import { useCallback, useEffect, useState } from "react";
import {
  getDisabled,
  getGroupOverrides,
  getNotifyHandles,
  getStarred,
  normHandle,
  setDisabled as persistDisabled,
  setGroupOverride as persistGroup,
  setNotifyHandle as persistNotify,
  setStarred as persistStarred,
  toggleDisabled as persistToggleDisabled,
  toggleNotifyHandle as persistToggleNotify,
  toggleStar as persistToggleStar,
} from "./fontes-prefs";
import { isNotifyEnabled, subscribeWebPush } from "./notify-favorites";

export function useFontesPrefs() {
  const [starred, setStarredState] = useState<string[]>([]);
  const [disabled, setDisabledState] = useState<string[]>([]);
  const [notify, setNotifyState] = useState<string[]>([]);
  const [groups, setGroupsState] = useState<Record<string, string>>({});

  const refresh = useCallback(() => {
    setStarredState(getStarred());
    setDisabledState(getDisabled());
    setNotifyState(getNotifyHandles());
    setGroupsState(getGroupOverrides());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("agora-fontes-")) refresh();
    };
    const onCustom = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("agora-fontes-prefs", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("agora-fontes-prefs", onCustom as EventListener);
    };
  }, [refresh]);

  return {
    starred,
    disabled,
    notify,
    groups,
    isStarred: (h: string) => starred.includes(normHandle(h)),
    isDisabled: (h: string) => disabled.includes(normHandle(h)),
    isNotify: (h: string) => notify.includes(normHandle(h)),
    groupOf: (h: string) => groups[normHandle(h)] ?? null,
    setGroup: (h: string, group: string) => {
      persistGroup(h, group);
      refresh();
    },
    toggleStar: (h: string) => {
      const next = persistToggleStar(h);
      refresh();
      return next;
    },
    toggleDisabled: (h: string) => {
      const next = persistToggleDisabled(h);
      refresh();
      return next;
    },
    toggleNotify: (h: string) => {
      const next = persistToggleNotify(h);
      refresh();
      if (isNotifyEnabled()) void subscribeWebPush();
      return next;
    },
    setStarred: (h: string, on: boolean) => {
      persistStarred(h, on);
      refresh();
    },
    setDisabled: (h: string, on: boolean) => {
      persistDisabled(h, on);
      refresh();
    },
    setNotify: (h: string, on: boolean) => {
      persistNotify(h, on);
      refresh();
      if (isNotifyEnabled()) void subscribeWebPush();
    },
    refresh,
  };
}

export { filterStoriesByPrefs, sortSourcesByStar, normHandle } from "./fontes-prefs";
