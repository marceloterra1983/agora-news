import { useEffect, useState } from "react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadRssFeeds, onRssFeeds, replaceRssFeeds, type RssFeed } from "@/lib/news/rss-feeds";
import { addOwnedRssFeed, removeOwnedRssFeed } from "@/lib/news/rss-owned.mjs";
import { resolveRssFeed } from "@/lib/news/rss-resolve";
import { pushCloudPrefs } from "@/lib/news/prefs-sync";
import { useSettings } from "@/lib/news/use-settings";
import type { Category } from "@/lib/news/types";

export function FontesSites({ section }: { section: Category }) {
  const { settings } = useSettings();
  const { user, isPending } = useCurrentUserState();
  const [owned, setOwned] = useState<RssFeed[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const refresh = () => setOwned(loadRssFeeds().filter((row) => row.section === section));
    refresh();
    return onRssFeeds(refresh);
  }, [section]);

  const canEdit = Boolean(user) && !isPending;

  async function add() {
    if (!canEdit || busy) return;
    setBusy(true);
    setError("");
    try {
      const feed = await resolveRssFeed({ data: { url, section } });
      replaceRssFeeds(addOwnedRssFeed(loadRssFeeds(), feed));
      pushCloudPrefs();
      setUrl("");
    } catch (err) {
      const code = err instanceof Error ? err.message : "rss_failed";
      setError(
        code === "rss_https_only"
          ? "Use um endereço https."
          : code === "rss_duplicate"
            ? "Esse feed já está na lista."
            : code === "rss_empty"
              ? "Esse endereço não devolveu itens."
              : "Não foi possível adicionar o feed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function remove(account: string) {
    if (!canEdit) return;
    try {
      replaceRssFeeds(removeOwnedRssFeed(loadRssFeeds(), account));
      pushCloudPrefs();
    } catch {
      setError("Só dá para remover sites que você adicionou.");
    }
  }

  if (!settings.showRss) return null;

  return (
    <section className="mt-8 border-t border-line pt-6" data-testid="fontes-sites">
      <h2 className="text-sm font-medium text-ink">Adicionar site</h2>
      <p className="mt-1 text-[12px] text-mute">
        Os sites editoriais estão na lista acima, misturados às contas. Aqui você inclui os seus.
      </p>
      {owned.length ? (
        <ul className="mt-3 divide-y divide-line">
          {owned.map((row) => (
            <li key={row.account} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{row.title}</span>
                <span className="block truncate text-[11px] text-mute">{row.url}</span>
              </span>
              {canEdit ? (
                <button type="button" onClick={() => remove(row.account)} className="text-[12px] text-mark">
                  Remover
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {canEdit ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">URL do feed RSS</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
              inputMode="url"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-10 w-full rounded-md border border-line bg-paper px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="h-10 shrink-0 rounded-md border border-line px-3 text-sm text-ink disabled:opacity-40"
          >
            Adicionar
          </button>
        </form>
      ) : (
        <p className="mt-3 text-[12px] text-mute">Entre para adicionar um site.</p>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-mark">
          {error}
        </p>
      ) : null}
    </section>
  );
}
