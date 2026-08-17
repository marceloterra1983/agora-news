# Produção

O servidor só inicia com `AGORA_RUNTIME_MODE=production` e todas as variáveis
obrigatórias presentes. O `compose.yml` define o modo; os valores ficam no `.env`
local do host e nunca entram na imagem.

## Variáveis obrigatórias

- `DATABASE_URL`
- `BETTER_AUTH_URL=https://news.automatizems.com`
- `BETTER_AUTH_SECRET`
- `AUTH_ALLOWED_EMAIL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_PUBLISHABLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `CRON_SECRET`

`VITE_AUTH_ENABLED` pode ser omitida ou definida como `true`; `false` é recusado
em produção. `SUPABASE_URL` é opcional enquanto o projeto Supabase não mudar.
Redis REST também é opcional; quando configurado, URL e token devem pertencer ao
mesmo provedor.

`AUTH_BOOTSTRAP_SIGNUP=true` abre temporariamente o cadastro para a allowlist.
Depois do primeiro cadastro, defina `false` e reinicie o serviço.

## Cutover

1. Crie o Postgres persistente, chaves Supabase novas e um novo par VAPID.
   Preencha o `.env` no host e defina `AUTH_ALLOWED_EMAIL` para o único e-mail.
2. No SQL Editor do Supabase, aplique `scripts/supabase-domain-tables.sql` e depois
   `scripts/supabase-private-persistence-migrate.sql`. Guarde e confira o manifesto
   exportado antes de qualquer limpeza legada.
3. Exija CI verde e construa a imagem: `docker compose build news`.
4. Aplique somente o schema Better Auth/Postgres:
   `docker compose run --rm news npm run db:migrate`.
5. Suba o runtime: `docker compose up -d news`.
6. Confirme `/api/health/live` com HTTP 200 e `/api/health` com as três seções
   frescas. Com `AUTH_BOOTSTRAP_SIGNUP=true`, crie a conta allowlisted; depois
   desligue o cadastro, reinicie e teste o login, persistência após reinício,
   uma escrita autenticada e a reconciliação de push.
7. Verifique o uso das chaves Supabase novas antes de desativar e depois revogar
   as legadas. Para VAPID, mantenha o novo par implantado até os clientes
   substituírem assinaturas incompatíveis; depois remova o segredo antigo.

Rollback: restaure a imagem anterior sem desfazer migrations aditivas. Preserve
`AUTH_ALLOWED_EMAIL` e a sessão Better Auth ao validar a imagem anterior.
