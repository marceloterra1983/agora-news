# Estratégia de backup — Agora News

Medido em 2026-09-21. Só leitura na base (`SELECT`). Este documento não altera
scripts de backup.

**Suposição:** o host continua a ter IPv6 até `db.<ref>.supabase.co`, portanto a
conexão direta (recomendada pela documentação oficial para `pg_dump`) é usável
sem o add-on IPv4.

## Problema

O timer `agora-news-backup` corre `scripts/backup-production.sh` →
`scripts/pg-dump-retry.mjs` → `pg_dump --format=custom` **completo** da base
Supabase remota pelo **session pooler** (`*.pooler.supabase.com:5432`), teto de
5 min por tentativa, até 3 tentativas (#147). Em 2026-09-21 o job das 03:30
falhou no `COPY` de `public.posts` (`SSL connection has been closed
unexpectedly`); a repetição das 08:16 estourou o teto; a terceira passou.

`posts` é 93 % da base e cresce todos os dias. O teto de 5 min e o pooler no
caminho do `COPY` não aguentam esse crescimento. Um backup que não se sabe
restaurar não conta: o script valida o arquivo (`pg_restore --list` e
`--schema-only` para `/dev/null`) e nunca ensaiou carregar dados num Postgres
descartável.

## Estado atual (código e host)

| Peça | Valor medido |
|---|---|
| Timer versionado | `OnCalendar=*-*-* 03:30:00` |
| Drop-in real | `agora-news-backup.timer.d/offgrid.conf` → **03:21** (fora da grade do ingest `*:00/15`) |
| Runbook | ainda diz crontab 03:30 |
| Serviço | `backup-production.sh && backup-to-drive.sh` |
| Dump | `pg_dump --format=custom --no-owner --no-acl`, gzip (TOC: `Compression: gzip`) |
| Ligação | `DATABASE_URL` = session pooler, porta 5432, `sslmode=require` |
| Teto | `PG_DUMP_TIMEOUT_MS=300000` (3 tentativas, espera 60 s, ficheiro limpo a cada tentativa) |
| systemd extra | `Restart=on-failure` / `RestartSec=20min` / `StartLimitBurst=3` em 3 h |
| Cliente | `pg_dump` 18.6 contra servidor 17.6.1.155 (aceite pela documentação do `pg_dump`) |
| Snapshot | dump + bundle git + `docker save news-news:latest` gzip + `.env` age + compose/Dockerfile/runbook/crontab/hashes |
| Retenção | 30 snapshots locais e 30 no Drive (`RETENTION_COUNT=30`) |

Falha de 2026-09-21 (journal `agora-news-backup.service`):

```
03:30:14 start
03:35:05 COPY public.posts … PQgetCopyData() failed; SSL connection has been closed unexpectedly
08:16:29 start
08:21:30 pg_dump_timeout (teto 5 min)
08:22:28 restart
08:24:05 backup complete (snapshot 20260921T112228Z)
08:24:45 drive backup complete
09:34:28 start (ensaio posterior)
09:35:47 backup complete (snapshot 20260921T123428Z); wall 1 min 59.977 s
```

A documentação oficial do Supabase classifica `pg_dump`, backup e restore como
caso de **conexão direta**, não de pooler
([Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)).

## Medições

Consultas abaixo: transação `read only`, `statement_timeout = 90s`,
`node --env-file` + `node-pg` com CA pinada. Credenciais não entram neste
documento. Datas diárias = `date` UTC (`created_at AT TIME ZONE 'UTC'`).

### Tamanho da base e de `posts`

```sql
SELECT current_database() AS db,
       pg_database_size(current_database())::bigint AS bytes;

SELECT count(*)::bigint AS n,
       pg_total_relation_size('public.posts')::bigint AS total_bytes,
       pg_relation_size('public.posts')::bigint AS heap_bytes,
       pg_indexes_size('public.posts')::bigint AS idx_bytes,
       min(created_at), max(created_at)
FROM public.posts;

SELECT n.nspname, c.relname,
       pg_total_relation_size(c.oid)::bigint,
       c.reltuples::bigint
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY 3 DESC
LIMIT 5;
```

| Objeto | Resultado (2026-09-21 ~12:35 UTC) |
|---|---|
| `pg_database_size` | 199 593 107 B (**190 MB**) |
| `posts` linhas | **104 295** |
| `posts` total (heap+idx) | 186 089 472 B (**177 MB**) |
| `posts` heap (o que o `COPY` lê) | 105 332 736 B (**100 MB**) |
| `posts` índices | 77 496 320 B (**74 MB**) |
| `posts.created_at` | min 2026-08-14T18:29Z, max 2026-09-21T12:35Z |
| 2.ª tabela | `public.x_profiles` 992 kB / 260 linhas |
| 3.ª | `public.legacy_synthetic_posts_export` 408 kB / 296 linhas |

`posts` é a única tabela grande. O resto do dump (auth/storage/vault/Better
Auth) é ruído de tamanho; o `COPY` que parte a ligação é o de `posts`.

Índices de `posts`: `post_id` (PK), `account`, `(account, posted_at)`,
`(category, posted_at)`, `(category, account, posted_at)`, `posted_at`, GIN
trgm em `summary_pt`. **Não há índice em `created_at` nem em `updated_at`.**

### Ritmo dos últimos 30 dias

```sql
SELECT (created_at AT TIME ZONE 'UTC')::date AS d,
       count(*)::bigint AS n,
       round(sum(pg_column_size(p))::numeric / (1024 * 1024), 3) AS row_mb
FROM public.posts p
WHERE created_at >= now() - interval '30 days'
GROUP BY 1
ORDER BY 1;
```

Resumo 30 d (2026-08-22 → 2026-09-21 UTC, o dia 21 é parcial):

| Métrica | Valor |
|---|---|
| Linhas criadas | 94 894 |
| Payload `pg_column_size` | 82,233 MB |
| Média 30 d | **3 163 linhas/dia**, **2,74 MB/dia** |
| Janela 14 d completos 07–20 set | **3 271 linhas/dia**, **3,04 MB/dia** |
| Mínimo / máximo diário | 522 / 5 016 linhas; 0,517 / 4,272 MB |

Série (UTC, `n` / `row_mb`):

| dia | n | MB | dia | n | MB |
|---|---:|---:|---|---:|---:|
| 08-22 | 522 | 0,517 | 09-07 | 3087 | 2,739 |
| 08-23 | 888 | 0,959 | 09-08 | 4685 | 3,991 |
| 08-24 | 1238 | 1,306 | 09-09 | 5016 | 4,272 |
| 08-25 | 1457 | 1,543 | 09-10 | 4544 | 3,832 |
| 08-26 | 1504 | 1,500 | 09-11 | 4236 | 3,525 |
| 08-27 | 2831 | 2,535 | 09-12 | 2723 | 2,317 |
| 08-28 | 2837 | 2,566 | 09-13 | 2503 | 2,171 |
| 08-29 | 2531 | 2,215 | 09-14 | 4211 | 3,573 |
| 08-30 | 2171 | 1,915 | 09-15 | 4166 | 3,779 |
| 08-31 | 3987 | 3,393 | 09-16 | 2199 | 1,858 |
| 09-01 | 4899 | 4,150 | 09-17 | 4003 | 3,560 |
| 09-02 | 4591 | 3,850 | 09-18 | 4009 | 3,400 |
| 09-03 | 4439 | 3,534 | 09-19 | 2391 | 1,971 |
| 09-04 | 4804 | 4,128 | 09-20 | 2015 | 1,634 |
| 09-05 | 2708 | 2,337 | 09-21* | 1203 | 0,975 |
| 09-06 | 2496 | 2,187 | | | |

`updated_at` no mesmo período acompanha `created_at` (diferença típica de
dezenas de linhas por dia): a maior parte do “updated” do dia são inserts, não
reescritas de linhas velhas.

### Crescimento do dump no disco

Snapshots em `/home/marce/backups/news` (30 pastas `20??????T??????Z`):

| Snapshot | `postgres.dump` | `news.bundle` | `news-image.tar.gz` | total |
|---|---:|---:|---:|---:|
| 20260821T063001Z | 2,58 MiB | 1,12 MiB | 158,8 MiB | 162,6 MiB |
| 20260905T063001Z | 11,80 MiB | 1,69 MiB | 158,9 MiB | 172,6 MiB |
| 20260921T123428Z | **24,31 MiB** | 1,76 MiB | **158,94 MiB** | **185,1 MiB** |

Dump 21 ago → 21 set: +21,73 MiB / 31 d = **0,70 MiB/dia**.
Dump 5 set → 21 set: +12,51 MiB / 16 d = **0,78 MiB/dia** (ritmo recente).

A imagem Docker é ~86 % de cada snapshot e quase constante. O dump é o termo
que cresce.

### Projeção do tempo de dump

Ritmo recente usado: **3 270 linhas/dia**, **3,04 MB/dia** de payload,
**0,78 MiB/dia** de dump gzip.

| Horizonte | linhas `posts` | heap (payload+atual) | dump gzip | COPY a 1 MB/s (enunciado) | snapshot saudável medido |
|---|---:|---:|---:|---:|---|
| hoje | 104 k | 100 MB | 24 MiB | ~100 s | 79–97 s o snapshot inteiro |
| 6 meses | ~690 k | ~650 MB | ~165 MiB | **~11 min** | dump ~6× → teto 5 min estoura |
| 12 meses | ~1,3 M | ~1,2 GB | ~310 MiB | **~20 min** | idem |

O teto de 5 min já falha quando a ligação degrada. No ritmo conservador do
enunciado, falha também no caminho saudável por volta dos 6 meses.

### `posts` é append-mostly?

Ingestão: `POST /rest/v1/posts?on_conflict=post_id` com
`resolution=merge-duplicates` (`src/lib/news/admin.ts`). Existe `deletePost`;
nenhum caller em `src/` além da definição.

```sql
SELECT
  count(*)::bigint AS total,
  count(*) FILTER (WHERE updated_at IS NOT DISTINCT FROM created_at)::bigint AS equal_ts,
  count(*) FILTER (WHERE updated_at > created_at)::bigint AS updated_gt_created,
  count(*) FILTER (WHERE updated_at > created_at + interval '1 hour')::bigint AS after_1h,
  count(*) FILTER (WHERE updated_at > created_at + interval '1 day')::bigint AS after_1d,
  count(*) FILTER (
    WHERE created_at < now() - interval '7 days'
      AND updated_at > now() - interval '7 days'
  )::bigint AS old_touched_7d,
  count(*) FILTER (
    WHERE created_at < now() - interval '30 days'
      AND updated_at > now() - interval '30 days'
  )::bigint AS old_touched_30d
FROM public.posts;
```

| Critério | n | fração |
|---|---:|---:|
| total | 104 295 | 100 % |
| `updated_at = created_at` | 83 835 | **80,4 %** |
| qualquer update | 20 460 | 19,6 % |
| update depois de 1 h | 12 296 | 11,8 % |
| **update depois de 1 dia** | **433** | **0,42 %** |
| criada há >7 d e tocada nos últimos 7 d | 293 | 0,28 % |
| criada há >30 d e tocada nos últimos 30 d | 202 | 0,19 % |

Por idade da linha, `updated_at > created_at + 1 day`:

| idade | n | mutadas após 1 d |
|---|---:|---:|
| 0–1 d | 2 573 | 0 |
| 1–7 d | 20 424 | 28 |
| 7–30 d | 71 897 | 217 |
| 30 d+ | 9 401 | 188 |

**Sim, é append-mostly.** Incremental por marca-d'água em `updated_at` apanha
as mutações tardias (0,42 %). Não apanha `DELETE`. Sem índice em `updated_at`,
a marca-d'água faria seq scan até se criar o índice.

Há 12 029 dead tuples em `posts` (upserts): o VACUUM já corre
(`last_autoanalyze` 2026-09-21); não é o problema do backup.

## Retenção e espaço

Política no script: **30** locais (`backup-production.sh`) e **30** no Drive
(`backup-to-drive.sh`, remote `gdrive:BACKUP/dev/news/`).

| Sítio | Medido 2026-09-21 |
|---|---|
| `/home/marce/backups/news` | **30** snapshots, **5,1 G** |
| snapshot mais novo | 186 M (dump 25 M + bundle 1,8 M + imagem 159 M) |
| Drive `BACKUP/dev/news` | **5** pastas, **922 MiB** (90 objetos) |
| Drive quota (remoto inteiro) | 718 GiB usados / 5 TiB |

O Drive ainda não tem 30 dias: os cinco nomes são 19–21 set. A política é 30;
o histórico remoto começa tarde. 30 snapshots no tamanho atual ≈ 5,6 G no
Drive. 30 dumps sem imagem ≈ 0,75 G.

Logs do cron: `ops/logrotate/agora-news` (14 cópias, 10 MiB, `copytruncate`).

## Plano Supabase atual (documentação oficial + API)

Fontes: [Database Backups](https://supabase.com/docs/guides/platform/backups),
[PITR usage](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery),
[Going to Production](https://supabase.com/docs/guides/deployment/going-into-prod),
Management API `GET /v1/projects/<ref>/database/backups` e
`GET /v1/organizations/<org>` em 2026-09-21.

| Plano | Backups diários | PITR |
|---|---|---|
| **Free** | nenhum automático; a docs pede `supabase db dump` + cópia offsite | indisponível |
| Pro | 7 dias, restauro in-place no dashboard (projeto inacessível durante o restauro) | add-on, a partir de compute Small; ~USD 100/100/200/400 por 7/14/28 dias |
| Team | 14 dias | idem |
| Enterprise | até 30 dias | idem |

Medido neste projeto:

```
organization.plan = "free"
pitr_enabled = false
backups = []
selected_addons = []
walg_enabled = true   -- motor 17.6.1.155 já usa backups físicos quando o plano os tem
```

Apagar o projeto no dashboard apaga também os backups na S3 da Supabase. PITR,
quando ligado, **substitui** os backups diários (não soma).

**O dump local+Drive é hoje o único backup.** Não há segunda cópia gerida.

## Opções

### (a) Incremental por `updated_at` + completo semanal

**Como:** dump custom completo 1×/semana; nos outros dias
`COPY (SELECT * FROM posts WHERE updated_at > :watermark)` + dump das tabelas
pequenas. Índice novo em `updated_at`. Watermark persistido no snapshot.

**Custo:** script novo, índice, dois formatos de artefacto, runbook de
reconstrução. Volume diário ~3 MB em vez de ~100 MB de heap.

**Risco:** `DELETE` (função existe) some do incremental; restore deixa de ser
um `pg_restore` e passa a “completo da semana + replay de deltas + reconciliação
de apagados”. Dois formatos para testar. 0,42 % de mutações tardias *são*
cobertas pelo watermark; apagados não.

**Restore:** `pg_restore` do dump semanal num destino; depois `COPY`/upsert das
linhas do delta; conferir `count(*)` e uma amostra de `post_id`; apagados só
com lista de tombstones (hoje inexistente) ou com o completo da semana.

**Veredito da opção:** viável nos números, cara na operação. Só se o dump
completo fiável ainda estourar o teto depois de (c)+(d).

### (b) Backup gerido / PITR da Supabase

**Como está:** plano **Free**, `backups: []`, PITR desligado. A docs do Free
manda exportar com CLI e guardar offsite — é o que o host já tenta fazer.

**Se upgrade Pro (USD 25/mês + compute):** 7 dias de backup físico, restauro
**in-place** pelo dashboard, downtime proporcional ao tamanho, sem download do
arquivo físico nas versões novas, sem `.env`/imagem/git, apaga-se com o
projeto. PITR é add-on extra (~USD 100/mês, 7 d, RPO 2 min) e exige compute
≥ Small; **não** está coberto pelo spend cap.

**Restore:** Dashboard → Database → Backups → Restore (in-place, confirmação,
projeto down). PITR: escolher instante no calendário. Não substitui cópia
offsite.

**Veredito da opção:** complementar depois de Pro; nunca o único backup. PITR
não se justifica com RPO diário e custo ~USD 100/mês.

### (c) Dump completo fora do pooler / `--jobs` / outra compressão

**Conexão direta:** `db.<ref>.supabase.co:5432`. Neste host há rota IPv6
default e AAAA no endpoint direto. A docs oficial reserva esta via para
`pg_dump`. Custo: zero. Risco: IPv6 cair (aí session pooler de novo, ou add-on
IPv4). Restore: o mesmo `pg_restore` de hoje.

**`--jobs` + formato directory:** só o directory format admite dump paralelo;
abre `njobs+1` ligações. `posts` é 177/190 MB da base — paralelizar tabelas
vazias do `auth` não encurta o `COPY` de `posts`. Risco extra: mais ligações
no pooler/direto, deadlock de lock se alguém fizer DDL. Restore:
`pg_restore -j N` no directory (isso sim ajuda o **restore**, não o dump).

**Compressão:** custom já vai gzip. `zstd` pode poupar CPU local; o gargalo
medido é o `COPY` na rede, não o gzip. `none` aumenta o ficheiro e o tempo de
Drive.

**Teto:** subir `PG_DUMP_TIMEOUT_MS` para 15 min agora e 30 min antes dos 6
meses. As 3 tentativas com ficheiro limpo ficam.

**Restore:** inalterado (`pg_restore` custom). Destino realista = projeto
Supabase novo ou `pg_restore -t posts` + tabelas `public` num Postgres 17
local; dump completo de cluster Supabase **não** carrega limpo num Postgres
vanilla (roles `supabase_admin`, extensões `supabase_vault`, etc.).

### (d) Reter menos no snapshot diário

| Artefacto | Precisa de ir todos os dias? | Restore sem ele |
|---|---|---|
| `postgres.dump` | sim | não há feed nem auth |
| `.env.age` + identidade age | sim | dump sem URL/chaves |
| compose/Dockerfile/runbook/crontab/hashes | sim, são kB | operação incompleta |
| `news.bundle` | não: `origin` está no GitHub; bundle é cinto | `git clone` do GitHub + o commit do `docker-image-id.txt` |
| `news-image.tar.gz` (159 M, 86 %) | não: `scripts/deploy-prod.sh` reconstrói de git+Dockerfile | `docker compose build` no commit gravado; imagem semanal cobre o “não quero rebuildar” |

Custo: mudar o script para imagem/bundle semanais ou quando o digest muda.
Risco: dia de desastre sem a imagem daquele commit — rebuild (~minutos) ou
imagem da semana. Espaço: 30 × ~26 M ≈ 0,78 G em vez de 5,1 G.

**Restore:** dump+env como hoje; imagem da última snapshot semanal ou rebuild.

## Recomendação única

**Manter o dump custom completo diário; tirá-lo do pooler; alongar o teto;
emagrecer o snapshot; ensaiar o restore. Não construir incremental agora.
Não comprar PITR. Tratar backup gerido da Supabase como inexistente enquanto
o plano for Free.**

Ordem: (c) ligação direta + teto → (d) imagem/bundle fora do diário → ensaio
de restore → só então (a), se o teto voltar a apertar. (b) só como segunda
cópia depois de um upgrade Pro, nunca no lugar do dump offsite.

Motivo: 0,42 % de mutação tardia faria o incremental *funcionar* para
updates, mas o restore deixaria de ser um comando; o que quebra hoje é o
`COPY` pelo pooler e o teto de 5 min, e 86 % do snapshot nem é a base.

## Plano (passos pequenos, critério verificável)

Nenhum destes passos está neste PR — só o desenho.

### Passo 1 — `pg_dump` pela conexão direta + teto 15 min

Alterar `pg-dump-retry.mjs` / env do serviço para `PGHOST=db.<ref>.supabase.co`
(IPv6), manter 3 tentativas e ficheiro limpo, `PG_DUMP_TIMEOUT_MS=900000`.

**Pronto quando:**

- `getent ahosts db.<ref>.supabase.co` devolve AAAA e o dump da madrugada
  seguinte termina na 1.ª tentativa.
- Sete noites seguidas sem `SSL connection has been closed` nem
  `pg_dump_timeout` no journal.
- `scripts/pg-dump-retry.test.mjs` continua verde (o contrato de retry não
  muda).

### Passo 2 — Snapshot diário sem imagem Docker (imagem semanal ou on-digest)

`backup-production.sh`: `docker save` só se `docker-image-id.txt` da última
snapshot completa diferir, ou no snapshot de domingo. Bundle git: mesma regra
(ou só semanal). Drive e retenção 30 mantêm-se.

**Pronto quando:**

- Snapshot de um dia de semana sem mudança de imagem pesa **< 40 M**.
- O snapshot de domingo (ou o primeiro após `docker compose build`) contém
  `news-image.tar.gz` e passa `sha256sum -c SHA256SUMS`.
- `scripts/backup-contract.test.mjs` atualizado ao novo conteúdo obrigatório
  e verde.

### Passo 3 — Ensaio de restauração (obrigatório)

Destino **descartável**, nunca `DATABASE_URL` de produção.

```bash
# Postgres 17 local, base vazia. Não usar a URL de produção.
docker run --rm --name agora-restore-trial -e POSTGRES_PASSWORD=restore \
  -p 55432:5432 postgres:17

# Só o que o produto precisa para o feed (public.posts). Confere o arquivo.
pg_restore --list "$SNAP/postgres.dump" | grep 'TABLE DATA public posts'
pg_restore --no-owner --no-acl --exit-on-error \
  --table=posts --schema=public \
  --dbname="postgresql://postgres:restore@127.0.0.1:55432/postgres" \
  "$SNAP/postgres.dump"

# Critério numérico
psql "postgresql://postgres:restore@127.0.0.1:55432/postgres" -c \
  "select count(*) from public.posts"
# tem de igualar o count medido no dump (hoje 104295 ± ingest do dia)
```

Se o restore de `--table=posts` falhar por falta de tipos/extensões, criar a
tabela a partir de `pg_restore --schema-only --table=posts` e repetir o
`--data-only`. Documentar o comando que passou no runbook.

Ensaio extra (opcional no mesmo passo): `pg_restore --schema=public` das
tabelas `x_profiles`, `user_prefs`, `user_watches`, `push_subscriptions`,
`user`, `session`, `account`.

**Pronto quando:**

- `count(*)` restaurado = `count(*)` na origem no instante do dump (± 0).
- Um `post_id` conhecido devolve o mesmo `content` / `posted_at`.
- O comando ficou no runbook. A identidade age desencripta `.env.age` e o
  SHA256 bate com o `.env` de origem (já existe `env-restore-check.txt`).

### Passo 4 — Segunda cópia só se o plano deixar de ser Free

Confirmar no dashboard (já medido: `plan=free`, `backups=[]`). Upgrade Pro é
decisão de gasto. Se acontecer: ligar Daily Backups, **não** PITR; o dump
offsite continua. Restaurar pelo dashboard uma vez num projeto *clone*, não
em produção, para provar o botão.

**Pronto quando:** `GET /database/backups` devolve ≥ 1 entrada e um clone
restaura `count(posts)` coerente. Enquanto `plan=free`, este passo está N/A.

### Passo 5 — Reavaliar incremental (a) só se 1+2 não couberem

Gatilho: dump direto + teto 15 min a falhar 2 noites seguidas *sem* corte SSL,
com heap de `posts` ≳ 500 MB. Aí sim: índice em `updated_at`, dump semanal
completo, delta diário, tombstone de `deletePost`, ensaio de restore
completo+delta.

**Pronto quando:** restore ensaio (passo 3) a partir de (semanal + 6 deltas)
iguala o dump completo do mesmo dia, incluindo uma linha apagada de propósito
num banco de teste.

## Decisões

1. **Dump completo diário fica.** Incremental é plano B. Restore de um arquivo
   custom já validado pelo script é mais simples que um pipeline de deltas.
2. **Pooler sai do `pg_dump`.** A docs da Supabase e a falha SSL no `COPY`
   apontam para a mesma causa.
3. **Imagem Docker e bundle git saem do diário.** São 86 %+1 % do snapshot e
   reconstruíveis. O dump e o `.env.age` não são.
4. **PITR não.** Plano Free, RPO diário, ~USD 100/mês, e desliga os daily
   backups se um dia existirem.
5. **Ensaio de restore é o critério de pronto do desenho**, não só “o timer
   ficou verde”. O script hoje prova que o arquivo abre, não que os dados
   voltam.

## PR Plan (implementação futura)

Este PR (docs) não muda scripts.

| PR | Título | Ficheiros | Depende |
|---|---|---|---|
| A | `fix(backup): pg_dump via conexão direta e teto 15 min` | `scripts/pg-dump-retry.mjs`, testes, drop-in systemd documentado no runbook | — |
| B | `fix(backup): imagem Docker e bundle git só semanal/on-digest` | `scripts/backup-production.sh`, `scripts/backup-contract.test.mjs`, runbook | A recomendado |
| C | `docs(backup): ensaio de restore local da tabela posts` | runbook + script de ensaio read-only (opcional `scripts/backup-restore-trial.sh`) | A ou dump atual |
| D | `feat(backup): incremental posts por updated_at` | scripts novos, índice SQL, testes de restore delta | só se o gatilho do passo 5 disparar |

## Referências

- `scripts/backup-production.sh`, `scripts/backup-to-drive.sh`, `scripts/pg-dump-retry.mjs`
- [Supabase Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html) (`--jobs` só com `-Fd`; paralelo não ajuda uma tabela dominante)
- Journal 2026-09-21 `agora-news-backup.service`
