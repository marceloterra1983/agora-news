# Project Context

**App:** Agora News (PWA de notícias de IA)  
**Repo:** https://github.com/marceloterra1983/agora-news  
**Posse:** Cursor agent a partir de 2026-08-16  
**Baseline lida:** `main` @ `274794e`

## Stack

- Runtime: TanStack Start 1.16 + Vite 8 + Nitro 3 (preset Vercel) + React 19
- Linguagem: TypeScript 5.7 (`strict`)
- UI: Tailwind 4, Radix (quase todo morto), lucide-react
- Data client: TanStack Query 5, Zustand 5
- Auth: Better Auth 1.6 (Google/X via broker Grok) + Kysely
- SQL de auth: Neon (`DATABASE_URL`) ou PGLite in-memory
- Feed canônico: Supabase REST `public.posts` (projeto `uqcaodtgrkphuhdkchyh`)
- Cache: Redis REST (Upstash/Vercel KV) → memória de isolate → `posts` como KV
- Ingest: fxtwitter + Google Translate gtx + cron Vercel `*/15` → `/api/ingest`
- Push: web-push + VAPID
- Testes: `node --test scripts/**/*.test.mjs` (gates de template Grok, não de domínio)

## Architecture

PWA mobile-first. Chrome vivo: `AppChrome` (header de seção/grupos + tab bar) + `Feed` + `StoryCard`.

```
fxtwitter → runIngest → upsertPosts (service role) → public.posts
                ↓
         invalidate + push
                ↓
loadNews / downloadSupabase → Redis/memória → UI (Query + Zustand)
```

Google Sheets / RSS / Apps Script / `agora_queue.py` são **legado**. O app não lê mais a planilha.

Auth existe (cookies `__Host-`, `authMiddleware`, Sec-Fetch-Site) mas **nenhuma server fn de news usa o middleware**. Prefs, watch, ingest, profile e push aceitam caller anônimo.

`public.posts` é god-table: notícia + `kv_*` + `push_*` + `watch_*` + `prfl_*` + prefs.

## Conventions (Observed)

- Fail-soft: `try/catch` devolve `[]` / `null`; ingest e push engolem erro.
- Server fns TanStack (`createServerFn`) para leitura; rotas `/api/*` para cron e mutações.
- Casts de JSON externo sem Zod (exceto preview-host-bridge).
- Timing: `timed()` → `console.info("[agora] …")`.
- Settings/tema/prefs no `localStorage` + CustomEvent; nuvem só se logado (`PrefsSync`).
- SW só em prod; sem `fetch` handler (histórico: SW antigo serviu HTML como CSS).
- Preview Grok: hide-host-chrome, dois manifests, plugin PWA, `startup.sh` com Redis local (o app recusa localhost).

## Signals / Active Considerations

- **Segredos:** service role JWT e VAPID private continuam como fallback no source (decisão 2026-08-16: não rotacionar neste ciclo).
- **Escritas (e01):** mutações app exigem `Sec-Fetch-Site: same-origin`. Ingest: `CRON_SECRET` opcional; sem secret, cron Vercel / sem header ainda passam; cross-site bloqueado. Prefs usam `authMiddleware` + `context.userId`.
- **Schema drift:** migrations documentam Neon/PGLite; feed vive no Supabase. Health agora só sonda `posts`.
- **Hotspots:** `server.ts` 604, `buscar.tsx` 568, `fontes.tsx` 490, `ingest.ts` 394, `p2p.ts` 570 (morto).
- **Morto (e02):** removidos rss/catalog/multiplayer, chrome jornal (Masthead/Hero/Ticker), Radix/shadcn sem uso. Um manifesto: `/manifest.webmanifest`. Plugin Grok não injeta o segundo se o app já declara um.
- **UX:** chips de grupo só filtram em `/`; `/buscar` é busca de perfis X; marca “Agora” vs “IA — NEWS”.
- SQL de índice/Realtime do feed: `scripts/supabase-posts-indexes.sql` (manual no Supabase). `migrations/` só auth.
- Stash local (não neste epic): `package-lock.json`, `src/routeTree.gen.ts`.
