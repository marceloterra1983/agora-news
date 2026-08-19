import { safeHttpHref } from "@/lib/news/last-post";
import { publishedLinksFrom, writtenLinkHost } from "@/lib/news/written-links.mjs";

export function WrittenLinks({
  text,
  skipHref = "",
}: {
  text: string;
  skipHref?: string | string[];
}) {
  const hrefs = publishedLinksFrom(text, skipHref)
    .map((href) => safeHttpHref(href, { allowPath: false }))
    .filter(Boolean);
  if (!hrefs.length) return null;
  return (
    <p className="mt-2 flex flex-wrap gap-x-3">
      {hrefs.map((href) => {
        const host = writtenLinkHost(href);
        return (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noreferrer"
            title={host}
            aria-label={host ? `Link publicado: ${host}` : "Link publicado"}
            className="text-sm font-semibold text-mark"
          >Link</a>
        );
      })}
    </p>
  );
}
