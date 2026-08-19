import { SettingsSection } from "@/components/news/settings-ui";
import { Input } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  deleteLlmAccount,
  listLlmAccounts,
  selectLlmAccount,
  upsertLlmAccount,
} from "@/lib/news/llm-server";
import {
  defaultModelFor,
  LLM_PROVIDERS,
  llmWarningFor,
  providerLabel,
  type LlmPrefsPublic,
  type LlmProvider,
} from "@/lib/news/llm-accounts.mjs";
import { cn } from "@/lib/utils";
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
  const [provider, setProvider] = useState<LlmProvider>("openai");
  const [key, setKey] = useState("");
  const [model, setModel] = useState<string>(defaultModelFor("openai"));

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
        OpenAI, Claude ou Grok para resumir contas fora do catálogo. A chave fica no servidor e não
        aparece de novo. Cadastre e valide antes de usar.
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
              Enquanto não houver conta cadastrada, o app usa a chave Grok do servidor.
            </p>
          ) : null}
          <ul className="mb-3 divide-y divide-line border-y border-line">
            {prefs?.accounts.map((account) => (
              <li key={account.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{account.label}</p>
                  <p className="mt-0.5 text-xs text-mute">
                    {providerLabel(account.provider)} · {account.model} · {account.keyHint} ·{" "}
                    {statusLabel(account.status)}
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
              setBusy(true);
              void (async () => {
                try {
                  const next = await upsertLlmAccount({
                    data: { label, key, model, provider },
                  });
                  setPrefs(next);
                  if (next.saved) {
                    setLabel("");
                    setKey("");
                    setModel(defaultModelFor(provider));
                  }
                  setError(next.validateWarning || "");
                } catch {
                  setError("Não deu para validar a conta de IA. Tente de novo.");
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            <Input
              required
              maxLength={48}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              aria-label="Nome da conta"
              placeholder="Nome da conta (ex.: OpenAI pessoal)"
            />
            <select
              required
              aria-label="Provedor"
              value={provider}
              onChange={(event) => {
                const next = event.target.value as LlmProvider;
                setProvider(next);
                setModel(defaultModelFor(next));
              }}
              className={cn(
                "flex h-10 w-full rounded-sm border border-line bg-card px-3 text-sm text-ink shadow-none outline-none",
                "focus-visible:border-ink/40 focus-visible:ring-2 focus-visible:ring-ink/15",
              )}
            >
              {LLM_PROVIDERS.map((id) => (
                <option key={id} value={id}>
                  {providerLabel(id)}
                </option>
              ))}
            </select>
            <Input
              required
              type="password"
              autoComplete="off"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              aria-label="Chave da API"
              placeholder="Chave da API"
            />
            <Input
              value={model}
              onChange={(event) => setModel(event.target.value)}
              aria-label="Modelo"
              placeholder={defaultModelFor(provider)}
            />
            <button
              type="submit"
              disabled={busy}
              className="h-10 rounded-md border border-ink bg-ink text-sm font-semibold text-paper disabled:opacity-40"
            >
              {busy ? "Validando…" : "Cadastrar e validar"}
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
