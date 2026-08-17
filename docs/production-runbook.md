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

1. Reutilize o Postgres persistente e as chaves Supabase/VAPID atualmente
   configuradas. Não gere, revogue ou substitua chaves nesta operação.
   Preencha o `.env` no host e defina `AUTH_ALLOWED_EMAIL` para o único e-mail.
2. No SQL Editor do Supabase, aplique `scripts/supabase-domain-tables.sql` e depois
   `scripts/supabase-private-persistence-migrate.sql`. Guarde e confira o manifesto
   exportado antes de qualquer limpeza legada.
3. Exija CI verde e construa a imagem: `docker compose build news`. Registre o
   digest e mantenha uma tag de commit, por exemplo:
   `docker image tag news-news:latest news-news:<commit>`.
4. Aplique somente o schema Better Auth/Postgres:
   `docker compose run --rm news npm run db:migrate`.
5. Suba o runtime: `docker compose up -d news`.
6. Confirme `/api/health/live` com HTTP 200 e `/api/health` com as três seções
   frescas. Com `AUTH_BOOTSTRAP_SIGNUP=true`, crie a conta allowlisted; depois
   desligue o cadastro, reinicie e teste o login, persistência após reinício,
   uma escrita autenticada e a reconciliação de push.
7. As chaves atualmente configuradas permanecem ativas nesta operação: não há
   rotação nem revogação. Confirme somente que o container lê as variáveis do
   `.env` e que nenhum segredo aparece na imagem ou nos logs.

Rollback: restaure a imagem anterior sem desfazer migrations aditivas usando a
tag registrada: `NEWS_IMAGE_TAG=<commit> docker compose up -d --no-build news`.
Preserve `AUTH_ALLOWED_EMAIL` e a sessão Better Auth ao validar a imagem
anterior. O valor padrão continua sendo `latest` para o cutover normal.

O Compose limita os logs do container `news` a 5 arquivos de 10 MiB
(aproximadamente 50 MiB no total). O ingest e o backup usam
`/home/marce/ops/scripts/cron-alert-wrap.sh`: uma falha grava em
`/home/marce/backups/news/cron-alerts.log` e no journal do host.

```bash
journalctl -t agora-news-cron -p user.err --since today
tail -f /home/marce/backups/news/cron-alerts.log
```

Os jobs usam logs dedicados em `/home/marce/backups/news/`; o caminho legado
`~/.pm2/logs/news-ingest-cron.log` não é mais usado.

A política versionada `ops/logrotate/agora-news` gira esses logs diariamente,
mantém 14 cópias compactadas e gira antecipadamente a partir de 10 MiB. Neste
host, a crontab do usuário `marce` executa a política às 00:15 com estado em
`/home/marce/backups/news/logrotate.status`; a instalação em `/etc/logrotate.d`
fica reservada ao operador root quando a política global do host for revisada.

## Backup periódico

O host executa `/home/marce/news/scripts/backup-production.sh` diariamente às
03:30 (horário local), pelo crontab do usuário `marce`. Em seguida,
`/home/marce/news/scripts/backup-to-drive.sh` copia o snapshot para o remote
privado `gdrive:` e conserva os 30 snapshots remotos mais recentes. Cada
snapshot contém o dump custom do Postgres, bundle Git, imagem Docker, manifesto,
crontab, wrapper de alertas e hashes; o `.env` é criptografado com age. Os scripts evitam concorrência,
validam o dump e verificam os hashes locais e remotos.

A identidade privada age fica fora do repositório em
`/home/marce/.config/age/news-backup-key.txt`, com modo `600`. O remote do
`rclone` fica em `/home/marce/.config/rclone/rclone.conf`, também com modo `600`.
Copie o snapshot e essa identidade para um destino externo seguro; sem a
identidade o `.env` criptografado não pode ser restaurado.
