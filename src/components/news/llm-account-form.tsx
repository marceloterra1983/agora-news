import { Input } from "@/components/ui/input";
import { completeLlmOauth, listLlmModels, startLlmOauth, upsertLlmAccount } from "@/lib/news/llm-server";
import {
  defaultModelFor,
  LLM_PROVIDERS,
  modelOptionsFor,
  providerLabel,
  type LlmModelOption,
  type LlmPrefsPublic,
  type LlmProvider,
  type LlmUpsertResult,
} from "@/lib/news/llm-accounts.mjs";
import { subscriptionAuthFor } from "@/lib/news/llm-oauth-policy.mjs";
import { llmFieldClass } from "@/components/news/llm-field-class";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Kind = "api" | "oauth";

export function LlmAccountForm({
  busy,
  onBusy,
  onPrefs,
  onError,
}: {
  busy: boolean;
  onBusy: (value: boolean) => void;
  onPrefs: (prefs: LlmPrefsPublic | LlmUpsertResult) => void;
  onError: (message: string) => void;
}) {
  const [kind, setKind] = useState<Kind>("api");
  const [label, setLabel] = useState("");
  const [provider, setProvider] = useState<LlmProvider>("openai");
  const [key, setKey] = useState("");
  const [oauthCode, setOauthCode] = useState("");
  const [model, setModel] = useState<string>(defaultModelFor("openai"));
  const [modelChoices, setModelChoices] = useState<LlmModelOption[]>(() =>
    modelOptionsFor("openai", defaultModelFor("openai")),
  );
  const cap = subscriptionAuthFor(provider);

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

  function changeProvider(next: LlmProvider) {
    setProvider(next);
    setModel(defaultModelFor(next));
    setModelChoices(modelOptionsFor(next, defaultModelFor(next)));
    if (key.trim()) void refreshModels(next, key, defaultModelFor(next));
  }

  function resetAfterSave() {
    setLabel("");
    setKey("");
    setOauthCode("");
    const reset = defaultModelFor(provider);
    setModel(reset);
    setModelChoices(modelOptionsFor(provider, reset));
  }

  return (
    <form
      autoComplete="off"
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onBusy(true);
        void (async () => {
          try {
            if (kind === "oauth") {
              const next = await completeLlmOauth({ data: { code: oauthCode } });
              onPrefs(next);
              if (next.saved) resetAfterSave();
              onError(next.validateWarning || "");
              return;
            }
            const next = await upsertLlmAccount({ data: { label, key, model, provider } });
            onPrefs(next);
            if (next.saved) resetAfterSave();
            onError(next.validateWarning || "");
          } catch {
            onError(
              kind === "oauth"
                ? "Não deu para concluir a autorização. Tente de novo."
                : "Não deu para validar a conta de IA. Tente de novo.",
            );
          } finally {
            onBusy(false);
          }
        })();
      }}
    >
      <div className="flex gap-2" role="tablist" aria-label="Tipo de conta">
        {(["api", "oauth"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={kind === id}
            className={cn(
              "h-9 flex-1 rounded-md border text-sm font-semibold",
              kind === id ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink",
            )}
            onClick={() => setKind(id)}
          >
            {id === "api" ? "API" : "Assinatura"}
          </button>
        ))}
      </div>
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
        onChange={(event) => changeProvider(event.target.value as LlmProvider)}
        className={llmFieldClass}
      >
        {LLM_PROVIDERS.map((id) => (
          <option key={id} value={id}>
            {providerLabel(id)}
          </option>
        ))}
      </select>
      <select
        required
        aria-label="Modelo"
        value={model}
        onChange={(event) => setModel(event.target.value)}
        className={llmFieldClass}
      >
        {modelChoices.map((row) => (
          <option key={row.id} value={row.id}>
            {row.label}
          </option>
        ))}
      </select>
      {kind === "api" ? (
        <>
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
          <button
            type="submit"
            disabled={busy}
            className="h-10 rounded-md border border-ink bg-ink text-sm font-semibold text-paper disabled:opacity-40"
          >
            {busy ? "Validando…" : "Cadastrar e validar"}
          </button>
        </>
      ) : cap.available ? (
        <>
          <p className="text-xs text-mute">{cap.hint}</p>
          <button
            type="button"
            disabled={busy || !label.trim()}
            className="h-10 rounded-md border border-ink bg-ink text-sm font-semibold text-paper disabled:opacity-40"
            onClick={() => {
              onBusy(true);
              void (async () => {
                try {
                  const started = await startLlmOauth({ data: { provider, label, model } });
                  if (!started.available || !started.authorizeUrl) {
                    onError(started.reason || "Este provedor não tem assinatura oficial.");
                    return;
                  }
                  window.open(started.authorizeUrl, "_blank", "noopener,noreferrer");
                  onError("");
                } catch {
                  onError("Não deu para abrir a autorização oficial.");
                } finally {
                  onBusy(false);
                }
              })();
            }}
          >
            Conectar
          </button>
          <Input
            type="text"
            name="llm-oauth-code"
            autoComplete="off"
            value={oauthCode}
            onChange={(event) => setOauthCode(event.target.value)}
            aria-label="Código ou URL da autorização"
            placeholder="Cole o código ou a URL"
            className="min-h-11"
          />
          <button
            type="submit"
            disabled={busy || !oauthCode.trim()}
            className="h-10 rounded-md border border-line bg-card text-sm font-semibold text-ink disabled:opacity-40"
          >
            Já autorizei
          </button>
        </>
      ) : (
        <p className="text-sm text-ink-soft">{cap.reason}</p>
      )}
    </form>
  );
}
