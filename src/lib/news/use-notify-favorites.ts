import { useCallback, useEffect, useRef, useState } from "react";
import {
  disableFavoriteNotify,
  enableFavoriteNotify,
  isNotifyEnabled,
  notifyPermission,
  notifySupported,
  subscribeNotify,
  toggleFavoriteNotify,
} from "./notify-favorites";

export function useNotifyFavorites() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [supported, setSupported] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);

  const refresh = useCallback(() => {
    setSupported(notifySupported());
    setEnabled(isNotifyEnabled());
    setPermission(notifyPermission());
  }, []);

  useEffect(() => {
    refresh();
    setReady(true);
    return subscribeNotify(refresh);
  }, [refresh]);

  async function run(action: () => ReturnType<typeof toggleFavoriteNotify>) {
    if (pending.current) return "error" as const;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await action();
      if (next === "error") setError("Não foi possível alterar os avisos. Tente novamente.");
      refresh();
      return next;
    } catch {
      setError("Não foi possível alterar os avisos. Tente novamente.");
      return "error" as const;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return {
    ready,
    supported,
    enabled,
    permission,
    busy,
    error,
    enable: () => run(enableFavoriteNotify),
    disable: () => run(disableFavoriteNotify),
    toggle: () => run(toggleFavoriteNotify),
  };
}
