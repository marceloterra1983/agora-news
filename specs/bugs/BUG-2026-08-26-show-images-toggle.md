---
bug_id: BUG-2026-08-26T030800
status: fixed
severity: medium
scope: ui-settings
title: Toggle Mostrar fotos parece morto após sync da nuvem
---

# BUG-2026-08-26T030800: Mostrar fotos não responde

## Problem

- Em Configurações, o interruptor "Mostrar fotos" não muda o feed (ou o próprio controle fica sem estado).
- Esperado: um clique grava a preferência, marca `html[data-images]` e esconde/mostra a mídia do feed.

Security impact: NONE — no security exploit path identified.

## Root Cause Analysis

O pull de preferências da nuvem avisa o app com um envelope `{ fromRemote: true }`. O hook de settings trata esse envelope como se fosse o objeto de preferências. Os booleanos somem no estado React (`aria-checked` vira nulo), enquanto o `localStorage` e o dataset do `html` continuam com o valor antigo. O próximo clique faz `!undefined === true` e religa as fotos.

Risk level: Low

## TDD Fix Plan

1. **RED**: hidratar settings a partir do evento não pode apagar `showImages` quando o detalhe é só `{ fromRemote: true }`
   **GREEN**: ler o storage (ou um payload com `showImages` boolean) e o sync mandar as settings reais junto do envelope
   **verify**: `node --experimental-strip-types --test scripts/show-images-settings.test.mjs`

## Acceptance Criteria

- [x] `writeSettings({ showImages: false })` grava e seta `data-images=off`
- [x] `{ fromRemote: true }` mantém `showImages` do storage
- [x] Clique no interruptor volta a ter `aria-checked` estável após um pull
- [x] Testes do contrato passam

## Resolution

`settingsFromEventDetail` ignora o envelope `{ fromRemote: true }` e relê o storage. O pull da nuvem agora despacha as settings reais junto do flag. Browser em `:8181`: após `fromRemote`, `aria-checked` ficou `"false"` (antes virava `null`); 24/24 `[data-media]` com `display:none`.
