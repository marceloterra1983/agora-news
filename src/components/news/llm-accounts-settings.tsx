import { SettingsSection } from "@/components/news/settings-ui";
import { Input } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  deleteLlmAccount,
  listLlmAccounts,
  selectLlmAccount,
  upsertLlmAccount,
} from "@/lib/news/llm-server";
import { DEFAULT_XAI_MODEL, llmWarningFor, type LlmPrefsPublic } from "@/lib/news/llm-accounts.mjs";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

function statusLabel(status: string | null) {
  if (status === "auth") return "chave recusada";
  if (status === "quota") return "limite esgotado";
  if (status === "error") return "falhou";
  if (status === "ok") return "ok";
  return "não testada";
}

function banner(prefs: LlmPrefsPublic | null) {
  if (!prefs) return "";
  const active = prefs.accounts.find((a) => a.id === prefs.activeAccountId);
  if (active && (active.status === "auth" || active.status === "quota" || active.status === "error")) {
    return llmWarningFor(active.status, { hasAccount: true, hasEnv: prefs.envFallback });
  }
  if (!active && prefs.envStatus && prefs.envStatus !== "ok") {
    return llmWarningFor(prefs.envStatus, { hasAccount: false, hasEnv: prefs.envFallback });
  }
  if (prefs.accounts.length === 0 && !prefs.envFallback) {
    return llmWarningFor("none", { hasAccount: false, hasEnv: false });
  }
  return "";
}

export function LlmAccountsSettings() {
  const { user, isPending } = useCurrentUserState();
  const [prefs, setPrefs] = useState<LlmPrefsPublic | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [model, setModel] = useState<string>(DEFAULT_XAI_MODEL);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setPrefs(await listLlmAccounts());
      setError("");
    } catch {
      setError("Não deu para carregar as contas de IA.");
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(task: () => Promise<LlmPrefsPublic>) {
    setBusy(true);
    try {
      setPrefs(await task());
      setError("");
    } catch {
      setError("Não deu para salvar a conta de IA. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  const notice = banner(prefs);

  return (
    <SettingsSection title="Contas de IA">
      <p className="mb-3 text-xs text-mute">
        Grok via xAI, para resumir contas fora do catálogo. A chave fica no servidor e não aparece de novo.
      </p>
      {isPending ? <p className="text-sm text-mute">Carregando conta…</p> : null}
      {!isPending && !user ? (
        <p className="text-sm text-ink-soft">
          <Link to="/login" search={{ cadastro: false }} className="font-semibold text-mark">
            Entre
          </Link>{" "}
          para cadastrar contas. Sem login, o resumo usa só a chave do servidor, se houver.
        </p>
      ) : null}
      {user ? (
        <>
          {notice ? (
            <p className="mb-3 text-sm text-mark" role="alert">
              {notice}
            </p>
          ) : null}
          {!notice && prefs?.envFallback && prefs.accounts.length === 0 ? (
            <p className="mb-3 text-xs text-mute">
              Enquanto não houver conta cadastrada, o app usa a chave do servidor.
            </p>
          ) : null}
          <ul className="mb-3 divide-y divide-line border-y border-line">
            {prefs?.accounts.map((account) => (
              <li key={account.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{account.label}</p>
                  <p className="mt-0.5 text-xs text-mute">
                    xAI · {account.model} · {account.keyHint} · {statusLabel(account.status)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy || prefs.activeAccountId === account.id}
                  className="text-xs font-semibold text-ink disabled:text-mute"
                  onClick={() => void run(() => selectLlmAccount({ data: { id: account.id } }))}
                >
                  {prefs.activeAccountId === account.id ? "Em uso" : "Usar esta"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="text-xs text-mark"
                  onClick={() => {
                    if (!window.confirm(`Remover ${account.label}?`)) return;
                    void run(() => deleteLlmAccount({ data: { id: account.id } }));
                  }}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const next = await upsertLlmAccount({ data: { label, key, model } });
                setLabel("");
                setKey("");
                setModel(DEFAULT_XAI_MODEL);
                return next;
              });
            }}
          >
            <Input
              required
              maxLength={48}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              aria-label="Nome da conta"
              placeholder="Nome da conta (ex.: xAI pessoal)"
            />
            <Input
              required
              type="password"
              autoComplete="off"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              aria-label="Chave da API xAI"
              placeholder="Chave da API xAI"
            />
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              aria-label="Modelo"
              placeholder={DEFAULT_XAI_MODEL}
            />
            <button
              type="submit"
              disabled={busy}
              className="h-10 rounded-md border border-ink bg-ink text-sm font-semibold text-paper disabled:opacity-40"
            >
              Cadastrar conta
            </button>
          </form>
        </>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-mark" role="alert">
          {error}
        </p>
      ) : null}
    </SettingsSection>
  );
}
