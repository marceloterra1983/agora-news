# Arquitetura técnica verificada

**Aplicação:** Agora News

**Atualizado:** 2026-08-17
**Produção:** Docker Compose, Nitro `node-server` e Nginx em
`127.0.0.1:3080`

## Stack

- TanStack Start/Router/Query, React 19, Vite 8 e Nitro 3.
- TypeScript estrito, Tailwind CSS 4 e ícones Lucide.
- Better Auth + Kysely sobre Postgres persistente (`DATABASE_URL`) em produção.
  PGLite efêmero existe somente em `local` e `preview` explícitos.
- Feed canônico em Supabase REST `public.posts`.
- Cache e lease opcionais em Redis REST, com fallback de caches não críticos
  para memória; locks falham fechado quando Redis solicitado está inválido.
- Ingestão por `scripts/ingest-cron.sh` a cada 15 minutos, protegida por
  `CRON_SECRET`, com fxtwitter e Google Translate.
- Web Push com VAPID configurado somente por ambiente.

## Fluxos

```text
fxtwitter → runIngest → public.posts → downloadSupabase → loadNews → React Query
                         ├─ x_profiles
                         ├─ push owner-scoped
                         └─ invalidação de caches em memória
```

O navegador refaz a consulta a cada 60 segundos. O servidor mantém uma única
camada SWR/single-flight para a lista Supabase. Respostas válidas vazias são
estado vazio; falhas preservam o último resultado somente com `live: false`.

## Persistência e confiança

- `public.posts`: notícias públicas.
- `x_profiles`: catálogo global lido e escrito somente pelo servidor.
- `user_watches`: fontes acompanhadas, sempre vinculadas ao usuário autenticado.
- `user_prefs`: preferências owner-scoped.
- `push_subscriptions`: endpoint único transferido atomicamente ao usuário atual
  e removido somente pelo dono.
- Better Auth: sessões persistentes no Postgres de `DATABASE_URL`.

As quatro tabelas Supabase têm RLS forçada e negam acesso direto a
`anon`/`authenticated`. Escritas de aplicativo exigem sessão e mesma origem;
ingestão exige Bearer; erros de dependência não são convertidos em sucesso.

## Runtime e release

- `AGORA_RUNTIME_MODE=production` e todas as credenciais persistentes são
  validadas antes de o Nitro aceitar tráfego.
- `/api/health/live` mede somente o processo; `/api/health` exige dados frescos
  em `ai`, `tech` e `brasil`.
- O CI instala Chromium, rejeita warnings, constrói o Nitro e a imagem Docker,
  inicia ambos e executa todos os smokes sem skips.
- `npm run db:migrate` aplica apenas Better Auth/Postgres. Os scripts
  `supabase-domain-tables.sql` e `supabase-private-persistence-migrate.sql` são
  aplicados manualmente no Supabase, nessa ordem.

Chaves Supabase e VAPID não possuem fallback literal no código. A rotação real
no provedor só é considerada concluída após coexistência, smokes e verificação
de uso; valores nunca são registrados na documentação.

## Legado preservado

`scripts/agora-feed-sync.gs` e `scripts/agora_queue.py` não têm consumidor no
repositório, mas podem ter acionadores externos. Permanecem até essa ausência ser
confirmada fora do código. Relatórios e épicos concluídos são evidência histórica
e não representam o runtime atual.
