-- Manual: execute no SQL Editor do Supabase antes do deploy da aplicação.
-- NÃO vai em migrations/ — o bootstrap Neon/PGLite contém somente auth.
-- Idempotente: pode ser executado novamente sem recriar dados.

begin;

create table if not exists public.x_profiles (
  handle text primary key,
  name text not null default '',
  bio text not null default '',
  summary_pt text not null default '',
  avatar text,
  followers integer not null default 0,
  last_post jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_watches (
  user_id text not null,
  section text not null,
  handle text not null,
  name text not null default '',
  avatar text,
  summary text not null default '',
  followers integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, section, handle)
);

create table if not exists public.user_prefs (
  user_id text primary key,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id text primary key,
  user_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  handles text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- Compatibilidade expand-only com a tabela push antiga.
alter table public.push_subscriptions add column if not exists user_id text;
create unique index if not exists push_subscriptions_endpoint_idx
  on public.push_subscriptions (endpoint);
create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);
create index if not exists user_watches_owner_handle_idx
  on public.user_watches (user_id, handle);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'push_subscriptions_user_required'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_user_required
      check (user_id is not null and btrim(user_id) <> '') not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'push_subscriptions_provider_endpoint'
      and conrelid = 'public.push_subscriptions'::regclass
  ) then
    alter table public.push_subscriptions
      add constraint push_subscriptions_provider_endpoint
      check (
        char_length(endpoint) <= 2048
        and endpoint ~* '^https://([A-Za-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)(:443)?([/?#]|$)'
      ) not valid;
  end if;
end $$;

alter table public.push_subscriptions
  validate constraint push_subscriptions_provider_endpoint;

alter table public.x_profiles enable row level security;
alter table public.user_watches enable row level security;
alter table public.user_prefs enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.x_profiles force row level security;
alter table public.user_watches force row level security;
alter table public.user_prefs force row level security;
alter table public.push_subscriptions force row level security;

revoke all on public.x_profiles from public, anon, authenticated;
revoke all on public.user_watches from public, anon, authenticated;
revoke all on public.user_prefs from public, anon, authenticated;
revoke all on public.push_subscriptions from public, anon, authenticated;
grant all on public.x_profiles to service_role;
grant all on public.user_watches to service_role;
grant all on public.user_prefs to service_role;
grant all on public.push_subscriptions to service_role;

-- Remove qualquer policy antiga das tabelas de domínio. O backend usa somente a
-- chave service_role/sb_secret e sempre filtra novamente pelo Better Auth user_id.
do $$
declare item record;
begin
  for item in
    select schemaname, tablename, policyname
      from pg_policies
      where schemaname = 'public'
        and tablename in ('x_profiles', 'user_watches', 'user_prefs', 'push_subscriptions')
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
