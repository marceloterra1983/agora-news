# YouTube Bot Write Contract

Bot upserts via Supabase REST API usando `SUPABASE_SECRET_KEY` (service_role).

## Endpoints

- **Channels:** `POST ${SUPABASE_URL}/rest/v1/youtube_channels` com header `Prefer: resolution=merge-duplicates`
- **Videos:** `POST ${SUPABASE_URL}/rest/v1/youtube_videos` (on conflict do nothing no app; bot pode usar upsert mas segunda escrita é no-op)

## Headers obrigatórios

```
apikey: ${SUPABASE_SECRET_KEY}
Content-Type: application/json
Authorization: Bearer ${SUPABASE_SECRET_KEY}
Prefer: resolution=merge-duplicates (para channels), return=minimal (para ambos)
```

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

**Notas:**
- `channel_id` é a PK. Upsert via `Prefer: resolution=merge-duplicates` atualiza o registro se já existir.
- `enabled`: se `false`, o canal não aparece no filtro da lista (app filtra no read).
- `avatar_url` é opcional (pode ser `null`).

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

**Notas:**
- `video_id` é a PK. Constraint unique; segundo insert é no-op (on conflict do nothing).
- `channel_id` deve existir em `youtube_channels` (FK constraint).
- `headline`: uma linha que descreve sobre o que é realmente o vídeo (não apenas o título).
- `summary_pt`: resumo completo em PT-BR. Quebre parágrafos com `\n\n`.
- `thumbnail_url`: URL da thumbnail (i.ytimg.com/vi/<id>/mqdefault.jpg). App nunca armazena binário.
- `duration_seconds`: duração do vídeo em segundos. Pode ser `null` se desconhecido.
- `was_live`: `true` se foi uma transmissão ao vivo (exibe badge "Ao Vivo" no app).
- `caption_status`: `"ok"` se legendas PT-BR disponíveis, `"missing"` se não.

## Rules (Bot-side)

1. **Skip Shorts:** Vídeos com duração < 60s ou URL contendo `/shorts/` não devem ser inseridos.
2. **Skip live em progresso:** Se `isLiveBroadcast` ainda `true` ou `duration` é 0, não inserir. Aguardar término.
3. **Legendas ausentes:** Se captions PT-BR não disponíveis:
   - `caption_status: "missing"`
   - `summary_pt`: uma nota de uma linha (ex: "Legendas não disponíveis para este vídeo."), não inventar resumo.
4. **Dedup:** `video_id` é PK. Bot deve verificar se já existe antes de tentar inserir (economiza requests), mas segundo POST é no-op (constraint).
5. **Upsert channels:** Sempre upsert `youtube_channels` antes de inserir `youtube_videos` (FK constraint exige que `channel_id` exista).
6. **Retry em falha:** Se insert falha (ex: rede, constraint), o resumo de chat ainda deve ser enviado. Bot retenta insert na próxima corrida.

## Exemplo de fluxo Bot

1. Fetch channel RSS (`https://www.youtube.com/feeds/videos.xml?channel_id=UCxxx`).
2. Para cada vídeo novo:
   - Se short ou live em progresso: skip, não marcar como seen.
   - Se finalizado: obter captions PT-BR.
   - Gerar resumo via LLM (ex: Grok).
   - Upsert `youtube_channels` (se ainda não existe).
   - Insert `youtube_videos` (on conflict do nothing se `video_id` já existe).
   - Enviar resumo para chat (Grok Bot).
3. Se insert falha: log, mas chat vai out. Retry no próximo run.

## App read pattern

- App lê via `SUPABASE_SECRET_KEY` (service_role, bypassa RLS).
- RLS está habilitado e forçado, mas grant all para service_role (nenhum anon/authenticated pode ler/escrever).
- Tabelas: `youtube_channels`, `youtube_videos`.
- Indexes: `(published_at desc)`, `(channel_id, published_at desc)`.

## Times

- `published_at`: ISO 8601 UTC (ex: `2026-08-26T10:00:00Z`).
- App formata para `America/Sao_Paulo` na UI (relative time).

## Exemplos de chamadas (curl)

### Upsert channel

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/youtube_channels" \
  -H "apikey: ${SUPABASE_SECRET_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=minimal" \
  -d '{
    "channel_id": "UCxxx",
    "handle": "@DanielLopez",
    "name": "Daniel Lopez",
    "avatar_url": null,
    "enabled": true
  }'
```

### Insert video

```bash
curl -X POST "${SUPABASE_URL}/rest/v1/youtube_videos" \
  -H "apikey: ${SUPABASE_SECRET_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SECRET_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=minimal" \
  -d '{
    "video_id": "dQw4w9WgXcQ",
    "channel_id": "UCxxx",
    "title": "Never Gonna Give You Up",
    "headline": "Classic 80s pop hit",
    "summary_pt": "Música pop dos anos 80 de Rick Astley...",
    "watch_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
    "published_at": "2009-10-24T00:00:00Z",
    "duration_seconds": 213,
    "was_live": false,
    "caption_status": "ok"
  }'
```

## Verificação

Após bot inserir dados, verificar no Supabase SQL Editor:

```sql
SELECT * FROM public.youtube_channels ORDER BY updated_at DESC LIMIT 5;
SELECT * FROM public.youtube_videos ORDER BY published_at DESC LIMIT 10;
```

Ou via app (após merge e deploy):

```
https://<domain>/videos
```

## Troubleshooting

- **403 Forbidden:** `SUPABASE_SECRET_KEY` incorreta ou ausente.
- **404 Not Found:** Tabelas não existem (SQL não aplicado).
- **409 Conflict:** PK duplicado (esperado; segunda inserção é no-op).
- **Foreign key violation:** `channel_id` não existe em `youtube_channels` (upsert channel primeiro).
- **Missing captions:** Não inventar resumo; usar `caption_status: "missing"` e nota de uma linha.

## Contato

Bot implementado fora do repo agora-news. Dúvidas sobre o schema/contract: Marcelo Terra.
