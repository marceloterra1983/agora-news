import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { peekLeavePage } from "@/lib/news/feed-scroll";
import { normalizeSection, type Category } from "@/lib/news/types";
import { IconBtn } from "./icon-btn";

export function HistoryBackButton({
  fallbackSecao,
  label,
}: {
  fallbackSecao: Category;
  label: string;
}) {
  const router = useRouter();
  return (
    <IconBtn
      label={label}
      onClick={() => {
        if (router.history.canGoBack()) {
          router.history.back();
          return;
        }
        const leave = peekLeavePage();
        if (leave?.path === "/fontes") {
          void router.navigate({
            to: "/fontes",
            search: { secao: normalizeSection(leave.secao || fallbackSecao) },
            resetScroll: false,
          });
          return;
        }
        void router.navigate({
          to: "/",
          search: { secao: fallbackSecao },
          resetScroll: false,
        });
      }}
    >
      <ArrowLeft className="size-4" />
    </IconBtn>
  );
}
