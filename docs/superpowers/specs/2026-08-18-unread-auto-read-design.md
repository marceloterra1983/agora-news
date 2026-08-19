# Destaque automático de não-lido

Date: 2026-08-18

Baseline: `main@c82f3a2`

Status: awaiting user review before implementation

## 1. Goal

O traço de não-lido no feed Agora deixa de depender só de abrir `/materia/$id`.
O sistema infere leitura por impressão no feed e apaga o que sobrar depois de
12 horas neste aparelho.

O visual do traço não muda. A preferência `highlightUnread` continua só
escondendo o CSS.

## 2. State rule

Um post é não-lido só se as quatro forem verdade:

1. Já existe baseline neste aparelho.
2. O id não está em `agora-read-ids-v1`.
3. O id não está em `agora-seen-baseline-v1`.
4. Ainda não passaram 12 horas desde `firstUnreadAt` em `agora-unread-since-v1`.

`firstUnreadAt` é o instante em que o aparelho classificou o id como não-lido
pela primeira vez. Não é `publishedAt`: um post antigo que acaba de entrar no
feed ainda ganha destaque.

Sem `firstUnreadAt`, o post permanece não-lido e o scan grava `Date.now()`.
Não expira no mesmo instante. Se `firstUnreadAt > now` (relógio invertido),
permanece não-lido.

## 3. Persistence

Leitura é hábito do aparelho. As três chaves ficam no `localStorage` e **não**
entram no sync de prefs da nuvem.

| Key | Role |
|---|---|
| `agora-seen-baseline-v1` | Primeira visita: o que já está na tela não parece novo |
| `agora-read-ids-v1` | Lido explícito: abriu a matéria ou impressão válida |
| `agora-unread-since-v1` | Mapa `{ id: epochMs }` do primeiro não-lido |

Escrita:

- Scan do feed: se o post seria não-lido e não tem timestamp → grava `now`.
- `markRead(id)`: adiciona em `read` e apaga o timestamp.
- Prazo de 12h é cálculo em `isUnread`. Não grava “lido” só porque o relógio andou.
- `Esquecer o que já li` zera as três chaves.
- `read` mantém o cap atual (últimos 500 ids gravados).
- `unread-since` também cap 500, evictando o **menor** `epochMs`. Id evicto e
  ainda fora de `read` volta a ser “primeiro visto agora” no próximo scan.

Constantes em `src/lib/news/unread.ts`:

- `UNREAD_TTL_MS = 12 * 60 * 60 * 1000`
- `IMPRESSION_MS = 1500`
- `IMPRESSION_RATIO = 0.5`

Sem slider em Configurações. O hint “Marcar posts novos” passa a:
“Destaque some ao passar no feed ou após 12 horas.”

## 4. Impression observer

Um único `IntersectionObserver` no `Feed`, observando só artigos com
`data-unread="1"`. A variante reader de `StoryCard` expõe `data-story-id`.

Contagem:

1. Ratio ≥ 0,5 e `document.visibilityState === "visible"` → inicia timer de 1,5s.
2. Ratio cai, o card sai da tela, ou `visibilitychange` / `pagehide` → zera o timer daquele id.
3. Timer completa → `markRead(id)` (a mesma função da matéria).
4. Sem `IntersectionObserver` → só abertura da matéria + prazo de 12h.

Abrir `/materia/$id` marca na hora, sem esperar 1,5s.

O observer não roda em busca, salvos ou fontes. `highlightUnread=off` não
desliga o observer nem o estado; só esconde o traço.

## 5. Components

| Unit | Responsibility | Depends on |
|---|---|---|
| `unread.ts` | Regras, storage, constantes, `isUnread` / `markRead` / `seedBaseline` / `resetUnread` / `noteFirstUnread` | `localStorage`, `window` |
| `use-unread.ts` | Estado React + refresh no evento `agora-unread` / `storage` | `unread.ts` |
| `Feed` | `seedBaseline`, scan de `noteFirstUnread`, um observer | `use-unread` |
| `StoryCard` (reader) | `data-story`, `data-story-id`, traço visual | props `unread` |
| `materia.$id` | `markRead` no mount | `unread.ts` |
| Configurações | Toggle CSS + reset das três chaves + hint | `settings.ts`, `unread.ts` |

Helpers puros exportados de `unread.ts` (testáveis sem DOM de feed):

- `isUnreadNow({ hasBaseline, inRead, inBaseline, firstUnreadAt, now })`
- `impressionReady({ ratio, visible, elapsedMs })`

## 6. Edge cases

- Primeira visita: baseline como hoje; esses ids não ganham `firstUnreadAt`.
- Hydration: `isUnread` é false até `ready`.
- Quota do `localStorage`: escrita falha em silêncio, igual hoje; leitura não joga.
- Duas abas: o evento `storage` já existente atualiza as cores.
- Aba em segundo plano / PWA em background: timer pausa.
- Fling rápido: não marca.
- Busca/salvos: sem observer e sem traço, como hoje.

## 7. Out of scope

Slider de prazo, sync na nuvem, marcar lido em busca/salvos, mudar o visual
do traço, chip “Novo”.

## 8. Verification

`scripts/unread-status.test.mjs` importa os helpers de `unread.ts` e prova:

- sem baseline → não lido é false;
- id no baseline ou em `read` → false;
- `firstUnreadAt` há 11h59 → true; há 12h → false;
- sem timestamp → true (e o scan gravaria `now`);
- relógio invertido → true;
- `markRead` remove o timestamp;
- `resetUnread` zera as três chaves;
- `impressionReady` só é true com ratio ≥ 0,5, aba visível e elapsed ≥ 1500ms.

Contrato estático (grep no mesmo arquivo ou em `agora-now.test.mjs`):

- `Feed` cria um `IntersectionObserver`;
- card reader tem `data-story-id`;
- hint de Configurações menciona passar no feed e 12 horas.

Playwright em `scripts/accessibility-contract.test.mjs`:

- o caso atual continua: baseline fake + post novo mostra “Não lida”;
- caso extra: `agora-unread-since-v1` com timestamp de 13h no passado → o card
  não vem com `data-unread="1"`.

Não há teste de fling real no browser.

Depois dos testes focados: `npm test`, typecheck e lint do repo.

## 9. Rollout

Mudança só de cliente. Sem migration, sem restart de container, sem sync.
Rollback é reverter o JS: ids já gravados em `read` ou `unread-since` ficam
inofensivos.

verify: `test -f docs/superpowers/specs/2026-08-18-unread-auto-read-design.md && rg -n "UNREAD_TTL_MS|IMPRESSION_MS|agora-unread-since-v1" docs/superpowers/specs/2026-08-18-unread-auto-read-design.md`
