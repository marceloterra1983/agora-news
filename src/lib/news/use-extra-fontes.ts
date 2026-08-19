import { useEffect, useState } from "react";
import { loadExtraFontes, syncExtraFontes } from "./extra-fontes";

export function useExtraFontes() {
  const [extras, setExtras] = useState(() => loadExtraFontes());
  useEffect(() => {
    const refresh = () => setExtras(loadExtraFontes());
    refresh();
    void syncExtraFontes();
    window.addEventListener("agora-extra-fontes", refresh);
    return () => window.removeEventListener("agora-extra-fontes", refresh);
  }, []);
  return extras;
}
