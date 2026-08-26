# Seção Vídeos — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Implementar só depois do usuário aprovar este documento.

**Goal:** Grok Bot resume vídeos do YouTube (já funcionando para @DanielLopez em chat) e esses resumos aparecem numa seção dedicada Vídeos no agora-news. Feed de notícias e ingestão X ficam inalterados.

**Architecture:** Bot escreve, app lê. O Grok Bot upserta no Supabase; agora-news adiciona rotas `/videos` e `/videos/$videoId` que só leem via service_role (mesmo padrão de x_profiles). Sem ingestão/summarização/transcrição de YouTube dentro do agora-news.

**Tech Stack:** o que já está no repo (`node --test`, TanStack Start, Supabase REST service_role, SQL manual em scripts/). Sem pacote novo. Schema: duas tabelas (youtube_channels, youtube_videos) no projeto Supabase existente. Times: America/Sao_Paulo. Testes honestos (sem mock de auth/push/ingest).

## Defaults aprovados (2026-08-26)

Ciclo: **1 fase**. SQL: **manual idempotente em scripts/**. Bot: **escreve via contract documentado; implementação fora do repo**. Nav: **item Vídeos no chrome existente**. Feed: **nunca mistura vídeos**.

| # | Decisão | Travado | Alternativa rejeitada |
|---|---|---|---|
| 1 | Schema | Duas tabelas manuais: youtube_channels, youtube_videos | Migrations/ (é só Better Auth) |
| 2 | Ingestão | Bot externo POST via service_role (contract doc only) | YouTube ingest/LLM no agora-news |
| 3 | Supabase | Projeto existente; service_role read; RLS force | Projeto novo / anon write |
| 4 | Nav | Item Vídeos no AppChrome; rotas `/videos` e `/videos/$videoId` | Misturar com feed / nova UI |
| 5 | Transcrição | Bot só; app nunca transcreve | yt-dlp / subtitles no app |
| 6 | Thumbnail | URL só (i.ytimg.com); nunca binário | Armazenar imagens |
| 7 | Shorts / Lives | Bot skip; nunca insere até estar finished | Inserir tudo |
| 8 | Feed integração | Nunca aparecem em `/` (teste obrigatório) | Card unificado |

## Fora de escopo

Bot Grok (implementation de upsert é dele; aqui só o **contract** do POST), busca avançada, notificações push para vídeos (later), mixing vídeos no feed de notícias, transcrições completas (só summary_pt).

## Global Constraints

- `AGENTS.md`: sem pacote novo sem perguntar; sem migration sem perguntar; `npm test` (+ typecheck/lint se tocar TS) antes de pronto.
- SQL: idempotente, manual, em `scripts/supabase-youtube-tables.sql` (estilo `scripts/supabase-domain-tables.sql`). **Aplicar à prod só após humano aprovar e executar manualmente.**
- RLS: enable + force. Revoke anon/authenticated/public. Grant all to service_role.
- Indexes: `(published_at desc)`, `(channel_id, published_at desc)`.
- Times: `America/Sao_Paulo` na UI (reusar `formatRelativeTime` / `formatDate`).
- Dedup: `video_id` PK. Segundo upsert é no-op (on conflict do nothing).
- Nav: adicionar Vídeos ao chrome existente (AppChrome + TabBar pattern ou section nav se o design já prevê).
- Feed: teste obrigatório que `/` query **não** inclui `youtube_videos`.
- Teste: `scripts/*.test.mjs`, `node --test`. Sem mocks de auth/push/ingest de notícias só para ficar verde.

## File map

| File | Role |
|---|---|
| `scripts/supabase-youtube-tables.sql` | Schema idempotente: youtube_channels, youtube_videos + indexes + RLS |
| `scripts/youtube-schema.test.mjs` | Contract: SQL contém as duas tabelas, PKs, FKs, indexes, RLS grants |
| `src/lib/news/youtube-types.ts` | `YoutubeChannel`, `YoutubeVideo` types |
| `src/lib/news/youtube-read.ts` | Funções puras: filter/sort videos, filter by channel, hide disabled |
| `src/lib/news/server-youtube.ts` | Server fns: `loadVideos`, `loadVideoById` via service_role |
| `src/lib/news/supabase-youtube.ts` | Baixo nível: REST do Supabase para youtube_channels, youtube_videos |
| `src/routes/videos.tsx` | Lista: cards (thumbnail, channel, title, headline, reltime), filtro por canal |
| `src/routes/videos.$videoId.tsx` | Detalhe: summary_pt, duration, badge Ao Vivo, botão YouTube |
| `src/components/news/video-card.tsx` | Card: thumbnail, channel name, title, headline, relative time |
| `src/components/news/video-detail.tsx` | Detalhe: full summary_pt, metadata, CTA watch_url |
| `src/components/news/app-chrome.tsx` | Wire nav item Vídeos (ou section-nav se pattern diferente) |
| `scripts/youtube-read.test.mjs` | Unidade: filtro canal, enabled only, empty, video_id unique no-op |
| `scripts/youtube-routes.test.mjs` | Contract: rotas existem, copy vazio "Nenhum vídeo ainda." |
| `scripts/feed-video-isolation.test.mjs` | Contract: feed `/` não consulta youtube_videos |
| `scripts/youtube-bot-contract.md` | Documentação: como bot POST via service_role (fora de código) |

---

### Task 1: SQL idempotente + contract test

**Files:**
- Create: `scripts/supabase-youtube-tables.sql`, `scripts/youtube-schema.test.mjs`

**Contrato:** SQL cria `youtube_channels` (channel_id PK, handle, name, avatar_url, enabled, updated_at) e `youtube_videos` (video_id PK, channel_id FK, title, headline, summary_pt, watch_url, thumbnail_url, published_at, duration_seconds, was_live, caption_status, created_at). Indexes: `(published_at desc)`, `(channel_id, published_at desc)`. RLS: enable + force, revoke anon/authenticated/public, grant all to service_role. Idempotente: pode rodar N vezes sem erro. Test: parse SQL e assert presença de `create table if not exists`, PKs, FK, indexes, `enable row level security`, `grant all … to service_role`.

- [ ] **Step 1:** `scripts/supabase-youtube-tables.sql` (copiar estrutura de `supabase-domain-tables.sql`)
  - `begin; … commit;`
  - `create table if not exists public.youtube_channels (channel_id text primary key, handle text not null, name text not null, avatar_url text, enabled boolean not null default true, updated_at timestamptz not null default now())`
  - `create table if not exists public.youtube_videos (video_id text primary key, channel_id text not null, title text not null, headline text not null, summary_pt text not null, watch_url text not null, thumbnail_url text not null, published_at timestamptz not null, duration_seconds integer, was_live boolean not null default false, caption_status text not null, created_at timestamptz not null default now())`
  - FK: `alter table public.youtube_videos add constraint if not exists youtube_videos_channel_fk foreign key (channel_id) references public.youtube_channels(channel_id) not valid;`
  - Indexes: `create index if not exists youtube_videos_published_at_idx on public.youtube_videos (published_at desc);`
  - `create index if not exists youtube_videos_channel_published_idx on public.youtube_videos (channel_id, published_at desc);`
  - RLS: `alter table … enable row level security; force row level security;`
  - `revoke all on public.youtube_channels from public, anon, authenticated; grant all on public.youtube_channels to service_role;`
  - `revoke all on public.youtube_videos from public, anon, authenticated; grant all on public.youtube_videos to service_role;`
  - Drop policies antigas (mesmo do `supabase-domain-tables.sql`)
- [ ] **Step 2:** `scripts/youtube-schema.test.mjs` — parse SQL, assert `youtube_channels`, `youtube_videos`, `primary key`, `foreign key`, `create index`, `enable row level security`, `grant all … to service_role`
- [ ] **Step 3:** `node --experimental-strip-types --test scripts/youtube-schema.test.mjs` — PASS
- [ ] **Step 4:** Commit `test(youtube): lock SQL schema contract` + `feat(youtube): idempotent youtube tables SQL`

**Nota:** Não aplicar SQL à prod. Marcelo aplica manualmente quando aprovar.

---

### Task 2: Types + helpers puros

**Files:**
- Create: `src/lib/news/youtube-types.ts`, `src/lib/news/youtube-read.ts`, `scripts/youtube-read.test.mjs`

**Contrato:**

```ts
export type YoutubeChannel = {
  channel_id: string;
  handle: string;
  name: string;
  avatar_url: string | null;
  enabled: boolean;
  updated_at: string;
};

export type YoutubeVideo = {
  video_id: string;
  channel_id: string;
  title: string;
  headline: string;
  summary_pt: string;
  watch_url: string;
  thumbnail_url: string;
  published_at: string;
  duration_seconds: number | null;
  was_live: boolean;
  caption_status: string;
  created_at: string;
};

export type VideoWithChannel = YoutubeVideo & { channel?: YoutubeChannel };
```

`youtube-read.ts`: funções puras (sem I/O):

```ts
export function filterEnabledChannels(channels: YoutubeChannel[]): YoutubeChannel[];
export function filterVideosByChannel(videos: YoutubeVideo[], channelId: string | null): YoutubeVideo[];
export function sortByPublishedDesc(videos: YoutubeVideo[]): YoutubeVideo[];
export function attachChannelToVideos(videos: YoutubeVideo[], channels: YoutubeChannel[]): VideoWithChannel[];
```

- [ ] **Step 1:** Testes em `scripts/youtube-read.test.mjs`
  - disabled channel → hidden
  - filter by channel_id; null → all
  - sort published_at desc
  - empty list / single item
  - video_id duplicado em lista → dedup (ou deixar na camada Supabase; decisão: dedup no upsert)
- [ ] **Step 2:** `node --experimental-strip-types --test scripts/youtube-read.test.mjs` — FAIL
- [ ] **Step 3:** Implementar `youtube-types.ts` e `youtube-read.ts`
- [ ] **Step 4:** Re-run — PASS
- [ ] **Step 5:** Commit `test(youtube): lock filter and sort helpers` + `feat(youtube): pure video filter/sort`

---

### Task 3: Supabase REST + server functions

**Files:**
- Create: `src/lib/news/supabase-youtube.ts`, `src/lib/news/server-youtube.ts`
- Modify: `src/lib/news/supabase-rest.ts` (se precisar reusar headers; já tem `supabaseApiKeyHeaders`)

**Contrato:** `supabase-youtube.ts` faz REST do Supabase (service_role key, nunca anon). `server-youtube.ts` exporta `loadVideos` e `loadVideoById` (createServerFn).

```ts
// supabase-youtube.ts
export async function fetchYoutubeChannels(): Promise<YoutubeChannel[]>;
export async function fetchYoutubeVideos(opts?: { channelId?: string; limit?: number }): Promise<YoutubeVideo[]>;
export async function fetchYoutubeVideoById(videoId: string): Promise<YoutubeVideo | null>;

// server-youtube.ts
export const loadVideos = createServerFn({ method: "GET" })
  .validator((input?: { channelId?: string }) => ({ channelId: input?.channelId }))
  .handler(async ({ data }) => {
    const channels = await fetchYoutubeChannels();
    const enabled = filterEnabledChannels(channels);
    const videos = await fetchYoutubeVideos({ channelId: data.channelId, limit: 50 });
    return { videos: attachChannelToVideos(sortByPublishedDesc(videos), enabled), channels: enabled };
  });

export const loadVideoById = createServerFn({ method: "GET" })
  .validator((input: string) => input)
  .handler(async ({ data: videoId }) => {
    const video = await fetchYoutubeVideoById(videoId);
    if (!video) return null;
    const channels = await fetchYoutubeChannels();
    const channel = channels.find((c) => c.channel_id === video.channel_id);
    return { ...video, channel };
  });
```

Headers: reusar `supabaseApiKeyHeaders` de `supabase-rest.ts` com `process.env.SUPABASE_SERVICE_ROLE_KEY` (nunca PUBLISHABLE_KEY; service_role bypassa RLS). URL: `${SUPABASE_URL}/rest/v1/youtube_channels` e `/youtube_videos`.

- [ ] **Step 1:** Implementar `supabase-youtube.ts` (fetch com service_role headers)
- [ ] **Step 2:** Implementar `server-youtube.ts` (createServerFn, validação, chama fetch + helpers)
- [ ] **Step 3:** Teste behavior: se `SUPABASE_SERVICE_ROLE_KEY` vazio → throw. Se channel disabled → nunca retorna (pode ser unit fake). Limit default 50.
- [ ] **Step 4:** Commit `feat(youtube): server read via service_role`

**Nota:** Se Supabase prod ainda não tiver as tabelas, o fetch vai dar 404. OK — SQL é aplicado só no final.

---

### Task 4: Rotas UI (lista + detalhe)

**Files:**
- Create: `src/routes/videos.tsx`, `src/routes/videos.$videoId.tsx`, `src/components/news/video-card.tsx`, `src/components/news/video-detail.tsx`, `scripts/youtube-routes.test.mjs`

**Contrato:** `/videos` lista cards (thumbnail img, channel name, title, headline, reltime), filtro opcional `?canal=<channel_id>`. `/videos/$videoId` abre detalhe (full summary_pt, duration formatado, badge "Ao Vivo" se `was_live`, botão "Assistir no YouTube" para `watch_url`). Empty: "Nenhum vídeo ainda.". AppChrome com category padrão `ai` (ou section param; decisão: fixo `ai` porque vídeos não são por seção).

`video-card.tsx`:

```tsx
<div className="rounded-lg border border-line overflow-hidden">
  <img src={video.thumbnail_url} alt="" className="w-full aspect-video object-cover" />
  <div className="p-4">
    <p className="text-xs text-mute">{video.channel?.name || video.channel_id} · {formatRelativeTime(video.published_at)}</p>
    <h3 className="mt-1 font-semibold">{video.title}</h3>
    <p className="mt-1 text-sm text-ink-soft">{video.headline}</p>
  </div>
</div>
```

`video-detail.tsx`: summary_pt em parágrafos, duration `MM:SS` ou `HH:MM:SS`, badge "Ao Vivo" se `was_live`, botão externo YouTube.

Filtro: `<select>` ou chips de canal (todos + cada enabled channel).

- [ ] **Step 1:** `src/routes/videos.tsx` (loader `loadVideos`, search `{ canal?: string }`, grid de cards, filtro canais, empty "Nenhum vídeo ainda.")
- [ ] **Step 2:** `src/routes/videos.$videoId.tsx` (loader `loadVideoById`, params `{ videoId }`, ArticleView-style layout, VideoDetail)
- [ ] **Step 3:** `src/components/news/video-card.tsx` (thumbnail, channel, title, headline, reltime)
- [ ] **Step 4:** `src/components/news/video-detail.tsx` (summary_pt parágrafos, duration, badge, CTA YouTube)
- [ ] **Step 5:** `scripts/youtube-routes.test.mjs` — contract test: rotas exportam Route, copy "Nenhum vídeo ainda.", "Ao Vivo"
- [ ] **Step 6:** `node --experimental-strip-types --test scripts/youtube-routes.test.mjs` — PASS
- [ ] **Step 7:** Commit `feat(youtube): /videos list and detail routes`

---

### Task 5: Nav item Vídeos

**Files:**
- Modify: `src/components/news/app-chrome.tsx` (TabBar adiciona item Vídeos se design for tab; ou header nav se for section-based)
- Test: `scripts/section-nav.test.mjs` (se existir; senão novo `scripts/youtube-nav.test.mjs`)

**Contrato:** Item Vídeos aparece no chrome. Pattern: se TabBar tem Feed/Fontes/Buscar/Salvos, adicionar Vídeos como 5º item (icon: `Video` do lucide-react). Ou se AppChrome section switch tem IA/Tech/Brasil, Vídeos fica fora (rotas `/videos` são standalone, não por seção). **Decisão:** Vídeos é standalone como Salvos/Configurações — adicionar ao TabBar ou menu. Se TabBar já tiver 4 itens e não couber mais, colocar Vídeos no AppMenu (mesmo lugar de Configurações).

- [ ] **Step 1:** Verificar se TabBar tem espaço. Se sim: adicionar Vídeos (icon Video). Se não: adicionar link no AppMenu.
- [ ] **Step 2:** Testar navegação: clicar Vídeos → `/videos`; active state correto
- [ ] **Step 3:** Contract test: nav contém "Vídeos", link para `/videos`
- [ ] **Step 4:** Commit `feat(youtube): wire Vídeos nav item`

---

### Task 6: Feed isolation contract

**Files:**
- Create: `scripts/feed-video-isolation.test.mjs`
- Modify: nenhum (só teste que prova feed não mistura)

**Contrato:** Teste que query de `/` (loadNews / loadFeed) nunca consulta `youtube_videos`. Pode ser contract: assert que `supabase.ts` `LIST_SELECT` e `FULL_SELECT` não incluem colunas de youtube_videos, ou behavior se houver seed: inserir mock video, chamar loadNews, assert que video não aparece.

- [ ] **Step 1:** `scripts/feed-video-isolation.test.mjs` — assert que feed query não toca youtube_videos (parse SQL ou mock insert + fetch feed)
- [ ] **Step 2:** `node --experimental-strip-types --test scripts/feed-video-isolation.test.mjs` — PASS
- [ ] **Step 3:** Commit `test(youtube): lock feed isolation from videos`

---

### Task 7: Bot contract doc (não código)

**Files:**
- Create: `scripts/youtube-bot-contract.md`

**Contrato:** Markdown que explica como Grok Bot (ou qualquer bot) upserta. Não é teste executável, só documentação. Include: endpoint REST Supabase, service_role key, exemplos de POST `youtube_channels` (upsert on conflict update) e `youtube_videos` (on conflict do nothing), payload JSON, caption_status, was_live, skip shorts/lives em progresso. **Não implementar bot aqui** — só o contrato para quem for escrever bot fora do agora-news.

Conteúdo exemplo:

```markdown
# YouTube Bot Write Contract

Bot upserts via Supabase REST API usando `SUPABASE_SERVICE_ROLE_KEY`.

## Endpoints

- Channels: `POST ${SUPABASE_URL}/rest/v1/youtube_channels` com header `Prefer: resolution=merge-duplicates`
- Videos: `POST ${SUPABASE_URL}/rest/v1/youtube_videos` (on conflict do nothing no app; bot pode usar upsert mas segunda escrita é no-op)

## Channels payload

```json
{
  "channel_id": "UCxxx",
  "handle": "@DanielLopez",
  "name": "Daniel Lopez",
  "avatar_url": "https://yt3.ggpht.com/...",
  "enabled": true
}
```

## Videos payload

```json
{
  "video_id": "dQw4w9WgXcQ",
  "channel_id": "UCxxx",
  "title": "Título do vídeo",
  "headline": "Uma linha: sobre o que é realmente",
  "summary_pt": "Resumo completo em PT-BR...",
  "watch_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
  "published_at": "2026-08-26T10:00:00Z",
  "duration_seconds": 180,
  "was_live": false,
  "caption_status": "ok"
}
```

## Rules

- Skip Shorts (duration < 60s ou URL `/shorts/`).
- Skip live in progress (duration 0 ou isLiveBroadcast ainda true).
- Caption missing: `caption_status: "missing"`, summary_pt = one-line note (não inventar resumo).
- Dedup: `video_id` PK. Segundo insert é no-op (constraint).
```

- [ ] **Step 1:** Escrever `scripts/youtube-bot-contract.md` (endpoints, payloads, rules)
- [ ] **Step 2:** Commit `docs(youtube): bot write contract`

---

### Task 8: Gates do repo

- [ ] `npm test`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] Verificar no browser (sem SQL aplicado, mock ou skip): rotas `/videos` e `/videos/$videoId` renderizam, empty state, nav item Vídeos
- [ ] Commit leftovers da fase

Números do relatório = saída medida, não memória.

---

## Ordem e risco

```text
Task 1 SQL + test
Task 2 types/helpers      → 3 server read        → 4 rotas UI
Task 5 nav wire
Task 6 feed isolation
Task 7 bot contract doc
Task 8 gates
```

| Risco | Mitigação |
|---|---|
| SQL aplicado cedo e quebra prod | Manual só após gates; test contract antes |
| Vídeos aparecem no feed | Teste obrigatório `feed-video-isolation` |
| RLS errado expõe escrita anon | Revoke anon/authenticated; teste que só service_role escreve |
| Bot insere Shorts / lives em progresso | Contract doc explícito; responsabilidade do bot (fora daqui) |
| Thumbnail 404 | URL só; bot valida antes de inserir; fallback gray box no CSS |
| Times errados | Reusar `formatRelativeTime` / `formatDate` com America/Sao_Paulo |

## Zoom-out (módulos tocados)

| Módulo | Purpose | Callers | Contract |
|---|---|---|
| `supabase-youtube.ts` | Fetch youtube_channels, youtube_videos via service_role | server-youtube.ts | RLS bypassed; só service_role |
| `server-youtube.ts` | Server fns loadVideos, loadVideoById | rotas /videos | Enabled channels only; sorted desc |
| `youtube-read.ts` | Filter/sort puro | server-youtube | Sem I/O; testável em isolation |
| `videos.tsx` | Lista vídeos | Nav Vídeos | Empty "Nenhum vídeo ainda." |
| `videos.$videoId.tsx` | Detalhe vídeo | Card click | Summary completo, CTA YouTube |
| `app-chrome.tsx` | Nav item Vídeos | Usuário | Link standalone ou menu |

## Slopcheck

| Peça | Tag | Motivo |
|---|---|---|
| Duas tabelas manuais | `[OK]` | Estilo scripts/supabase-domain-tables.sql; idempotente |
| Service_role read | `[OK]` | Já usado em x_profiles; RLS force; sem anon write |
| Bot contract doc only | `[OK]` | Implementação do bot é fora; aqui só o contrato POST |
| Novo pacote (yt-dlp, etc) | `[SLOP]` até aprovação | AGENTS.md Ask first |
| Migration em migrations/ | `[SLOP]` | migrations/ é só Better Auth; SQL manual em scripts/ |
| Mixing vídeos no feed | `[SLOP]` | Spec explicit: não misturar; teste obrigatório de isolamento |

---

## Revisão 2026-08-26

Spec: `docs/superpowers/specs/2026-08-26-youtube-videos-section-design.md` (approved in conversation com Marcelo).

Pontos travados:
- Bot escreve, app lê. Sem ingestão YouTube no agora-news.
- Tabelas no projeto Supabase existente. SQL manual (não migrations/).
- Nav Vídeos standalone (não por seção IA/Tech/Brasil).
- Feed nunca mistura vídeos (teste obrigatório).
- Times America/Sao_Paulo.
- Teste honesto (sem mock de auth/push/ingest de notícias).

## Aplicação SQL e bot

**Human steps após merge:**

1. Marcelo aplica `scripts/supabase-youtube-tables.sql` no SQL Editor do Supabase prod (uma vez, idempotente).
2. Marcelo (ou outro) implementa Grok Bot seguindo `scripts/youtube-bot-contract.md` (POST via service_role key).
3. Bot roda e popula youtube_channels + youtube_videos.
4. App `/videos` lista os vídeos (zero código novo após merge; só SQL + bot seed).

**Não implementar o bot neste repo.** O plano entrega a infra (schema, rotas, UI) e o contrato de escrita.

## Veredito de prontidão

**READY** para `cursor/youtube-videos-section-7777` (ou branch equivalente) na ordem Task 1→8, com os contratos acima. SQL aplicado manualmente após merge e todos os gates passarem.
