import { useEffect } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { pullCloudPrefs, pushCloudPrefs } from "@/lib/news/prefs-sync";

export function PrefsSync() {
  const { user, isPending } = useCurrentUserState();
  useEffect(() => {
    if (isPending || !user || user.isDevFallback) return;
    void pullCloudPrefs(user.id).then(() => pushCloudPrefs(user.id));
    const save = () => void pushCloudPrefs(user.id);
    window.addEventListener("agora-fontes-prefs", save);
    window.addEventListener("agora-settings", save);
    window.addEventListener("agora-extra-fontes", save);
    window.addEventListener("agora-theme", save);
    return () => {
      window.removeEventListener("agora-fontes-prefs", save);
      window.removeEventListener("agora-settings", save);
      window.removeEventListener("agora-extra-fontes", save);
      window.removeEventListener("agora-theme", save);
    };
  }, [user, isPending]);
  return null;
}
