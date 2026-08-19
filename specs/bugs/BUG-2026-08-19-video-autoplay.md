---
bug_id: BUG-2026-08-19T000500
status: fixed
severity: high
scope: ui-media
title: Vídeos do X não tocam e não iniciam sozinhos
---

# BUG-2026-08-19T000500: vídeos não tocam

## Problem

- Na matéria, o player de vídeo aparece (poster + controles) mas o arquivo não toca.
- Esperado: o MP4 carrega e inicia sozinho, mudo, em loop, com controles para o áudio.

Security impact: NONE — no security exploit path identified.

## Root Cause Analysis

O CDN de vídeo do X responde 200 sem `Referer` e 403 quando o browser manda o origin do site. O bloco de vídeo da matéria não envia `referrerPolicy=no-referrer` (as fotos já enviam). Sem isso o MP4 nunca carrega. O mesmo bloco também não declara `autoPlay`/`muted`/`loop`, então o autoplay de feed/matéria fica bloqueado pela política do browser.

Risk level: Low

## TDD Fix Plan

1. **RED**: contrato do bloco de vídeo exige autoplay mudo, loop, playsInline e no-referrer
   **GREEN**: o player aplica esses atributos e força `muted` + `play()` no mount
   **verify**: `node --experimental-strip-types --test scripts/story-video.test.mjs`

## Acceptance Criteria

- [x] `<video>` da matéria tem `autoPlay`, `muted`, `loop`, `playsInline` e `referrerPolicy="no-referrer"`
- [x] MP4 do X deixa de ser pedido com Referer da página
- [x] Contrato `scripts/story-video.test.mjs` passa

## Resolution

O atributo no `<video>` não basta: o pipeline de mídia do Chromium ignora `referrerpolicy` e o MP4 segue com Referer → 403. O documento agora declara `Referrer-Policy: same-origin` (header + meta). Evidência no browser: elemento-only = error 4; `same-origin` no documento = `loadeddata` / `readyState` 4.
