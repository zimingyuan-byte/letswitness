do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'posts_status_check'
  ) then
    alter table public.letswitness_posts
    drop constraint posts_status_check;
  end if;
end
$$;

alter table public.letswitness_posts
add constraint posts_status_check
check (
  status in (
    'draft',
    'pending',
    'verifying',
    'fulfilled',
    'unfulfilled',
    'partially_fulfilled',
    'expired'
  )
);
