import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { authEnabled, signIn, signOut, signUp } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Tip } from "@/components/news/icon-btn";
import { routeMeta } from "@/lib/news/route-meta";

type LoginSearch = { cadastro: boolean };

export const Route = createFileRoute("/login")({
  head: () => ({ meta: routeMeta("Entrar", "Entre para sincronizar suas preferências entre aparelhos.") }),
  validateSearch: (raw: Record<string, unknown>): LoginSearch => ({
    cadastro: raw.cadastro === "1" || raw.cadastro === "true" || raw.cadastro === true,
  }),
  component: Login,
});

function Login() {
  const { user, isPending } = useCurrentUserState();
  const { cadastro } = Route.useSearch();

  return (
    <main
      id="conteudo-principal"
      tabIndex={-1}
      className="grid min-h-dvh place-items-center bg-paper px-6 text-ink"
    >
      <div className="w-full max-w-sm">
        <h1>
          <Link
            to="/"
            search={{ secao: "ai" }}
            className="font-display text-4xl tracking-tight"
          >
            Entrar no Agora
          </Link>
        </h1>
        {isPending ? (
          <p className="mt-2 text-sm text-ink-soft">Carregando a sessão…</p>
        ) : user ? (
          <SignedInPanel
            name={user.displayName ?? user.primaryEmail ?? "Conta"}
            email={user.primaryEmail}
          />
        ) : (
          cadastro ? <SignUpPanel /> : <SignInPanel />
        )}
        <Tip label="Voltar ao feed">
          <Link
            to="/"
            search={{ secao: "ai" }}
            aria-label="Voltar ao feed"
            className="mt-8 grid size-[44px] place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
          >
            <ArrowLeft className="size-4" />
          </Link>
        </Tip>
      </div>
    </main>
  );
}

function SignedInPanel({
  name,
  email,
}: {
  name: string;
  email: string | null;
}) {
  return (
    <>
      <p className="mt-2 text-sm text-ink-soft">
        Você já entrou. Favoritos, fontes e o tamanho da letra sobem para a
        nuvem neste aparelho.
      </p>
      <p className="mt-6 text-sm font-medium text-ink">{name}</p>
      {email ? <p className="mt-0.5 text-xs text-mute">{email}</p> : null}
      <div className="mt-6 flex flex-col gap-2">
        <Link
          to="/configuracoes"
          className="inline-flex h-11 items-center justify-center rounded-md border border-line px-4 text-sm text-ink hover:bg-paper-2"
        >
          Configurações
        </Link>
        {authEnabled ? (
          <button
            type="button"
            onClick={() => void signOut("/")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm text-ink hover:bg-paper-2"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        ) : null}
      </div>
    </>
  );
}

function SignInPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password, "/");
    } catch {
      setError("E-mail ou senha inválidos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mt-2 text-sm text-ink-soft">
        Entre para levar favoritos, fontes e o tamanho da letra para qualquer
        aparelho.
      </p>
      {authEnabled ? (
        <form onSubmit={submit} className="mt-8 grid gap-3">
          <label className="grid gap-1 text-sm">
            E-mail
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-md border border-line bg-paper px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            Senha
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-md border border-line bg-paper px-3"
            />
          </label>
          {error ? <p role="alert" className="text-sm text-mark">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-md bg-ink px-4 text-sm text-paper disabled:opacity-50"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </form>
      ) : (
        <p className="mt-8 text-sm text-mute">O login está desligado.</p>
      )}
      <Link
        to="/login"
        search={{ cadastro: true }}
        className="mt-4 inline-block text-sm text-ink underline"
      >
        Criar conta
      </Link>
    </>
  );
}

function SignUpPanel() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signUp(name, email, password, "/");
    } catch {
      setError("Não foi possível criar a conta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mt-2 text-sm text-ink-soft">
        Crie a conta autorizada para sincronizar seus dados.
      </p>
      <form onSubmit={submit} className="mt-8 grid gap-3">
        <label className="grid gap-1 text-sm">
          Nome
          <input
            type="text"
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 rounded-md border border-line bg-paper px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          E-mail
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-md border border-line bg-paper px-3"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Senha (mínimo 6 caracteres)
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-md border border-line bg-paper px-3"
          />
        </label>
        {error ? <p role="alert" className="text-sm text-mark">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="h-11 rounded-md bg-ink px-4 text-sm text-paper disabled:opacity-50"
        >
          {busy ? "Criando…" : "Criar conta"}
        </button>
      </form>
      <Link
        to="/login"
        search={{ cadastro: false }}
        className="mt-4 inline-block text-sm text-ink underline"
      >
        Já tenho conta
      </Link>
    </>
  );
}
