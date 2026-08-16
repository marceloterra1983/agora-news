## Target
Fechamento da revisão Agora News: writes `profile`/`watch`/`push` + `summarizeProfile`, store de push fora de `category:push`, `readStoredProfile`, `loadFontesLive`, CloudPrefs de grupos, `href` http(s).

## Dependents (9)
- `src/routes/api/profile.ts`, `watch.ts`, `push.ts`: `requestWriteAllowed("app")`
- `src/lib/news/write-guard.ts` + `scripts/write-guard.mjs`: regra única de escrita
- `src/lib/news/push-server.ts` + `cloud-kv.ts`: persistência de Web Push
- `src/lib/news/server.ts`: `summarizeProfile`, `loadFontesLive`
- `src/lib/news/influence.ts` + `ingest.ts`: enrich fxtwitter / `mapPool`
- `src/lib/news/prefs-server.ts` + `prefs-sync.ts`: CloudPrefs
- `src/lib/news/profile-store.ts`: leitura de perfil persistido
- `src/lib/news/use-open-x-profile.ts`: POST `/api/profile` após summarize
- `src/lib/news/notify-favorites.ts`: POST `/api/push`

## Affected Stories
- Harden writes/auth (e01): sessão passa a ser obrigatória em writes de app
- Fontes live/ingest: pageview deixa de fan-out fxtwitter
- Sem epic de schema Supabase — SQL manual em `scripts/`

## Test Coverage
- `scripts/write-guard.test.mjs`: same-origin; **gap** sessão/`userId`
- `scripts/last-post-behavior.test.mjs`: last-post core; **gap** `href` javascript:
- `scripts/harden-contract.test.mjs`: prefs authMiddleware; **gap** groups/customGroups
- Gap: `readStoredProfile` exige `summary_pt`
- Gap: push em `posts.category=push` (SELECT anon)

## Risk: Medium
Writes de app sem sessão quebram push/watch/profile para visitante anônimo (intencional). Tabela `push_subscriptions` não existe em prod até SQL manual. `loadFontesLive` mais barato; avatar/buzz só no cron.

## Recommended action
Proceed. TDD no guard + `readStoredProfile` + contratos de live/push. SQL no repo, sem migrate em prod.
