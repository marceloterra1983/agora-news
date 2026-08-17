# Single-user email authentication

## Goal

Replace the unavailable Grok OAuth broker with Better Auth's native email and
password flow. Production must admit exactly one configured email address,
persist the account in the existing Supabase Postgres database, and close sign-up
immediately after the owner creates the first account.

## Scope

This change covers authentication configuration, the `/login` experience,
single-user enforcement, bootstrap, tests, and production rollout. It does not
add Google or X login, email delivery, self-service password recovery, database
backups, or legacy-row cleanup.

## Architecture

- Better Auth remains the session authority and continues using `DATABASE_URL`.
- Native `emailAndPassword` authentication is enabled with a minimum password
  length of 12 and a maximum of 128 characters.
- The generic OAuth client, broker provider configuration, popup flow, and
  `GROK_AUTH_*` production requirements are removed.
- `AUTH_ALLOWED_EMAIL` becomes a required production variable. Comparisons use
  `trim().toLowerCase()`. The normalized value must match
  `^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$`; invalid configuration fails startup. Neither
  the configured nor submitted value is logged.
- `AUTH_BOOTSTRAP_SIGNUP=true` temporarily permits sign-up. Its default is
  false, and Better Auth receives `disableSignUp: true` whenever the flag is not
  explicitly true.
- A server-side Better Auth before hook rejects both `/sign-up/email` and
  `/sign-in/email` for any address other than `AUTH_ALLOWED_EMAIL`. The client is
  not a security boundary.

## User flow

Normal `/login` displays an accessible email and password sign-in form. The
temporary `/login?cadastro=1` view adds name, password confirmation, and a
"Criar acesso" action for bootstrap. Fields have visible labels, errors use an
alert region, pending submissions disable controls, and successful sign-in or
sign-up returns to `/`.

The bootstrap sequence is:

1. Confirm the Better Auth user table has no existing account.
2. Set `AUTH_ALLOWED_EMAIL` and temporarily set
   `AUTH_BOOTSTRAP_SIGNUP=true`.
3. Deploy while retaining the previous image for rollback.
4. Open `/login?cadastro=1` in the connected Chrome. The owner enters the
   approved email and a private password; the password is never sent through
   chat or terminal output.
5. Confirm the session and cloud preferences work.
6. Set `AUTH_BOOTSTRAP_SIGNUP=false`, restart, and prove that a new sign-up is
   rejected while the existing account can still sign in.

## Failure handling and recovery

The UI maps authentication failures to short Portuguese messages without
showing raw server errors. Unauthorized email, closed sign-up, invalid password,
network failure, and duplicate-account outcomes remain distinct enough for the
owner to act without enabling account enumeration for other addresses.

There is no public password-reset flow. If the password is lost, an operator
performs a controlled server-side reset, revokes other sessions, and verifies a
new login. This deliberate single-user simplification can be replaced by email
delivery only when self-service recovery is required.

## Security invariants

- Production fails closed when `AUTH_ALLOWED_EMAIL` is absent.
- Sign-up defaults to disabled.
- Both sign-up and sign-in enforce the allowlist on the server.
- Passwords are handled only by Better Auth and are never logged or written to
  source-controlled files.
- Existing CSRF origin checks, secure host-only cookies, database persistence,
  and owner-scoped preference APIs remain unchanged.
- No legacy Supabase key is revoked until the new deployment passes its smokes.

## Verification

One focused behavior test must first fail against the broker-dependent code and
then prove:

- production starts without `GROK_AUTH_*`;
- production rejects a missing or malformed `AUTH_ALLOWED_EMAIL`;
- email/password is enabled and sign-up defaults closed;
- the allowlist rejects another normalized address for sign-up and sign-in;
- bootstrap permits only the configured address;
- the login route exposes labeled sign-in fields, confirmation during
  bootstrap, announced errors, and busy state;
- broker-only imports, providers, popup code, and UI controls have no remaining
  production callers.

After the focused test passes, run the full mandatory test suite, typecheck,
lint, production build, Docker release smoke, and a real browser bootstrap and
post-lock sign-in check.

## Rollout and rollback

Do not replace the running container until the new image starts with the new
configuration and passes localhost health checks. Keep the existing production
image available until login, session persistence, Supabase reads, and owner
preference writes pass. A failed rollout returns traffic to that retained image;
it does not delete the newly created Better Auth account or rotate Supabase
credentials.
