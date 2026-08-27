# BUG-2026-08-27T204500: pubDate PT-BR vira “agora” e o feed vira uma fonte só

## Problem

No feed Brasil (e no topo de Fontes → Grupos), a sequência vira um bloco de UOL Economia, todos com o mesmo “há N min”. O esperado: cada matéria no horário do RSS, fontes intercaladas pelo tempo real.

Security impact: NONE.

## Root Cause Analysis

O UOL manda `pubDate` em português (`Qui, 27 Ago 2026 19:56:13 -0300`). `Date.parse` devolve NaN. O ingest grava `posted_at = now()`. O heal de encoding regravou 13 posts UOL Economia e 3 UOL Notícias com o mesmo instante (`2026-08-27 23:34:10.248Z`). O feed ordena só por data; o grupo Economia sobe no sort de Grupos pelo `latest` falso.

Hipótese 1 — parse PT-BR falha — **confirmada** (`Date.parse` NaN; inglês equivalente parseia).
Hipótese 2 — sumiu interleave de fontes — **falsa**. `rankStories` sempre foi data+id.
Hipótese 3 — só o header de Grupos lista 3 nomes — **falsa como causa**. Preview é top-3 por followers; o sintoma do feed é o timestamp.

Risk level: Medium (home Brasil ilegível; sem risco de segurança).

## Diagnose

### Reproduce

`Date.parse("Qui, 27 Ago 2026 19:56:13 -0300")` → NaN. SQL: 13 linhas `r_e0d5de43db4c` com o mesmo `posted_at`.

### Isolate

`publishedAt` no parse RSS + fallback `now()` no upsert.

### Verify

Amostra UOL Economia: Braskem, Dólar, Blusinhas, CMN — todos `2026-08-27 23:34:10.248+00`.

## TDD Fix Plan

1. **RED**: `parseRssDate` aceita Qui/Ago e devolve ISO; item UOL não cai em `now()`.
   **GREEN**: mapa PT-BR → RFC 822; `publishedAt` usa isso.
   **verify**: `node --experimental-strip-types --test scripts/rss-pubdate.test.mjs`

2. **RED**: ingest regrava `posted_at` quando o pubDate real difere do persistido.
   **GREEN**: IDs conhecidos com data divergente não entram no skip; ETag RSS muda de chave para refetch.
   **verify**: `node --experimental-strip-types --test scripts/rss-pubdate.test.mjs scripts/rss-ingest.behavior.test.mjs`

## Acceptance Criteria

- [ ] `Qui, 27 Ago 2026` vira ISO, não string vazia
- [ ] Upsert de heal/novo usa essa data, não o relógio do ingest
- [ ] Reingest corrige o bloco UOL colado
- [ ] Testes e typecheck/lint passam
