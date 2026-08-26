# Design: plano de melhoria (agora-news)

Data: 2026-08-26  
Tipo: roadmap — sem implementar neste passo  
Entrada: canvas 16/08 (26 itens) + plano DS 26/08 + cruzada de 4 especialistas

## Problema

O canvas de melhorias de 16/08 ainda aparece como “Now”, mas o HEAD já shippou a maior parte. Reabrir R1/R3/P2 é trabalho morto. O que ainda dói: toggle de push mente, matéria refetcha fxtwitter à toa, buzz de Fontes cai no tweet errado, e o idioma visual de grupo/first paint (plano DS) não começou.

## Decisão travada

**Now = 6 fatias, dois trilhos.** Sem dependência nova. Sem pasta extra. Chip de grupo 32px. Cor de grupo continua identidade. Não fundir `groupStyle`.

1. Verdade do produto (L1 leftover, R5, F3)
2. Visual (T1 → T2 → T3 do plano DS já escrito)

T4 (Input/toggle a11y) e o resto do DS ficam **Next**. P4/P5 e backfill em lote ficam **Later**.

## Especialista: Reader

Veredito: R1 R2 R3 R4 R6 mortos. P1 residual só em row antiga (hydrate cobre). **R5 parcial:** `article-view.tsx` tem `initialData` se o row já tem quote/assets, mas o `useQuery` ainda dispara `loadTweetEmbed` sempre.

Now: `enabled: false` quando `unpackMediaLabel` já trouxe mídia. Backfill de rows velhas = Later.

## Especialista: Fontes e pipeline

Veredito: F1 F2 F4 F5 P1 P2 P3 mortos (e04s08 + ingest atual). **F3 parcial:** `fonte-metrics.ts:100-101` ainda faz `rows.find(id) ?? rows[0]`. **P4 parcial:** lista sem `content`. **P5 parcial:** gtx fail-open grava EN como PT.

Now: só F3 (métrica mentirosa no card). P4/P5 = Later. Não reabrir ownership de watch.

## Especialista: Plataforma e DS

Veredito: L2 L3 mortos. **L1 parcial:** `subscribeWebPush` já olha `res.ok`, mas `enableFavoriteNotify` grava `ENABLED_KEY` e faz `void subscribeWebPush` — 403 sem login deixa o toggle ligado. T1–T4 do DS **todos vivos**; cabem como trilho Next **ou** T1–T3 no Now se o dono quiser visual agora.

Now: leftover L1. T1–T3 entram no Now deste roadmap (decisão abaixo). T4 = Next.

## Especialista: Produto / corte

Veredito: não reabrir o canvas 16/08. Prioridade de olho: T2/T3. T1 é 4px + hex. Perguntou se T1 entra no Now.

**Resposta da cruzada:** T1 entra — é o first frame de toda sessão e o contrato `grok-fontes-restore` já aponta o drift. É a fatia mais barata do DS.

## Fora / matar

Não reabrir: R1 R2 R3 R4 R6 F1 F2 F4 F5 F6 P1 P2 P3 L2 L3 L5 L6.  
Não fazer: Button, Toast, DESIGN.md, pasta `tokens/`, chip 44px, fundir `groupStyle`, varrer `text-[11px]`, ingest/auth/deploy/secrets.

## Sucesso do Now

1. Toggle “Avisar favoritos” só fica ligado se o POST de push passou (ou o UI pede login).
2. `/materia` não chama fxtwitter quando o row já tem quote/assets no `media_label`.
3. Buzz de Fontes não usa `rows[0]` se o `tweetId` do card não está nos 12.
4. Critical CSS = tokens; `--agora-header: 64px`.
5. Uma `--agora-hue-*`; joia no dock; wash no card; dark chip ≥ 3:1.
6. `GroupTag` ≥ 11px rem, wash, sem `text-[9px]`.
7. `npm test` verde ao fim de cada fatia.
