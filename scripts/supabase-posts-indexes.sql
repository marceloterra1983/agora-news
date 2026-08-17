-- Manual: cole no SQL Editor do Supabase (projeto uqcaodtgrkphuhdkchyh) e rode uma vez.
-- NÃO vai em migrations/ — o bootstrap Neon/PGLite só tem auth. O feed vive no Supabase.

update public.posts
  set category = 'ai'
  where category is null
    and coalesce(batch_name, '') <> 'x-profile';

-- Keep existing indexes: this script is safe to re-run on production.
-- One category/date index serves ai, tech and brasil without redundant copies.
create index if not exists posts_category_posted_at_idx
  on public.posts (category, posted_at desc);

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
