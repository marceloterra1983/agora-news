---
bug_id: BUG-2026-08-26T194800
status: fixed
severity: medium
scope: ui-rss
title: Feed mostra @r_hash no lugar do nome do site RSS
---

# BUG-2026-08-26T194800: Byline RSS vaza o id interno

## Problem

- No feed (e no perfil aberto a partir do avatar), a fonte RSS aparece como `@r_9c68d283ae03` com inicial "R".
- Esperado: o título editorial do site (TecMundo) e inicial "T", sem prefixo `@` de handle do X.

Como reproduzir: abrir a seção Brasil no site; qualquer matéria do seed RSS TecMundo.

Security impact: NONE — no security exploit path identified. O id é um recorte de sha256 da URL pública do feed, não um segredo.

## Root Cause Analysis

Contas RSS usam um id estável `r_` + 12 hex (hash da URL canônica) para não colidir com handles do X. A hidratação do post já resolve o rótulo humano (TecMundo) no campo de label da história. O card reader do feed e a matéria ignoram esse rótulo e imprimem `@` + id interno. O popup de perfil repete o id como se fosse screen_name.

Hypotheses discarded:
- Username gerado pelo Better Auth — o id está no catálogo RSS, não na tabela de usuários.
- Falha de ingestão / label vazio — a label já chega "TecMundo" na história.

Risk level: Low

## TDD Fix Plan

1. **RED**: byline de `r_9c68d283ae03` + label TecMundo deve ser `TecMundo`; handle do X continua `@openai`
   **GREEN**: helper de exibição no catálogo RSS; card reader, matéria e popup passam a usá-lo
   **verify**: `node --experimental-strip-types --test scripts/rss-source-display.test.mjs`

**REFACTOR**: esconder o atalho "Abrir no X" quando a conta for RSS (o id não é um perfil no X).

## Acceptance Criteria

- [x] Byline de TecMundo não contém `r_9c68d283ae03`
- [x] Inicial do avatar RSS vem do título, não do id
- [x] Handle do X no reader continua com `@`
- [x] Testes novos e a suíte existente passam

## Resolution

Helper `displaySourceByline` no catálogo RSS. Card reader, matéria e popup usam o título (TecMundo); atalho X some para conta `r_*`. Browser em `:8182/?secao=brasil`: 0 hashes `r_` no HTML, byline `TecMundo` + inicial T, `@g1` intacto, matéria com label "Abrir matéria".
