create table if not exists public.letswitness_post_follows (
  post_id uuid not null references public.letswitness_posts (id) on delete cascade,
  user_id uuid not null references public.letswitness_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index if not exists idx_letswitness_post_follows_user_created_at
  on public.letswitness_post_follows (user_id, created_at desc);

alter table public.letswitness_post_follows enable row level security;

create policy "post follows are publicly readable"
  on public.letswitness_post_follows
  for select
  using (true);

create policy "users can create their own post follows"
  on public.letswitness_post_follows
  for insert
  with check (auth.uid() = user_id);

create policy "users can delete their own post follows"
  on public.letswitness_post_follows
  for delete
  using (auth.uid() = user_id);
