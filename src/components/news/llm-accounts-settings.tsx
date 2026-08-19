import { LlmAccountForm } from "@/components/news/llm-account-form";
import { llmFieldClass } from "@/components/news/llm-field-class";
import { SettingsSection } from "@/components/news/settings-ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { deleteLlmAccount, listLlmAccounts, selectLlmAccount } from "@/lib/news/llm-server";
import {
  llmWarningFor,
  providerLabel,
  type LlmAccountPublic,
  type LlmPrefsPublic,
} from "@/lib/news/llm-accounts.mjs";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

function statusLabel(status: string | null, authKind?: string) {
  if (status === "auth") return authKind === "oauth" ? "assinatura recusada" : "chave recusada";
  if (status === "quota") return "limite esgotado";
  if (status === "error") return "falhou";
  if (status === "ok") return "ok";
  return "não testada";
}

function authKindLabel(kind: string | undefined) {
  return kind === "oauth" ? "Assinatura" : "API";
}

function accountLine(account: LlmAccountPublic) {
  return `${account.label} · ${providerLabel(account.provider)} · ${account.model} · ${authKindLabel(account.authKind)}`;
}

function activeWarning(prefs: LlmPrefsPublic | null) {
  if (!prefs) return "";
  const active = prefs.accounts.find((a) => a.id === prefs.activeAccountId);
  if (active && (active.status === "auth" || active.status === "quota" || active.status === "error")) {
    return llmWarningFor(active.status, {
      hasAccount: true,
      hasEnv: prefs.envFallback,
      authKind: active.authKind,
    });
  }
  return "";
}

export function LlmAccountsSettings() {
  const { user, isPending } = useCurrentUserState();
  const [prefs, setPrefs] = useState<LlmPrefsPublic | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
          Só esta escolha vale para o resumo agora. A chave ou assinatura se cadastra abaixo.
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
            className={llmFieldClass}
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
          OpenAI, Claude ou Grok — API (chave) ou Assinatura oficial. Segredos ficam no servidor.
        </p>
        {user ? (
          <>
            <ul className="mb-3 divide-y divide-line border-y border-line">
              {prefs?.accounts.map((account) => (
                <li key={account.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">
                      {account.label}{" "}
                      <span className="text-[11px] font-semibold text-mute">
                        {authKindLabel(account.authKind)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-mute">
                      {providerLabel(account.provider)} · {account.model} · {account.keyHint} ·{" "}
                      {statusLabel(account.status, account.authKind)}
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
            <LlmAccountForm busy={busy} onBusy={setBusy} onPrefs={setPrefs} onError={setError} />
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
