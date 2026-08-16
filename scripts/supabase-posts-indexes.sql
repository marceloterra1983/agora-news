-- Manual: cole no SQL Editor do Supabase (projeto uqcaodtgrkphuhdkchyh) e rode uma vez.
-- NÃO vai em migrations/ — o bootstrap Neon/PGLite só tem auth. O feed vive no Supabase.

update public.posts
  set category = 'ai'
  where category is null
    and coalesce(batch_name, '') <> 'x-profile';

drop index if exists public.posts_posted_at_desc;
drop index if exists public.posts_category_posted;
drop index if exists public.posts_post_id;
drop index if exists public.posts_account;

create index if not exists posts_feed_ai_posted
  on public.posts (posted_at desc)
  where category = 'ai';

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

alter table public.x_profiles enable row level security;

drop policy if exists x_profiles_read on public.x_profiles;
create policy x_profiles_read on public.x_profiles
  for select using (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.posts;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

analyze public.posts;
