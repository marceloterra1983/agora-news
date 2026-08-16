import { useEffect } from "react";
import { installHideHostChrome } from "@/lib/news/hide-host-chrome";

/** Monta o removedor da faixa Created with Grok / Remix. */
export function HideHostChrome() {
  useEffect(() => installHideHostChrome(), []);
  return null;
}
