create extension if not exists pgcrypto;

create table if not exists public.letswitness_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username is null or username ~ '^[A-Za-z0-9_]{3,32}$')
);

create table if not exists public.letswitness_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.letswitness_profiles (id) on delete cascade,
  title text not null,
  description text not null,
  source_name text not null,
  status text not null default 'pending',
  credibility_score integer not null default 50,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_status_check check (
    status in ('pending', 'verifying', 'fulfilled', 'unfulfilled', 'partially_fulfilled', 'expired')
  )
);

create table if not exists public.letswitness_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table if not exists public.letswitness_post_tags (
  post_id uuid not null references public.letswitness_posts (id) on delete cascade,
  tag_id uuid not null references public.letswitness_tags (id) on delete cascade,
  primary key (post_id, tag_id)
);

create table if not exists public.letswitness_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.letswitness_posts (id) on delete cascade,
  media_type text not null,
  storage_path text not null,
  public_url text,
  file_size bigint,
  created_at timestamptz not null default now(),
  constraint post_media_type_check check (media_type in ('image', 'audio', 'video'))
);

create table if not exists public.letswitness_verification_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.letswitness_posts (id) on delete cascade,
  type text not null,
  title text not null,
  description text not null,
  target_date date,
  deadline date,
  status text not null default 'waiting',
  triggered_at timestamptz,
  triggered_by uuid references public.letswitness_profiles (id) on delete set null,
  evidence_url text,
  created_at timestamptz not null default now(),
  constraint verification_events_type_check check (type in ('time_point', 'event_trigger')),
  constraint verification_events_status_check check (status in ('waiting', 'triggered', 'resolved', 'expired'))
);

create table if not exists public.letswitness_credibility_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.letswitness_posts (id) on delete cascade,
  user_id uuid not null references public.letswitness_profiles (id) on delete cascade,
  value boolean not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.letswitness_verification_votes (
  id uuid primary key default gen_random_uuid(),
  verification_event_id uuid not null references public.letswitness_verification_events (id) on delete cascade,
  user_id uuid not null references public.letswitness_profiles (id) on delete cascade,
  result text not null,
  created_at timestamptz not null default now(),
  constraint verification_votes_result_check check (result in ('fulfilled', 'unfulfilled', 'partially_fulfilled')),
  unique (verification_event_id, user_id)
);

create table if not exists public.letswitness_event_trigger_confirms (
  id uuid primary key default gen_random_uuid(),
  verification_event_id uuid not null references public.letswitness_verification_events (id) on delete cascade,
  user_id uuid not null references public.letswitness_profiles (id) on delete cascade,
  confirmed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (verification_event_id, user_id)
);

create table if not exists public.letswitness_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.letswitness_posts (id) on delete cascade,
  author_id uuid not null references public.letswitness_profiles (id) on delete cascade,
  parent_id uuid references public.letswitness_comments (id) on delete cascade,
  content text not null,
  score integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.letswitness_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.letswitness_profiles (id) on delete cascade,
  type text not null,
  reference_id uuid,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_letswitness_posts_status on public.letswitness_posts (status);
create index if not exists idx_letswitness_posts_created_at on public.letswitness_posts (created_at desc);
create index if not exists idx_letswitness_verification_events_post_id on public.letswitness_verification_events (post_id);
create index if not exists idx_letswitness_comments_post_created_at on public.letswitness_comments (post_id, created_at desc);
create index if not exists idx_letswitness_notifications_user_id_read on public.letswitness_notifications (user_id, is_read);

alter table public.letswitness_profiles enable row level security;
alter table public.letswitness_posts enable row level security;
alter table public.letswitness_comments enable row level security;
alter table public.letswitness_credibility_votes enable row level security;
alter table public.letswitness_verification_votes enable row level security;
alter table public.letswitness_event_trigger_confirms enable row level security;
alter table public.letswitness_notifications enable row level security;

create policy "profiles are publicly readable"
  on public.letswitness_profiles
  for select
  using (true);

create policy "users can manage their own profile" 
  on public.letswitness_profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "posts are publicly readable"
  on public.letswitness_posts
  for select
  using (true);

create policy "users can create their own posts"
  on public.letswitness_posts
  for insert
  with check (auth.uid() = author_id);

create policy "users can update their own posts"
  on public.letswitness_posts
  for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "users can delete their own posts"
  on public.letswitness_posts
  for delete
  using (auth.uid() = author_id);
