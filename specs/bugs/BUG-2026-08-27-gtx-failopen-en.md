# BUG-2026-08-27T181700: GTX fail-open grava inglês como PT

## Problem

Posts em inglês aparecem no feed e na matéria ainda em inglês. `translation_pt` e `summary_pt` repetem o original.

O esperado: texto inglês vira português do Brasil na ingestão (X e RSS); se o tradutor falhar, o campo PT não finge sucesso; a próxima ingestão tenta de novo.

Reprodução (produção, 2026-08-27): posts recentes de wired, TechCrunch, cursor_ai, simonw com `translation_pt = content`. Em 36h, ~315 matérias inglesas ainda sem PT. O endpoint GTX responde 429 neste host.

Security impact: NONE. Sem caminho de exploit.

## Root Cause Analysis

O tradutor oficial do app é o endpoint não documentado do Google Translate (`client=gtx`). Ele está bloqueado (429) neste IP. No 429/timeout/JSON vazio, o cliente devolve o chunk original, o ingest grava isso como `translation_pt`, e a próxima varredura ignora o `post_id` já existente. Hidratação da matéria só tenta de novo na abertura, e o mesmo GTX volta a falhar. Cartões da lista nunca se curam.

Hipóteses falsificadas:
- Detector `looksPortuguese` pulando inglês recente — os exemplos (wired, Cursor, TechCrunch) têm partículas EN e iriam ao GTX.
- Conteúdo já era PT — samples são inglês idiomático.
- Upsert não atualiza — `on_conflict` faz merge; o problema é não reenviar a linha.

Causa única verificada: fail-open do GTX + skip de IDs conhecidos, sem fallback que funcione.

Risk level: Medium (feed inteiro de fontes EN ilegível em PT; sem risco de segurança).

## TDD Fix Plan

1. **RED**: `translateToPt` em payload GTX vazio/429 não devolve o inglês; aceita PT de um fallback.
   **GREEN**: GTX → LibreTranslate (env) → MyMemory; só persiste se parecer português.
   **verify**: `node --experimental-strip-types --test scripts/translate-pt.test.mjs`

2. **RED**: RSS/X só gravama `translation_pt` quando o candidato é PT; itens já persistidos em inglês entram na retradução.
   **GREEN**: `pickStoredPt` no upsert; lote limitado de retradução na ingestão.
   **verify**: `node --experimental-strip-types --test scripts/ingest-translate.test.mjs scripts/rss-ingest.behavior.test.mjs`

3. **RED**: hidratação troca corpo inglês persistido quando o tradutor responde PT.
   **GREEN**: `hydrateStory` já chama `translateToPt`; o cliente deixa de fail-open.
   **verify**: `node --experimental-strip-types --test scripts/story-hydrate.test.mjs`

**REFACTOR**: um único cliente de tradução (summary-line deixa de duplicar GTX).

## Acceptance Criteria

- [ ] GTX falho não grava inglês em `translation_pt`
- [ ] Fallback devolve PT quando GTX está 429
- [ ] Ingest retraduz matérias recentes com PT igual ao original inglês
- [ ] `npm test` passa
- [ ] typecheck e lint passam

## Resolution

Corrigido em `fix/post-translation-failopen`. `translateToPt` cai para LibreTranslate/MyMemory e só devolve PT; ingest retraduz até 12 matérias recentes por cron; hidratação e persist da 1ª abertura recusam inglês. Gates 5/5.

## Diagnose

### Reproduce

GTX `translate.googleapis.com/translate_a/single?client=gtx` → HTTP 429 (medido neste host). SQL: `translation_pt = content` em posts EN das últimas 2h (wired, TechCrunch, cursor_ai).

### Isolate

Cliente de tradução + upsert do ingest. UI só lê o campo já persistido.

### Hypothesize

1. GTX 429 + fail-open — **confirmada**.
2. `looksPortuguese` falso positivo — **falsa** nos samples.
3. Upsert ignora update — **falsa** (`merge-duplicates`).

### Verify

429 reproduzido. MyMemory no mesmo host devolveu PT. Sem retry, IDs conhecidos nunca voltam ao tradutor.
