-- Cole no SQL Editor do Supabase (projeto uqcaodtgrkphuhdkchyh) e rode uma vez.
-- Otimizado para as queries reais do app. post_id já é PRIMARY KEY — não criar índice extra nele.

-- 1) Dados limpos: feed só lê category = 'ai'. Null vira ruído no índice.
update public.posts
  set category = 'ai'
  where category is null
    and coalesce(batch_name, '') <> 'x-profile';

-- 2) Índice do feed + peek (order by posted_at desc limit N where category = 'ai').
--    Parcial = menor, mais cacheável, ignora linhas de perfil.
drop index if exists public.posts_posted_at_desc;
drop index if exists public.posts_category_posted;
drop index if exists public.posts_post_id;
drop index if exists public.posts_account;

create index if not exists posts_feed_ai_posted
  on public.posts (posted_at desc)
  where category = 'ai';

-- 3) Estatísticas para o planner escolher o índice (não seq scan).
analyze public.posts;
