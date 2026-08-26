# YouTube Videos section — design

Date: 2026-08-26
Repo: https://github.com/marceloterra1983/agora-news
Status: approved in conversation (architecture, data/flow, UI, tests)

After a Grok Bot summarizes a new YouTube video, persist the summary in the existing agora-news Supabase project and show it in a dedicated Vídeos section. The news RSS ingest and the news feed do not change.

## Goal

Marcelo gets a YouTube briefing in chat (already live for @DanielLopez) and the same briefing appears in agora-news under Vídeos, for several channels.

## Non-goals

- A new Supabase project
- YouTube ingest or summarization inside agora-news
- Storing full transcripts
- Storing thumbnail binaries (URL only)
- YouTube Shorts
- Summarizing or inserting a live still in progress
- Fancy search
- Mixing videos into the news feed
- Push notifications for videos (later)

## Architecture

Bot writes, app reads.

1. One or more Grok Bots watch channels, transcribe, summarize, then upsert into Supabase.
2. agora-news adds a Vídeos nav item that only reads those tables through the existing backend (service_role / secret key, same pattern as x_profiles).
3. News ingest, Better Auth, and the news feed stay untouched.

Several bots may write the same tables. Dedup is video_id.

## Schema

Manual SQL, same style as scripts/supabase-domain-tables.sql (not migrations/, which is Better Auth only). Idempotent. Apply only with Marcelo's ok.

### public.youtube_channels

- channel_id text PK (YouTube UC id)
- handle text not null (e.g. @DanielLopez)
- name text not null
- avatar_url text nullable
- enabled boolean not null default true
- updated_at timestamptz not null default now()

### public.youtube_videos

- video_id text PK (upsert key)
- channel_id text not null FK to youtube_channels.channel_id
- title text not null
- headline text not null (one-line what it is really about)
- summary_pt text not null (full PT-BR briefing)
- watch_url text not null
- thumbnail_url text not null (i.ytimg.com/vi/<id>/mqdefault.jpg)
- published_at timestamptz not null
- duration_seconds integer nullable
- was_live boolean not null default false
- caption_status text not null (ok or missing)
- created_at timestamptz not null default now()

Indexes: (published_at desc), (channel_id, published_at desc).

RLS: enable + force. Revoke anon / authenticated / public. Grant all to service_role only. No client-side writes.

## Data flow

1. Bot fetches channel RSS. Skip shorts. Skip video_id already in the table.
2. If still live / duration 0: skip; do not insert; do not mark seen.
3. When finished: get pt-BR captions. Chat briefing + mqdefault thumbnail. DB stores thumbnail URL only.
4. Upsert youtube_channels if needed. Insert youtube_videos on video_id. On conflict: do nothing.
5. If insert fails: chat summary still goes out; retry insert next run.
6. If captions missing: caption_status=missing, store title + link + thumbnail + a one-line note, not a fake briefing.

App times: America/Sao_Paulo.

## UI

New nav item Vídeos, same chrome as existing sections. Not a card on the news feed.

List: newest first. Card: thumbnail, channel name, title, headline, relative time. Filter by channel (all default).

Detail: full summary_pt, duration, Ao Vivo badge if was_live, button to watch_url.

Empty: Nenhum vídeo ainda.

No search in this slice.

## Error handling

- Duplicate video_id: unique constraint; upsert no-op
- Short: never inserted
- Live in progress: not inserted, not marked seen
- Missing captions: row with caption_status=missing, no invented body
- Supabase write fail: chat still sent; retry later
- Channel disabled: hidden from list; rows stay

## Testing

Honest, small, in-repo style (scripts/*.test.mjs). No mocks of auth, push, or news ingest just to stay green.

- video_id unique / second insert is a no-op
- shorts and in-progress lives never inserted
- Videos query does not appear in the news feed
- empty list copy
- channel filter returns only that channel
- npm test, typecheck, lint stay green

## Success

- New finished long-form or finished live from a watched channel becomes a row in youtube_videos and a card in Videos.
- News feed unchanged.
- Several channels can coexist; this bot only writes Daniel Lopez unless asked otherwise.

## Out of this spec

Implementation plan (writing-plans) comes after Marcelo reviews this file.
