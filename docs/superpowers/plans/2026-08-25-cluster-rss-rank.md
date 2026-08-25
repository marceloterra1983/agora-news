# Cluster + RSS + ranking — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Implementar só depois do usuário aprovar este documento.

**Goal:** O feed deixa de ser uma lista crua de posts X: agrupa cobertura duplicada, sobrevive se o fxtwitter falhar (RSS), e oferece ordenação explícita.

**Architecture:** Três fases que fazem ship sozinhas. Cluster e ranking são funções puras no *read path* — sem coluna nova, sem tabela, sem LLM, sem pacote novo. RSS reusa `public.posts` com `source: "rss"` e conta no charset do X (`r_` + 12 hex) porque `avatarInFilter` só aceita `/^[A-Za-z0-9_]{1,15}$/`.

**Tech Stack:** o que já está no repo (`node --test`, TanStack Start, Supabase REST, GTX). Parser RSS/Atom próprio + fixtures. Sem `fast-xml-parser`, sem embeddings.

## Defaults aprovados (2026-08-25)

Ciclo: **3 fases**. Unidade do feed: **head + “Também · …”**. RSS: **seed + `user_prefs`**. Schema/deps: **zero**. Ranking: **chips `?ordem=`**.

| # | Decisão | Travado | Alternativa rejeitada |
|---|---|---|---|
| 1 | Schema | Zero migration / zero coluna | `stories` table, `cluster_id` |
| 2 | Dependência | Zero pacote novo | `fast-xml-parser` / `rss-parser` |
| 3 | Unidade do feed | Card do *head* + “Também · @a · The Verge” | Rota `/historia/$id` / card expansível |
| 4 | Matéria | `/materia/$id` inalterado | Relacionados no detalhe (fase extra) |
| 5 | RSS | Seed editorial por seção + URL do dono em `user_prefs.rssFeeds` | `user_watches` (é handle X) |
| 6 | Ranking | `?ordem=recente\|seguindo\|importante`, default `recente` | Reorder silencioso / pular fase |
| 7 | Push RSS | Não no v1 | Alertas por feed |
| 8 | Offline SW | Fora (SW continua só push) | Workbox |

## Fora de escopo

Embeddings, viés Ground News, WebSub, API oficial do X, SW com `fetch`, crawl de 50k fontes, “IA que escreve notícia”.

## Global Constraints

- `AGENTS.md`: sem pacote novo sem perguntar; sem migration sem perguntar; `npm test` (+ typecheck/lint se tocar TS) antes de pronto.
- `avatarInFilter` (`src/lib/news/profile-store-core.mjs:66`) **não** alarga no v1. Conta RSS = `r_` + 12 hex do URL canônico (14 chars).
- `post_id` RSS = `rss_` + sha256(guid ou link canônico).slice(0, 24) — passa `isNewsRow` (não casa `last_`/`prfl_`).
- Coluna DB `source` = `"rss"`; `account` = id `r_…`. `Story.source` continua o handle (`r_…`) para catálogo/`inView`. `Story.sourceLabel` = título do feed (“The Verge”) — **exige ramo em `dbPostToStory`**, hoje sempre `` `@${account}` ``.
- Grupo RSS: taxonomia existente (`imprensa` / `tech-imprensa` / `br-jornais`), nunca `"sites"` (`catalogFor` descarta grupo fora de `groupOrderFor`).
- `MAX_RSS_ITEMS = 10` por feed por corrida. Não traduzir `content:encoded` / HTML de item — só `title` + `description`/`summary`/`atom:summary` truncados (RSS 2.0: filhos de `<item>` são todos opcionais; [spec](https://www.rssboard.org/rss-specification)).
- `CloudPrefs.rssFeeds` entra no **tipo + `snapshotPrefs` + merge**. `mergePrefsPreservingLlm` só preserva `_llm`; sem snapshot o próximo `pushCloudPrefs` apaga os feeds.
- Cluster só depois de `filterStoriesForCatalog` (privacidade owner-scoped permanece).
- Overfetch: `FEED_CLUSTER_FETCH = PAGE_SIZE * 2` (80). Devolve até `PAGE_SIZE` heads.
- Janela de cluster: `CLUSTER_WINDOW_MS = 4h`. Jaccard ≥ `0.45` **ou** mesmo URL canônico.
- `cluster.id` = id do membro mais antigo (estável quando entram fontes novas).
- Ingest X **não** chama fxtwitter para `r_*`.
- Se X falhar, RSS ainda roda no mesmo lease; cron único.
- Branch: `feat/cluster-rss-rank` (não commitar em `main`).

## File map

| File | Fase | Role |
|---|---|---|
| `src/lib/news/story-cluster.mjs` | 1 | `clusterStories`, `canonicalUrl`, `headlineTokens`, `jaccard` |
| `src/lib/news/cluster-seen.ts` | 1 | `agora-cluster-seen-v1`: membros já vistos → “N fontes novas” |
| `src/lib/news/supabase.ts` | 2 | `dbPostToStory`: label de `r_*` / `source=rss` |
| `src/lib/news/prefs-server.ts` | 2 | `CloudPrefs.rssFeeds` |
| `src/lib/news/prefs-sync.ts` | 2 | `snapshotPrefs` inclui `rssFeeds` |
| `src/lib/news/feed.ts` | 1 | Aplica cluster no payload |
| `src/lib/news/server-news.ts` | 1 | Overfetch + cluster; `hasMore` honesto |
| `src/lib/news/page-size.mjs` | 1 | Exporta `FEED_CLUSTER_FETCH` |
| `src/components/news/story-card.tsx` | 1 | `alsoFrom`, `freshCount` |
| `src/components/news/feed.tsx` | 1–3 | Passa chrome; aplica `ordem` |
| `src/lib/news/rss-id.mjs` | 2 | `rssAccountId(url)`, `rssPostId(guid\|url)` |
| `src/lib/news/rss-parse.mjs` | 2 | RSS 2.0 + Atom → itens normalizados |
| `src/lib/news/rss-catalog.mjs` | 2 | Seed por seção + merge prefs |
| `src/lib/news/rss-ingest.ts` | 2 | Conditional GET, translate, upsert |
| `src/lib/news/ingest.ts` | 2 | Orquestra X depois RSS; X fail ≠ abort RSS |
| `src/lib/news/server-catalog.ts` | 2 | Extras `r_*` no catálogo |
| `src/lib/news/ingest-scan.ts` | 2 | Skip `r_*` no fxtwitter |
| `src/lib/news/types.ts` | 1 | `StoryCluster` (tipo) |
| `src/lib/news/feed-rank.mjs` | 3 | `rankStories(stories, ordem, signals)` |
| `src/routes/index.tsx` | 3 | `validateSearch.ordem` |
| `scripts/story-cluster.test.mjs` | 1 | Unidade |
| `scripts/rss-parse.test.mjs` | 2 | Fixtures |
| `scripts/rss-ingest.behavior.test.mjs` | 2 | ETag, fail-closed, skip X |
| `scripts/feed-rank.test.mjs` | 3 | Ordem explícita |
| `scripts/fixtures/rss/*.xml` | 2 | RSS 2, Atom, 304 vazio, lixo |

---

### Task 1: Cluster puro (read-time)

**Files:**
- Create: `src/lib/news/story-cluster.mjs`, `scripts/story-cluster.test.mjs`
- Modify: nenhum UI ainda

**Interfaces:**
- Consumes: `Story` (`id`, `title`, `url`, `publishedAt`, `category`, `source`, `sourceLabel`)
- Produces:

```js
/** @typedef {{ id: string, head: Story, members: Story[], publishedAt: string }} StoryCluster */

export const CLUSTER_WINDOW_MS = 4 * 60 * 60 * 1000
export const CLUSTER_JACCARD = 0.45

export function canonicalUrl(url) { /* strip hash, utm_*, www., trailing / */ }
export function headlineTokens(title) { /* norm, drop stopwords PT/EN len<=2 */ }
export function jaccard(a, b) { /* token sets */ }
export function clusterStories(stories, now = Date.now()) { /* greedy desc */ }
```

Algoritmo greedy: ordenar por `publishedAt` desc. Cada story entra no primeiro cluster da **mesma seção** cujo `publishedAt` máximo está a ≤ 4h **e** (`jaccard(title) ≥ 0.45` **ou** `canonicalUrl` igual e não vazio). `cluster.id` = membro com `publishedAt` mais antigo. `head` = `richer` (reusar regra de `csv.ts`: imagem, título, body, url). Não fundir seções.

- [ ] **Step 1:** Testes em `scripts/story-cluster.test.mjs`
  - dois títulos quase iguais, 20 min, mesma seção → 1 cluster, 2 members
  - mesmo link canônico com UTM diferente → 1 cluster
  - 5h de diferença, títulos iguais → 2 clusters
  - seções `ai` vs `brasil` → nunca junta
  - `cluster.id` não muda quando entra um membro mais novo
  - lista vazia / um item
- [ ] **Step 2:** `node --experimental-strip-types --test scripts/story-cluster.test.mjs` — FAIL
- [ ] **Step 3:** Implementar `story-cluster.mjs` (sem I/O)
- [ ] **Step 4:** Re-run — PASS
- [ ] **Step 5:** Commit `test(cluster): lock headline and url grouping` + `feat(cluster): greedy story clusters`

---

### Task 2: Feed devolve clusters sem quebrar catálogo

**Files:**
- Modify: `src/lib/news/page-size.mjs`, `src/lib/news/feed.ts`, `src/lib/news/server-news.ts`, `src/lib/news/use-feed-older.ts`
- Test: `scripts/catalog-feed-scope.test.mjs`, `scripts/feed-more.test.mjs`, `scripts/public-catalog-privacy.behavior.test.mjs`, `scripts/agora-now.test.mjs`

**Contrato:** `loadNews` / `loadFeed` continuam expondo `stories: Story[]` — a lista é a dos **heads**. Chrome do cluster via campo opaco no próprio head (não muda o tipo `Story` de forma quebrante):

```ts
// em dbPostToStory / após cluster, anexar só no servidor/cliente de feed:
story.media = story.media // inalterado
// transportar no objeto (campo extra, não coluna DB):
(story as Story & { alsoFrom?: { source: string; sourceLabel: string }[]; clusterId?: string; memberIds?: string[] })
```

Não persistir isso no Supabase. `filterStoriesForCatalog` **antes** do cluster. Overfetch 80 → cluster → slice 40 heads. `hasMore` = raw fetched ≥ `FEED_CLUSTER_FETCH` **ou** heads > `PAGE_SIZE` antes do slice.

`useFeedOlder`: após concatenar páginas, **re-cluster** o conjunto visível (senão a mesma história parte no limite da página). Dedup por `cluster.id` / `head.id`.

Privacidade: teste existente de `lastGood` re-filtrado continua verde — cluster não pode ressuscitar post fora do catálogo.

- [ ] **Step 1:** Estender testes de catálogo: post fora do allowlist não aparece nem como `alsoFrom`
- [ ] **Step 2:** Overfetch + cluster em `loadFeed` / `loadNews` / older
- [ ] **Step 3:** `npm test` focado nos quatro arquivos — PASS
- [ ] **Step 4:** Commit `feat(feed): cluster heads after catalog filter`

---

### Task 3: UI “N fontes” + o que mudou

**Files:**
- Create: `src/lib/news/cluster-seen.ts`
- Modify: `src/components/news/story-card.tsx`, `src/components/news/feed.tsx`
- Test: `scripts/cluster-seen.test.mjs`, `scripts/agora-now.test.mjs`

**`cluster-seen.ts`:** chave `agora-cluster-seen-v1` = `{ [clusterId]: string[] memberIds }`. Local, sem sync (igual unread).

```ts
export const CLUSTER_SEEN_KEY = "agora-cluster-seen-v1"
export function freshMemberCount(clusterId: string, memberIds: string[]): number
export function markClusterSeen(clusterId: string, memberIds: string[]): void
```

Card: se `alsoFrom.length ≥ 1`, linha `Também · @a · The Verge`. Se `freshMemberCount > 0`, texto `N fontes novas` (não inventar “o que mudou” editorial). Impression do unread existente também chama `markClusterSeen`.

`/materia/$id` **não muda**. Clique no card continua no `head.id`.

- [ ] **Step 1:** Testes de `freshMemberCount` (primeira vista = 0; membro novo = 1; mark zera)
- [ ] **Step 2:** Wire card + feed
- [ ] **Step 3:** Contract `agora-now` — strings `fontes novas` / `Também`
- [ ] **Step 4:** Commit `feat(feed): show cluster sources and fresh count`

**Fase 1 shippable.** Feed X atual já fica menos repetitivo.

---

### Task 4: Identidade RSS + parser (sem pacote)

**Files:**
- Create: `src/lib/news/rss-id.mjs`, `src/lib/news/rss-parse.mjs`, `scripts/rss-parse.test.mjs`, `scripts/fixtures/rss/{rss2.xml,atom.xml,garbage.xml,empty.xml}`
- Modify: `scripts/dead-code-pwa.test.mjs` **não** lista os arquivos novos (o morto é `rss.ts`)

```js
export function rssAccountId(feedUrl) {
  // "r_" + sha256(canonicalUrl(feedUrl)).slice(0, 12)
  // deve passar /^[A-Za-z0-9_]{1,15}$/
}
export function rssPostId(guidOrLink) {
  return "rss_" + sha256(String(guidOrLink)).slice(0, 24)
}
export function parseFeedXml(xml, feedUrl) {
  // itens: { guid, title, link, publishedAt, summary }
  // RSS 2.0 item + Atom entry; ignora item sem link e sem guid
}
```

`sha256` = `node:crypto` no servidor; no teste node nativo. Não importar no bundle do browser.

- [ ] **Step 1:** Fixtures reais (mínimo 2 itens cada formato)
- [ ] **Step 2:** Testes: parse, guid estável, lixo → `[]` sem throw, `rssAccountId` casa o regex do `avatarInFilter`
- [ ] **Step 3:** Implementar
- [ ] **Step 4:** PASS + commit `feat(rss): parse rss2/atom and stable ids`

---

### Task 5: Catálogo RSS + ingest no cron

**Files:**
- Create: `src/lib/news/rss-catalog.mjs`, `src/lib/news/rss-ingest.ts`, `scripts/rss-ingest.behavior.test.mjs`
- Modify: `src/lib/news/ingest.ts`, `src/lib/news/server-catalog.ts`, `src/lib/news/ingest-scan.ts`, `src/lib/news/use-section-catalog.ts`, `src/lib/news/supabase.ts` (`dbPostToStory`), `src/lib/news/cache.ts` (`CACHE_KEYS.rssEtag`)

**Seed inicial** (probe 2026-08-25; revalidar no implement):

| Seção | Feed canônico | Título | Grupo | Probe |
|---|---|---|---|---|
| ai | `https://openai.com/news/rss.xml` | OpenAI | `imprensa` | 200, RSS2, **1144 items** → cap 10 |
| ai | `https://huggingface.co/blog/feed.xml` | Hugging Face | `imprensa` | 200, RSS2, 847 items → cap 10 |
| tech | `https://www.theverge.com/rss/index.xml` | The Verge | `tech-imprensa` | 200, **Atom**, 10 entries |
| tech | `https://feeds.arstechnica.com/arstechnica/index` | Ars Technica | `tech-imprensa` | 200, RSS2, 20 items |
| brasil | *(G1 tech está vazio — 0 items. Não commitar.)* | — | — | 200, channel sem `<item>` |
| brasil | `https://rss.tecmundo.com.br/feed` | TecMundo | `br-jornais` | 200, RSS2, 40 items + `content:encoded` |
| brasil | Segundo feed: validar `https://www.canaltech.com.br/rss/` ou equivalente **antes** do commit; se 4xx, um seed BR basta no v1 | | `br-jornais` | pending |

Prefs do dono (sem tabela nova):

```ts
// user_prefs.prefs.rssFeeds?: { url: string, section: string, title: string }[]
```

`rssCatalogFor(section, prefs)` → extras `{ handle: rssAccountId(url), name: title, section, group }` com group da tabela acima. `serverCatalogFor` **e** `useSectionCatalog` juntam seed + prefs (senão `inView` no grupo some o RSS). `dbPostToStory`: se `p.source === "rss"` ou account `r_*`, `sourceLabel = name do catálogo` (fallback host), nunca `@r_abc`.

`runRssIngest` (mesmo `assertOwned` do lease):

1. Lista feeds (seed ∪ prefs), skip se `latestByAccount` do `r_*` < 15 min (pode reusar mapa).
2. `GET` com `If-None-Match` / `If-Modified-Since` do cache `agora:v2:rss:{account}`.
3. 304 → não upsert.
4. Parse → no máx. `MAX_RSS_ITEMS` mais novos → `existingIds` → `translateToPt` só título + sinopse curta (nunca `content:encoded`) → `upsertPosts` com `source: "rss"`.
5. Falha de um feed **não** aborta os outros; log + segue.
6. Sem push.

`runIngest`:

```ts
const x = await runOwnedXIngest(...).catch((e) => ({ ok: false, error: e }))
const rss = await runRssIngest({ assertOwned })
if (!x.ok && !rss.written) throw new Error("ingest_failed")
```

`handlesToScan`: filtrar `!/^r_[a-f0-9]{12}$/i.test(h)` antes de `statusesFor`.

- [ ] **Step 1:** Behavior tests: 304 sem write; XML lixo sem throw; `r_*` nunca chama fxtwitter; X throw + RSS write → `ok` sem `ingest_failed`
- [ ] **Step 2:** Implementar ingest + catalog merge
- [ ] **Step 3:** Não ampliar `avatarInFilter`; teste `accountInFilter` inclui `r_*` de 14 chars
- [ ] **Step 4:** Commit `feat(rss): ingest feeds as r_ accounts`

---

### Task 6: Fontes — listar e adicionar RSS

**Files:**
- Modify: `src/routes/fontes.tsx`, `prefs-server.ts`, `prefs-sync.ts`, `scripts/review-closeout.test.mjs` (CloudPrefs passa a listar `rssFeeds`)
- Test: `scripts/rss-prefs.test.mjs`

UI mínima: bloco “Sites” na seção atual. Seed = só leitura. Dono autenticado: input URL + adicionar. Validar `https://`, parse uma vez no server, gravar em `prefs.rssFeeds`. Remover só os que o dono adicionou.

Não misturar com estrela de handle X no v1 (pode entrar em `importante` depois via `r_*` no catálogo).

- [ ] **Step 1:** Teste prefs: URL http rejeitada; duplicata canônica rejeitada; remove só owned
- [ ] **Step 2:** UI + server write
- [ ] **Step 3:** Commit `feat(fontes): owner rss feed urls in prefs`

**Fase 2 shippable.** Se fxtwitter cair, seed RSS ainda enche `ai`/`tech`/`brasil` e o `/api/health` pode continuar verde.

---

### Task 7: Ranking explícito

**Files:**
- Create: `src/lib/news/feed-rank.mjs`, `scripts/feed-rank.test.mjs`
- Modify: `src/routes/index.tsx`, `src/components/news/app-chrome.tsx` (ou chip no `Feed`), `src/lib/news/feed.ts` se rank no servidor — **preferir cliente** para usar unread/starred locais

```js
/** @typedef {"recente" | "seguindo" | "importante"} FeedOrdem */

export function rankStories(stories, ordem, signals) {
  // recente: publishedAt desc (hoje)
  // seguindo: starred ∪ watch extras primeiro, depois publishedAt
  // importante:
  //   recency = 1 / (1 + hours/6)
  //   + 2 * alsoFrom.length
  //   + 3 se source em starred/watch
  //   + 1 se image
  //   - 2 se já lido (unread.isUnread === false && has baseline)
  // estável: empate → publishedAt desc → id
}
```

`?ordem=` no `validateSearch` (mesmo padrão de `fontes?sort=`). Default omitido = `recente`. Chip no chrome: Recente / Seguindo / Importante. Sem copy de “por que o algoritmo”. No card de `importante`, se `alsoFrom.length ≥ 1`, a linha “N fontes” **já** é a explicação.

- [ ] **Step 1:** Testes das três ordens + estabilidade
- [ ] **Step 2:** Search param + chips + apply no `Feed` **depois** do group filter
- [ ] **Step 3:** Commit `feat(feed): explicit recente/seguindo/importante sort`

**Fase 3 shippable.**

---

### Task 8: Gates do repo

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] Verificar no browser: home `ai`/`tech`/`brasil`, cluster visível, `?ordem=importante`, fontes adiciona RSS, cron/ingest local se houver
- [ ] Commit leftovers da fase + land (`feat/cluster-rss-rank`)

Números do relatório = saída medida, não memória.

---

## Ordem e risco

```text
Task 1 cluster puro     → 2 feed         → 3 UI          [fase 1]
Task 4 parser           → 5 ingest/cron  → 6 fontes UI   [fase 2]
Task 7 ranking                                            [fase 3]
Task 8 gates
```

| Risco | Mitigação |
|---|---|
| Cluster esconde item do allowlist | Catalog filter **antes**; teste de privacidade |
| `r_*` no fxtwitter | Skip explícito + teste |
| `avatarInFilter` dropa RSS | id 14 chars no charset X + teste |
| Health vermelho se só X cair | RSS escreve nas 3 seções |
| Overfetch muda `hasMore` | Contrato em `feed-more` / `agora-now` |
| Parser frágil | Fixtures + lixo → `[]` |

## Zoom-out (módulos tocados)

| Módulo | Purpose | Callers | Contract |
|---|---|---|---|
| `feed.ts` / `loadNews` | Lista da home | `index.tsx`, `/api/feed`, React Query | Catálogo owner-scoped; `live` honesto |
| `ingest.ts` | Escreve `public.posts` | `/api/ingest`, cron | Lease; fail-closed X; agora RSS paralelo |
| `section-catalog.mjs` | Allowlist por seção | feed, UI, ingest scan | Handle ∈ catalog |
| `avatarInFilter` | PostgREST `in.` | `downloadSupabase` | Só `[A-Za-z0-9_]{1,15}` |
| `unread.ts` | Destaque local | Feed, matéria | Não sincroniza; cluster-seen no mesmo espírito |

## Slopcheck

| Peça | Tag | Motivo |
|---|---|---|
| Parser RSS próprio | `[OK]` | Escopo RSS2/Atom; sem dep |
| `fast-xml-parser` | `[SLOP]` até aprovação | AGENTS.md Ask first |
| Embeddings / tabela `stories` | `[SLOP]` | Prematuro; Reason for Depth vazia |
| `user_prefs.rssFeeds` | `[OK]` | JSON já existe; sem migration |

---

## Revisão 2026-08-25

Auditoria: `specs/PLAN-AUDIT_LATEST.md`. Impacto: `specs/IMPACT-2026-08-25-cluster-rss-rank.md`.  
Patches de fato (G1 morto, OpenAI 1144 items, `dbPostToStory`, prefs wipe, grupo `sites`) já aplicados neste arquivo.

## Veredito de prontidão

**READY** para `feat/cluster-rss-rank` na ordem Task 1→8, com os contratos acima.
