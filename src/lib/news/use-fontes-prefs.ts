import { useCallback, useEffect, useState } from "react";
import {
  getDisabled,
  getNotifyHandles,
  getStarred,
  normHandle,
  setDisabled as persistDisabled,
  setNotifyHandle as persistNotify,
  setStarred as persistStarred,
  toggleDisabled as persistToggleDisabled,
  toggleNotifyHandle as persistToggleNotify,
  toggleStar as persistToggleStar,
} from "./fontes-prefs";

export function useFontesPrefs() {
  const [starred, setStarredState] = useState<string[]>([]);
  const [disabled, setDisabledState] = useState<string[]>([]);
  const [notify, setNotifyState] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setStarredState(getStarred());
    setDisabledState(getDisabled());
    setNotifyState(getNotifyHandles());
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
    isStarred: (h: string) => starred.includes(normHandle(h)),
    isDisabled: (h: string) => disabled.includes(normHandle(h)),
    isNotify: (h: string) => notify.includes(normHandle(h)),
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
    },
    refresh,
  };
}

export { filterStoriesByPrefs, sortSourcesByStar, normHandle } from "./fontes-prefs";
