import { useCallback, useEffect, useRef, useState } from "react";
import {
  getDisabled,
  getGroupOverrides,
  getNotifyHandles,
  getStarred,
  normHandle,
  setDisabled as persistDisabled,
  clearGroupOverride as persistClearGroup,
  setGroupOverride as persistGroup,
  setStarred as persistStarred,
  toggleDisabled as persistToggleDisabled,
  toggleStar as persistToggleStar,
} from "./fontes-prefs";
import { setFavoriteNotifyHandle } from "./notify-favorites";
import type { Category } from "./types";

export function useFontesPrefs(section?: Category) {
  const [starred, setStarredState] = useState<string[]>([]);
  const [disabled, setDisabledState] = useState<string[]>([]);
  const [notify, setNotifyState] = useState<string[]>([]);
  const [groups, setGroupsState] = useState<Record<string, string>>({});
  const [notifyBusy, setNotifyBusy] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState("");
  const notifyPending = useRef(false);

  const refresh = useCallback(() => {
    setStarredState(getStarred());
    setDisabledState(getDisabled());
    setNotifyState(getNotifyHandles());
    setGroupsState(getGroupOverrides(section));
  }, [section]);

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

  async function setNotify(h: string, on: boolean) {
    const key = normHandle(h);
    if (!key || notifyPending.current) return false;
    notifyPending.current = true;
    setNotifyBusy(key);
    setNotifyError("");
    try {
      const result = await setFavoriteNotifyHandle(key, on);
      if (result !== "granted") {
        setNotifyError("Não foi possível alterar o aviso. Tente novamente.");
        return false;
      }
      refresh();
      return true;
    } catch {
      setNotifyError("Não foi possível alterar o aviso. Tente novamente.");
      return false;
    } finally {
      notifyPending.current = false;
      setNotifyBusy(null);
    }
  }

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
      persistGroup(h, group, section);
      refresh();
    },
    clearGroup: (h: string) => {
      persistClearGroup(h, section);
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
    toggleNotify: (h: string) => setNotify(h, !notify.includes(normHandle(h))),
    setStarred: (h: string, on: boolean) => {
      persistStarred(h, on);
      refresh();
    },
    setDisabled: (h: string, on: boolean) => {
      persistDisabled(h, on);
      refresh();
    },
    setNotify,
    notifyBusy,
    notifyError,
    refresh,
  };
}

export { filterStoriesByPrefs, sortSourcesByStar, normHandle } from "./fontes-prefs";
