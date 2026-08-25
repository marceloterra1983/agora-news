import { useEffect, useState } from "react";
import { loadExtraFontes, syncExtraFontes, type ExtraFonte } from "./extra-fontes";

export function useExtraFontes() {
  // Vazio no primeiro render para casar com o SSR; o effect carrega do localStorage.
  const [extras, setExtras] = useState<ExtraFonte[]>([]);
  useEffect(() => {
    const refresh = () => setExtras(loadExtraFontes());
    refresh();
    void syncExtraFontes();
    window.addEventListener("agora-extra-fontes", refresh);
    return () => window.removeEventListener("agora-extra-fontes", refresh);
  }, []);
  return extras;
}
