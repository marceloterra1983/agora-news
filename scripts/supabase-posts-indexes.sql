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
