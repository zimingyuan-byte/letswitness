alter table public.letswitness_posts
add column if not exists post_type text;

update public.letswitness_posts
set post_type = 'tracking'
where post_type is null;

alter table public.letswitness_posts
alter column post_type set default 'tracking';

alter table public.letswitness_posts
alter column post_type set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'letswitness_posts_post_type_check'
  ) then
    alter table public.letswitness_posts
    add constraint letswitness_posts_post_type_check
    check (post_type in ('tracking', 'prediction'));
  end if;
end
$$;

alter table public.letswitness_posts
alter column source_name drop not null;
