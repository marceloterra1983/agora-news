---
bug_id: BUG-2026-08-27T193800
status: in_progress
severity: medium
scope: ui-fontes
title: Foto da fonte X não é a da conta — OpenAI mostra o Greg
---

# BUG-2026-08-27T193800: Avatar da fonte herdado do tweet alheio no timeline

## Problem

- Na lista Fontes, a conta **OpenAI** (marca X, grupo Empresas) mostra a foto de Greg Brockman, a bio “President & Co-Founder @OpenAI” e ~1,0 mi de seguidores.
- Esperado: foto, bio e alcance da conta **@OpenAI** no X (hoje ~5,1 mi e a foto oficial do perfil), não do tweet de outra pessoa que aparece no timeline.

Como reproduzir: abrir `/fontes` na seção IA; a 3ª row “OpenAI” com ícone X.

Security impact: NONE — no security exploit path identified. São URLs públicas de avatar do X.

Recurrence: related to the Aug 19 / `profileFieldsFromAuthor` guard (não copiar author se `screen_name` ≠ handle). Aquele guard impede roubo *novo* quando o author é estrangeiro, mas não escolhe o tweet certo, não evicta veneno já gravado e o persist dos últimos posts regrava a foto velha a cada cron.

## Reproduce

1. `GET https://api.fxtwitter.com/2/profile/OpenAI/statuses?count=10` — o primeiro item com texto é author `gdb` (não marcado como retweet).
2. `GET https://api.fxtwitter.com/OpenAI` — user oficial: screen `OpenAI`, ~5,1 mi, avatar distinto do Greg.
3. `x_profiles` em 2026-08-27 19:30 UTC: `OpenAI` e `gdb` compartilham o mesmo `profile_images/1347621377503711233` e a mesma bio; followers OpenAI ≈ 1,037 mi (escala do Greg, não da empresa).
4. O mesmo padrão aparece em outras contas (ex.: `elonmusk` gravado como clube Tesla ~1,4 mi vs perfil ao vivo ~241 mi).

## Isolate

- A hidratação da lista Fontes pinta `row.avatar` a partir do perfil persistido (sem refetch ao vivo).
- O cron monta o perfil com o **primeiro** status do timeline (`id` + `text`), não com o primeiro status **da própria conta**.
- O endpoint de statuses do perfil mistura posts de outras contas (gdb, ChatGPT, …) no feed da OpenAI.
- Se o author não é o handle, o guard mantém `prev.avatar`. Uma vez roubado, fica.
- O persist dos 10 últimos posts faz upsert do perfil inteiro com esse `prev.avatar` e renova `updated_at`, o que bloqueia o refresh de 7 dias.
- O enrich ao vivo só grava se o perfil **não tem** avatar — foto errada impede a correção.

## Hypothesize

| # | Hipótese | Falsificação | Resultado |
|---|----------|--------------|-----------|
| H1 | A foto oficial do @OpenAI no X é o Greg | User endpoint / tweets próprios da OpenAI teriam o mesmo hash `bHg3ipfD` | Falsa: user e tweets próprios usam outro hash; só o 1º item do timeline é o Greg |
| H2 | Join RSS/X pelo nome “OpenAI” pega o avatar do RSS ou de outra row | Row X teria handle `r_*` ou favicon | Falsa: handle `OpenAI`, marca X, 1,0 mi |
| H3 | Timeline misto + 1º status + prev sticky + upsert de last-post | Trocar o author para o primeiro `screen_name` da conta e evictar prev que copia a face estrangeira | Confirmada pelos payloads e pelo `x_profiles` |

## Verify

Causa raiz única: o contrato de “perfil da fonte” usa o author do primeiro item do timeline misto e depois recopia esse estado em todo persist. A foto da UI está certa em relação ao banco; o banco está errado em relação à conta.

Risk level: Medium — afeta qualquer conta cujo timeline venha misturado (empresas e celebridades).

## TDD Fix Plan

1. **RED**: timeline `[gdb, OpenAI, ChatGPT]` deve devolver o author OpenAI, não o Greg; prev com a face do Greg + author gdb deve zerar a foto
   **GREEN**: helper de author dono do handle; evicção quando a face persistida é a do author estrangeiro
   **verify**: `node --experimental-strip-types --test scripts/ingest-profile-core.test.mjs`

2. **RED**: ingest e persist de last-post usam o author dono, não o primeiro status
   **GREEN**: o cron passa o author filtrado; last-post da conta não pinta face alheia
   **verify**: `node --experimental-strip-types --test scripts/ingest-profile-core.test.mjs scripts/profile-last.test.mjs`

**REFACTOR**: sem pasta nova; o enrich continua só preenchendo buraco — a correção acontece no persist que já roda em todo handle devido.

## Acceptance Criteria

- [ ] OpenAI não persiste a face/bio/followers do gdb a partir de um timeline misto
- [ ] Face já roubada (mesmo hash do author estrangeiro) é evictada
- [ ] Ingest não lê `list.find` cru para montar o perfil
- [ ] Testes novos e a suíte existente passam
