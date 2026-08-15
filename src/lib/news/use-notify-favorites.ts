import { useCallback, useEffect, useState } from "react";
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

  return {
    ready,
    supported,
    enabled,
    permission,
    enable: async () => {
      const next = await enableFavoriteNotify();
      refresh();
      return next;
    },
    disable: () => {
      disableFavoriteNotify();
      refresh();
    },
    toggle: async () => {
      const next = await toggleFavoriteNotify();
      refresh();
      return next;
    },
  };
}
