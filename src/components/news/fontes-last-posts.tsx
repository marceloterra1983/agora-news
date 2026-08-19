import { useState } from "react";
import { FontePostLink } from "@/components/news/fonte-post-link";
import { displayTitle, relativeTime } from "@/lib/news/format";
import { safeHttpHref } from "@/lib/news/last-post";
import {
  PROFILE_LAST_PAGE,
  nextProfileShown,
  visibleProfilePosts,
} from "@/lib/news/profile-last.mjs";

export type FontePost = {
  id: string;
  href: string;
  title: string;
  publishedAt: string;
};

export function FonteLastPosts({ posts }: { posts: FontePost[] }) {
  const [shown, setShown] = useState<number>(PROFILE_LAST_PAGE);
  const visible = visibleProfilePosts(posts, shown);
  const more = shown < posts.length;
  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-mute">
        {posts.length === 1 ? "Último post" : "Últimos posts"}
      </p>
      {visible.length ? (
        <ul className="mt-1 space-y-2">
          {visible.map((post) => {
            const href = safeHttpHref(post.href);
            const title = displayTitle(post.title);
            return (
              <li key={post.id}>
                {href ? (
                  <FontePostLink
                    href={href}
                    className="block text-sm font-medium leading-snug text-ink"
                  >
                    {title}
                  </FontePostLink>
                ) : (
                  <p className="text-sm font-medium leading-snug text-ink">{title}</p>
                )}
                <time
                  dateTime={post.publishedAt}
                  suppressHydrationWarning
                  className="mt-0.5 block text-[11px] tabular-nums text-mute"
                >
                  {relativeTime(post.publishedAt)}
                </time>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-mute">Nenhum post encontrado.</p>
      )}
      {more ? (
        <button
          type="button"
          data-testid="fonte-mais-posts"
          onClick={() => setShown((current) => nextProfileShown(current, posts.length))}
          className="mt-2 min-h-[44px] text-sm font-semibold text-mark"
        >
          Mais
        </button>
      ) : null}
    </div>
  );
}
