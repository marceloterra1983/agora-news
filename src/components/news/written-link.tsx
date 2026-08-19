import { ExternalLink } from "lucide-react";
import { displayBody } from "@/lib/news/format";
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
        const host = writtenLinkHost(href) || "site";
        return (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noreferrer"
            title={`Abrir em ${host}`}
            aria-label={`Abrir em ${host}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-mark"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            {host}
          </a>
        );
      })}
    </p>
  );
}

export function PostText({
  text,
  linkText,
  skipHref = "",
  className,
}: {
  text: string;
  linkText?: string;
  skipHref?: string | string[];
  className?: string;
}) {
  const body = displayBody(text);
  const source = linkText ?? text;
  if (!body && !publishedLinksFrom(source, skipHref).length) return null;
  return (
    <>
      {body ? <p className={className}>{body}</p> : null}
      <WrittenLinks text={source} skipHref={skipHref} />
    </>
  );
}
