-- Manual: cole no SQL Editor do Supabase (projeto uqcaodtgrkphuhdkchyh) e rode uma vez.
-- NÃO vai em migrations/ — o bootstrap Neon/PGLite só tem auth. O feed vive no Supabase.
-- Isola endpoints Web Push do SELECT anon em public.posts (category=push).
-- O app já tenta esta tabela via service-role; se ela não existir, grava em cloud-kv
-- (posts.category=cache, prefixo kv_push:) e NÃO escreve mais category=push.
-- Bloqueio: esta tabela NÃO existe em prod até este SQL ser aplicado à mão.

create table if not exists public.push_subscriptions (
  id text primary key,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  handles text[] not null default '{}',
  user_id text,
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

revoke all on public.push_subscriptions from anon, authenticated;
grant all on public.push_subscriptions to service_role;

drop policy if exists push_subscriptions_anon_read on public.push_subscriptions;
-- sem policy de SELECT para anon/authenticated — só service_role
