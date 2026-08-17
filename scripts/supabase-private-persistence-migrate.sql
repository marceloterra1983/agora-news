-- Manual: execute no SQL Editor do Supabase DEPOIS de supabase-domain-tables.sql.
-- Expand-only e idempotente: exporta antes de migrar e nunca apaga o legado.

begin;

create table if not exists public.legacy_synthetic_posts_export (
  source_table text not null,
  record_id text not null,
  category text not null default '',
  payload jsonb not null,
  exported_at timestamptz not null default now(),
  primary key (source_table, record_id)
);

alter table public.legacy_synthetic_posts_export enable row level security;
alter table public.legacy_synthetic_posts_export force row level security;
revoke all on public.legacy_synthetic_posts_export from public, anon, authenticated;
grant all on public.legacy_synthetic_posts_export to service_role;

insert into public.legacy_synthetic_posts_export (
  source_table,
  record_id,
  category,
  payload
)
select
  'posts',
  posts.post_id,
  coalesce(posts.category, ''),
  to_jsonb(posts)
from public.posts as posts
where posts.category in ('profile', 'watch', 'prefs', 'push', 'cache', 'x-last')
   or posts.post_id ~* '^(prfl_|watch_|last_|kv_|push_)'
on conflict (source_table, record_id) do nothing;

insert into public.legacy_synthetic_posts_export (
  source_table,
  record_id,
  category,
  payload
)
select
  'push_subscriptions',
  push_subscriptions.id,
  'unowned-push',
  to_jsonb(push_subscriptions)
from public.push_subscriptions as push_subscriptions
where push_subscriptions.user_id is null
   or btrim(push_subscriptions.user_id) = ''
on conflict (source_table, record_id) do nothing;

insert into public.x_profiles (
  handle,
  name,
  bio,
  summary_pt,
  avatar,
  followers,
  updated_at
)
select
  regexp_replace(payload->>'account', '^@+', ''),
  coalesce(nullif(payload->>'translation_pt', ''), payload->>'account'),
  coalesce(payload->>'content', ''),
  coalesce(payload->>'summary_pt', ''),
  nullif(payload->>'image_url', ''),
  case
    when payload->>'media_label' ~ '^[0-9]{1,10}$'
      then (payload->>'media_label')::integer
    else 0
  end,
  coalesce(
    (payload->>'updated_at')::timestamptz,
    (payload->>'posted_at')::timestamptz,
    now()
  )
from public.legacy_synthetic_posts_export
where source_table = 'posts'
  and (category = 'profile' or record_id ~* '^prfl_')
  and regexp_replace(payload->>'account', '^@+', '') ~ '^[A-Za-z0-9_]{1,15}$'
on conflict (handle) do update set
  name = coalesce(nullif(public.x_profiles.name, ''), excluded.name),
  bio = coalesce(nullif(public.x_profiles.bio, ''), excluded.bio),
  summary_pt = coalesce(nullif(public.x_profiles.summary_pt, ''), excluded.summary_pt),
  avatar = coalesce(public.x_profiles.avatar, excluded.avatar),
  followers = case
    when public.x_profiles.followers > 0 then public.x_profiles.followers
    else excluded.followers
  end;

with x_last as (
  select distinct on (lower(regexp_replace(payload->>'account', '^@+', '')))
    regexp_replace(payload->>'account', '^@+', '') as handle,
    substring(payload->>'post_url' from '/status/([0-9]+)') as status_id,
    coalesce(nullif(payload->>'summary_pt', ''), payload->>'content', '') as text,
    payload->>'post_url' as url,
    payload->>'posted_at' as published_at
  from public.legacy_synthetic_posts_export
  where source_table = 'posts'
    and (category = 'x-last' or record_id ~* '^last_')
  order by
    lower(regexp_replace(payload->>'account', '^@+', '')),
    (payload->>'posted_at')::timestamptz desc nulls last
)
insert into public.x_profiles (
  handle,
  name,
  last_post,
  updated_at
)
select
  handle,
  handle,
  jsonb_build_object(
    'id', status_id,
    'text', text,
    'url', url,
    'publishedAt', published_at
  ),
  coalesce(published_at::timestamptz, now())
from x_last
where handle ~ '^[A-Za-z0-9_]{1,15}$'
  and status_id is not null
  and published_at is not null
on conflict (handle) do update set
  last_post = coalesce(public.x_profiles.last_post, excluded.last_post);

do $$
declare
  item record;
  owner_id text;
  payload jsonb;
begin
  for item in
    select legacy.record_id, legacy.payload as exported
    from public.legacy_synthetic_posts_export as legacy
    where legacy.source_table = 'posts'
      and legacy.record_id like 'kv_prefs:%'
  loop
    owner_id := substring(item.record_id from '^kv_prefs:(.+)$');
    begin
      payload := (item.exported->>'content')::jsonb;
    exception when others then
      continue;
    end;
    if btrim(coalesce(owner_id, '')) <> ''
       and jsonb_typeof(payload) = 'object' then
      insert into public.user_prefs (user_id, prefs, updated_at)
      values (owner_id, payload, now())
      on conflict (user_id) do nothing;
    end if;
  end loop;
end $$;

do $$
declare
  item record;
  payload jsonb;
  owner_id text;
  endpoint_value text;
  p256dh_value text;
  auth_value text;
  handle_values text[];
begin
  for item in
    select legacy.record_id, legacy.category, legacy.payload as exported
    from public.legacy_synthetic_posts_export as legacy
    where legacy.source_table = 'posts'
      and (
        legacy.category = 'push'
        or legacy.record_id ~* '^push_'
        or legacy.record_id like 'kv_push:%'
      )
  loop
    begin
      payload := (item.exported->>'content')::jsonb;
    exception when others then
      continue;
    end;
    if jsonb_typeof(payload) <> 'object' then continue; end if;
    owner_id := coalesce(payload->>'userId', payload->>'user_id');
    endpoint_value := payload->>'endpoint';
    p256dh_value := payload#>>'{keys,p256dh}';
    auth_value := payload#>>'{keys,auth}';
    if btrim(coalesce(owner_id, '')) = ''
       or endpoint_value !~* '^https://([A-Za-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.apple\.com)(:443)?([/?#]|$)'
       or btrim(coalesce(p256dh_value, '')) = ''
       or btrim(coalesce(auth_value, '')) = '' then
      continue;
    end if;
    if jsonb_typeof(payload->'handles') = 'array' then
      select coalesce(array_agg(value), '{}') into handle_values
      from jsonb_array_elements_text(payload->'handles') as value;
    else
      handle_values := '{}';
    end if;
    insert into public.push_subscriptions (
      id,
      user_id,
      endpoint,
      p256dh,
      auth,
      handles,
      updated_at
    ) values (
      'push_' || right(regexp_replace(endpoint_value, '[^A-Za-z0-9]', '', 'g'), 48),
      owner_id,
      endpoint_value,
      p256dh_value,
      auth_value,
      handle_values,
      now()
    )
    on conflict (endpoint) do nothing;
  end loop;
end $$;

commit;

-- Manifesto exato e estável para captura pelo operador após cada execução.
select
  source_table,
  record_id,
  category,
  md5(payload::text) as payload_md5
from public.legacy_synthetic_posts_export
order by source_table, record_id;
