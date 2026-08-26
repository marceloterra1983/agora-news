-- Manual: execute no SQL Editor do Supabase antes do deploy da funcionalidade Vídeos.
-- NÃO vai em migrations/ — o bootstrap Neon/PGLite contém somente auth.
-- Idempotente: pode ser executado novamente sem recriar dados.

begin;

create table if not exists public.youtube_channels (
  channel_id text primary key,
  handle text not null,
  name text not null,
  avatar_url text,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.youtube_videos (
  video_id text primary key,
  channel_id text not null,
  title text not null,
  headline text not null,
  summary_pt text not null,
  watch_url text not null,
  thumbnail_url text not null,
  published_at timestamptz not null,
  duration_seconds integer,
  was_live boolean not null default false,
  caption_status text not null,
  created_at timestamptz not null default now()
);

-- Foreign key: youtube_videos.channel_id → youtube_channels.channel_id
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'youtube_videos_channel_fk'
      and conrelid = 'public.youtube_videos'::regclass
  ) then
    alter table public.youtube_videos
      add constraint youtube_videos_channel_fk
      foreign key (channel_id) references public.youtube_channels(channel_id)
      not valid;
  end if;
end $$;

-- Indexes para ordenação e filtro
create index if not exists youtube_videos_published_at_idx
  on public.youtube_videos (published_at desc);

create index if not exists youtube_videos_channel_published_idx
  on public.youtube_videos (channel_id, published_at desc);

-- Row Level Security: habilita e força RLS
alter table public.youtube_channels enable row level security;
alter table public.youtube_videos enable row level security;
alter table public.youtube_channels force row level security;
alter table public.youtube_videos force row level security;

-- Revoga permissões de anon/authenticated/public; só service_role pode acessar
revoke all on public.youtube_channels from public, anon, authenticated;
revoke all on public.youtube_videos from public, anon, authenticated;
grant all on public.youtube_channels to service_role;
grant all on public.youtube_videos to service_role;

-- Remove qualquer policy antiga das tabelas youtube. O backend usa somente a
-- chave service_role e lê diretamente sem policies.
do $$
declare item record;
begin
  for item in
    select schemaname, tablename, policyname
      from pg_policies
      where schemaname = 'public'
        and tablename in ('youtube_channels', 'youtube_videos')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      item.policyname,
      item.schemaname,
      item.tablename
    );
  end loop;
end $$;

commit;
