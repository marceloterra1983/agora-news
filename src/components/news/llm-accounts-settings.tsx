import { SettingsSection } from "@/components/news/settings-ui";
import { Input } from "@/components/ui/input";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  deleteLlmAccount,
  listLlmAccounts,
  listLlmModels,
  selectLlmAccount,
  upsertLlmAccount,
} from "@/lib/news/llm-server";
import {
  defaultModelFor,
  LLM_PROVIDERS,
  llmWarningFor,
  modelOptionsFor,
  providerLabel,
  type LlmAccountPublic,
  type LlmModelOption,
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

function accountLine(account: LlmAccountPublic) {
  return `${account.label} · ${providerLabel(account.provider)} · ${account.model}`;
}

function activeWarning(prefs: LlmPrefsPublic | null) {
  if (!prefs) return "";
  const active = prefs.accounts.find((a) => a.id === prefs.activeAccountId);
  if (active && (active.status === "auth" || active.status === "quota" || active.status === "error")) {
    return llmWarningFor(active.status, { hasAccount: true, hasEnv: prefs.envFallback });
  }
  return "";
}

const fieldClass = cn(
  "flex min-h-11 w-full rounded-sm border border-line bg-card px-3 text-sm text-ink shadow-none outline-none",
  "focus-visible:border-ink/40 focus-visible:ring-2 focus-visible:ring-ink/15",
);

export function LlmAccountsSettings() {
  const { user, isPending } = useCurrentUserState();
  const [prefs, setPrefs] = useState<LlmPrefsPublic | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");
  const [provider, setProvider] = useState<LlmProvider>("openai");
  const [key, setKey] = useState("");
  const [model, setModel] = useState<string>(defaultModelFor("openai"));
  const [modelChoices, setModelChoices] = useState<LlmModelOption[]>(() =>
    modelOptionsFor("openai", defaultModelFor("openai")),
  );

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

  async function refreshModels(nextProvider: LlmProvider, nextKey: string, selected: string) {
    if (!nextKey.trim()) {
      setModelChoices(modelOptionsFor(nextProvider, selected));
      return;
    }
    try {
      const listed = await listLlmModels({
        data: { provider: nextProvider, key: nextKey, selectedId: selected },
      });
      setModelChoices(listed.models);
    } catch {
      setModelChoices(modelOptionsFor(nextProvider, selected));
    }
  }

  const notice = activeWarning(prefs);
  const loginHint = (
    <p className="text-sm text-ink-soft">
      <Link to="/login" search={{ cadastro: false }} className="font-semibold text-mark">
        Entre
      </Link>{" "}
      para cadastrar contas. Sem login, o resumo usa só a chave do servidor, se houver.
    </p>
  );

  return (
    <>
      <SettingsSection id="modelo-em-uso" title="Modelo em uso">
        <p className="mb-3 text-xs text-mute">
          Só esta escolha vale para o resumo agora. A chave se cadastra na seção abaixo.
        </p>
        {isPending ? <p className="text-sm text-mute">Carregando conta…</p> : null}
        {!isPending && !user ? loginHint : null}
        {user && prefs && prefs.accounts.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Nenhuma conta cadastrada.{" "}
            <a href="#contas-cadastradas" className="font-semibold text-mark">
              Cadastrar conta
            </a>
            {prefs.envFallback ? " Enquanto isso, o app usa a chave Grok do servidor." : ""}
          </p>
        ) : null}
        {user && prefs && prefs.accounts.length > 0 ? (
          <select
            aria-label="Conta de IA em uso"
            value={prefs.activeAccountId || ""}
            disabled={busy}
            onChange={(event) => {
              void run(() => selectLlmAccount({ data: { id: event.target.value } }));
            }}
            className={fieldClass}
          >
            {prefs.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {accountLine(account)}
              </option>
            ))}
          </select>
        ) : null}
        {notice ? (
          <p className="mt-3 text-sm text-mark" role="alert">
            {notice}
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection id="contas-cadastradas" title="Contas cadastradas">
        <p className="mb-3 text-xs text-mute">
          OpenAI, Claude ou Grok. A chave fica no servidor e não aparece de novo. Cadastre e
          valide; o modelo em uso se escolhe na seção de cima.
        </p>
        {user ? (
          <>
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
              autoComplete="off"
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
                      const reset = defaultModelFor(provider);
                      setModel(reset);
                      setModelChoices(modelOptionsFor(provider, reset));
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
                type="text"
                name="llm-account-label"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={48}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                aria-label="Nome da conta"
                placeholder="Pessoal"
              />
              <p className="text-[11px] text-mute">Ex.: Pessoal ou Trabalho. Não use e-mail.</p>
              <select
                required
                aria-label="Provedor"
                value={provider}
                onChange={(event) => {
                  const next = event.target.value as LlmProvider;
                  setProvider(next);
                  setModel(defaultModelFor(next));
                  setModelChoices(modelOptionsFor(next, defaultModelFor(next)));
                  if (key.trim()) void refreshModels(next, key, defaultModelFor(next));
                }}
                className={fieldClass}
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
                name="llm-api-key"
                autoComplete="new-password"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                onBlur={() => void refreshModels(provider, key, model)}
                aria-label="Chave da API"
                placeholder="Chave da API"
                className="min-h-11"
              />
              <select
                required
                aria-label="Modelo"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                className={fieldClass}
              >
                {modelChoices.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.label}
                  </option>
                ))}
              </select>
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
    </>
  );
}
