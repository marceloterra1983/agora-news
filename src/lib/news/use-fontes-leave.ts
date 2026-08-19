import { useEffect, useLayoutEffect } from "react";
import {
  consumeLeavePage,
  currentScrollY,
  markLeavePage,
  restoreScrollY,
} from "./feed-scroll";
import type { Category } from "./types";

export function useFontesLeave(
  secao: Category,
  openHandle: string | null,
  setOpenHandle: (handle: string | null) => void,
) {
  useLayoutEffect(() => {
    const leave = consumeLeavePage("/fontes", secao);
    if (!leave) return;
    if (leave.open) setOpenHandle(leave.open);
    restoreScrollY(leave.y);
    const later = window.setTimeout(() => restoreScrollY(leave.y), 200);
    return () => window.clearTimeout(later);
  }, [secao, setOpenHandle]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      const href = (event.target as Element | null)
        ?.closest("a")
        ?.getAttribute("href");
      if (href && /\/materia\//.test(href)) {
        markLeavePage({
          secao,
          y: currentScrollY(),
          path: "/fontes",
          open: openHandle || undefined,
        });
      }
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [secao, openHandle]);
}
