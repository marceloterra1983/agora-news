import { LlmProviderSlot } from "@/components/news/llm-provider-slot";
import { llmFieldClass } from "@/components/news/llm-field-class";
import { SettingsSection } from "@/components/news/settings-ui";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listLlmAccounts, selectLlmAccount } from "@/lib/news/llm-server";
import { LLM_PROVIDERS, type LlmPrefsPublic, type LlmUpsertResult } from "@/lib/news/llm-accounts.mjs";
import { connectionLine, saveFeedback, settingsBanner, slotsFromPublic } from "@/lib/news/llm-slots.mjs";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

export function LlmAccountsSettings() {
  const { user, isPending } = useCurrentUserState();
  const [prefs, setPrefs] = useState<LlmPrefsPublic | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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

  async function persist(task: () => Promise<LlmPrefsPublic | LlmUpsertResult>) {
    setBusy(true);
    try {
      const next = await task();
      if ("saved" in next) {
        const feedback = saveFeedback(next);
        if (!feedback.ok) {
          setError(feedback.text);
          setNotice("");
          setPrefs(await listLlmAccounts());
          return;
        }
        setNotice(feedback.text);
        setError("");
      } else {
        setNotice("");
        setError("");
      }
      setPrefs(await listLlmAccounts());
    } catch {
      setError("Não deu para salvar a conta de IA. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  const banner = settingsBanner(prefs);
  const slots = slotsFromPublic(prefs);
  const loginHint = (
    <p className="text-sm text-ink-soft">
      <Link to="/login" search={{ cadastro: false }} className="font-semibold text-mark">
        Entre
      </Link>{" "}
      para conectar OpenAI, Claude ou Grok. Sem login, o resumo usa só a chave do servidor, se houver.
    </p>
  );

  return (
    <SettingsSection id="ia" title="IA">
      <p className="mb-3 text-xs text-mute">
        Um provedor por vez. Conecte, escolha o modelo e marque qual usar agora. Segredos ficam no
        servidor.
      </p>
      {isPending ? <p className="text-sm text-mute">Carregando conta…</p> : null}
      {!isPending && !user ? loginHint : null}
      {user && prefs ? (
        <>
          <label className="mb-1 block text-[11px] text-mute">Agora usando</label>
          {prefs.accounts.length > 0 ? (
            <select
              aria-label="Agora usando"
              value={prefs.activeAccountId || ""}
              disabled={busy}
              onChange={(event) => {
                void persist(() => selectLlmAccount({ data: { id: event.target.value } }));
              }}
              className={llmFieldClass}
            >
              {prefs.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {connectionLine(account)}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-ink-soft">
              Nenhuma conexão pronta.
              {prefs.envFallback ? " Enquanto isso, o app usa a chave Grok do servidor." : ""}
            </p>
          )}
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {LLM_PROVIDERS.map((provider) => {
              const slot = slots.find((row) => row.provider === provider);
              return (
                <LlmProviderSlot
                  key={provider}
                  provider={provider}
                  account={slot?.account || null}
                  busy={busy}
                  onBusy={setBusy}
                  onError={setError}
                  onPersist={persist}
                />
              );
            })}
          </ul>
        </>
      ) : null}
      {notice ? (
        <p className="mt-3 text-sm text-ink" role="status">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-mark" role="alert">
          {error}
        </p>
      ) : null}
      {banner ? (
        <p className="mt-3 text-sm text-mark" role="alert">
          {banner}
        </p>
      ) : null}
    </SettingsSection>
  );
}
