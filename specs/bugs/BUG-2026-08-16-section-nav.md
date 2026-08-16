# BUG-2026-08-16T023400: seção some ao sair do feed

## Problem

- Trocar IA/Tech/Brasil em Fontes (ou em qualquer página que não seja o feed) joga o usuário de volta para `/`.
- Abrir Buscar, Salvos ou Config “esquece” a seção: o header volta para IA e as abas Feed/Fontes abrem `secao=ai`.
- Esperado: a seção atual permanece; no feed e em Fontes o seletor só troca o recorte, sem mudar de página.

## Root Cause Analysis

A seção vive só na URL de `/` e `/fontes`, mas o chrome sempre navegava para `/` e as outras rotas passavam `ai` fixo. `agora-last-secao` era gravado e nunca lido.

Security impact: NONE

Risk level: Low

## TDD Fix Plan

1. **RED**: `sectionNavTarget` e contratos do chrome
   **GREEN**: helper + chrome usa last-section e stay-on-page
   **verify**: `npm test`

## Acceptance Criteria

- [x] Em `/fontes`, trocar Tech permanece em Fontes
- [x] Em `/buscar`, o header mostra a última seção e Feed/Fontes reabrem essa seção
- [x] Chip Todos selecionado não some no fundo do header
- [x] `npm test` 66 + typecheck + lint 0 errors

## Resolution

Chrome passou a ler/gravar `agora-last-secao` e `sectionNavTarget` só navega em `/` e `/fontes`. Chip Todos ganhou anel visível.
