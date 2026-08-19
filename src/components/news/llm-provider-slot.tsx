import { Input } from "@/components/ui/input";
import { llmFieldClass } from "@/components/news/llm-field-class";
import { completeLlmOauth, deleteLlmAccount, startLlmOauth, upsertLlmAccount } from "@/lib/news/llm-server";
import {
  defaultModelFor,
  modelOptionsFor,
  providerLabel,
  type LlmAccountPublic,
  type LlmPrefsPublic,
  type LlmProvider,
  type LlmUpsertResult,
} from "@/lib/news/llm-accounts.mjs";
import { defaultAccountLabel } from "@/lib/news/llm-slots.mjs";
import { subscriptionAuthFor } from "@/lib/news/llm-oauth-policy.mjs";
import { useState } from "react";

type Mode = "idle" | "api" | "oauth";

function statusLabel(status: string | null, authKind?: string) {
  if (status === "auth") return authKind === "oauth" ? "assinatura recusada" : "chave recusada";
  if (status === "quota") return "cota no limite";
  if (status === "error") return "falhou";
  if (status === "ok") return "ok";
  return "não testada";
}

export function LlmProviderSlot({
  provider,
  account,
  busy,
  onBusy,
  onError,
  onPersist,
}: {
  provider: LlmProvider;
  account: LlmAccountPublic | null;
  busy: boolean;
  onBusy: (value: boolean) => void;
  onError: (message: string) => void;
  onPersist: (task: () => Promise<LlmPrefsPublic | LlmUpsertResult>) => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [oauthCode, setOauthCode] = useState("");
  const [model, setModel] = useState(account?.model || defaultModelFor(provider));
  const cap = subscriptionAuthFor(provider);
  const models = modelOptionsFor(provider, account?.model || model);

  function reset() {
    setMode("idle");
    setLabel("");
    setKey("");
    setOauthCode("");
    setModel(account?.model || defaultModelFor(provider));
  }

  return (
    <li className="border-b border-line py-3 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{providerLabel(provider)}</p>
        {account ? (
          <p className="text-xs text-mute">
            {account.keyHint} · {account.authKind === "oauth" ? "Assinatura" : "API"} ·{" "}
            {statusLabel(account.status, account.authKind)}
          </p>
        ) : null}
      </div>

      {account && mode === "idle" ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            aria-label="Modelo"
            value={account.model}
            disabled={busy}
            onChange={(event) => {
              void onPersist(() =>
                upsertLlmAccount({
                  data: { id: account.id, provider, model: event.target.value, label: account.label },
                }),
              );
            }}
            className={llmFieldClass}
          >
            {models.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            className="h-11 px-3 text-xs font-semibold text-mark"
            onClick={() => {
              if (!window.confirm(`Desconectar ${providerLabel(provider)}?`)) return;
              void onPersist(() => deleteLlmAccount({ data: { id: account.id } }));
            }}
          >
            Desconectar
          </button>
        </div>
      ) : null}

      {!account && mode === "idle" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            className="h-11 rounded-md border border-ink bg-ink px-3 text-sm font-semibold text-paper disabled:opacity-40"
            onClick={() => setMode("api")}
          >
            Conectar com API
          </button>
          {cap.available ? (
            <button
              type="button"
              disabled={busy}
              className="h-11 rounded-md border border-line bg-card px-3 text-sm font-semibold text-ink disabled:opacity-40"
              onClick={() => setMode("oauth")}
            >
              Conectar assinatura
            </button>
          ) : (
            <p className="self-center text-[11px] text-mute">{cap.reason}</p>
          )}
        </div>
      ) : null}

      {mode === "api" ? (
        <form
          autoComplete="off"
          className="mt-2 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onPersist(async () => {
              const next = await upsertLlmAccount({
                data: {
                  provider,
                  key,
                  model,
                  label: label.trim() || defaultAccountLabel(provider, "api"),
                },
              });
              if (next.saved) reset();
              return next;
            });
          }}
        >
          <Input
            type="text"
            name="agora-llm-label"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={48}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            aria-label="Nome da conta"
            placeholder="Pessoal"
          />
          <select
            aria-label="Modelo"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className={llmFieldClass}
          >
            {models.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
          <Input
            required
            type="text"
            name="agora-llm-key"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            data-1p-ignore=""
            data-lpignore="true"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            aria-label="Chave da API"
            placeholder="Cole a chave da API"
            className="min-h-11"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !key.trim()}
              className="h-11 flex-1 rounded-md border border-ink bg-ink text-sm font-semibold text-paper disabled:opacity-40"
            >
              {busy ? "Validando…" : "Validar e conectar"}
            </button>
            <button type="button" className="h-11 px-3 text-xs text-mute" onClick={reset}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {mode === "oauth" ? (
        <form
          autoComplete="off"
          className="mt-2 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onPersist(async () => {
              const next = await completeLlmOauth({ data: { code: oauthCode } });
              if (next.saved) reset();
              return next;
            });
          }}
        >
          <p className="text-xs text-mute">
            <span className="font-semibold">1.</span> Abra a autorização oficial do Claude.
          </p>
          <button
            type="button"
            disabled={busy}
            className="h-11 rounded-md border border-ink bg-ink text-sm font-semibold text-paper disabled:opacity-40"
            onClick={() => {
              onBusy(true);
              void (async () => {
                try {
                  const started = await startLlmOauth({
                    data: {
                      provider,
                      label: defaultAccountLabel(provider, "oauth"),
                      model: account?.model || defaultModelFor(provider),
                    },
                  });
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
            Abrir autorização
          </button>
          <p className="text-xs text-mute">
            <span className="font-semibold">2.</span> Autorize no navegador (Claude Pro/Max).
          </p>
          <p className="text-xs text-mute">
            <span className="font-semibold">3.</span> Cole o código — vale por poucos minutos.
          </p>
          <Input
            type="text"
            name="agora-llm-oauth-code"
            autoComplete="off"
            value={oauthCode}
            onChange={(event) => setOauthCode(event.target.value)}
            aria-label="Código da autorização"
            placeholder="Cole o código"
            className="min-h-11"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !oauthCode.trim()}
              className="h-11 flex-1 rounded-md border border-line bg-card text-sm font-semibold text-ink disabled:opacity-40"
            >
              Concluir autorização
            </button>
            <button type="button" className="h-11 px-3 text-xs text-mute" onClick={reset}>
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
