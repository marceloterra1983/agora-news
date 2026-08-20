import { useEffect } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { isFontesPrefsDirty } from "@/lib/news/fontes-prefs";
import { pullCloudPrefs, pushCloudPrefs } from "@/lib/news/prefs-sync";

export function PrefsSync() {
  const { user, isPending } = useCurrentUserState();
  const userId = user && !user.isDevFallback ? user.id : null;
  useEffect(() => {
    if (isPending || !userId) return;
    void pullCloudPrefs(userId)
      .then((hadRemote) => {
        if (!hadRemote || isFontesPrefsDirty()) pushCloudPrefs(userId);
      })
      .catch(() => undefined);
    const save = (event?: Event) => {
      const fromRemote =
        event instanceof CustomEvent &&
        event.detail &&
        typeof event.detail === "object" &&
        (event.detail as { fromRemote?: boolean }).fromRemote;
      if (fromRemote) return;
      void pushCloudPrefs(userId);
    };
    window.addEventListener("agora-fontes-prefs", save);
    window.addEventListener("agora-settings", save);
    window.addEventListener("agora-extra-fontes", save);
    window.addEventListener("agora-custom-groups", save);
    window.addEventListener("agora-theme", save);
    return () => {
      window.removeEventListener("agora-fontes-prefs", save);
      window.removeEventListener("agora-settings", save);
      window.removeEventListener("agora-extra-fontes", save);
      window.removeEventListener("agora-custom-groups", save);
      window.removeEventListener("agora-theme", save);
    };
  }, [userId, isPending]);
  return null;
}
