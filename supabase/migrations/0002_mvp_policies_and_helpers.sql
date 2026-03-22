alter table public.letswitness_tags enable row level security;
alter table public.letswitness_post_tags enable row level security;
alter table public.letswitness_post_media enable row level security;
alter table public.letswitness_verification_events enable row level security;

create policy "tags are publicly readable"
  on public.letswitness_tags
  for select
  using (true);

create policy "authenticated users can manage tags"
  on public.letswitness_tags
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "post tags are publicly readable"
  on public.letswitness_post_tags
  for select
  using (true);

create policy "authors can manage post tags"
  on public.letswitness_post_tags
  for all
  using (
    exists (
      select 1
      from public.letswitness_posts posts
      where posts.id = post_id
        and posts.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.letswitness_posts posts
      where posts.id = post_id
        and posts.author_id = auth.uid()
    )
  );

create policy "verification events are publicly readable"
  on public.letswitness_verification_events
  for select
  using (true);

create policy "authors can manage verification events"
  on public.letswitness_verification_events
  for all
  using (
    exists (
      select 1
      from public.letswitness_posts posts
      where posts.id = post_id
        and posts.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.letswitness_posts posts
      where posts.id = post_id
        and posts.author_id = auth.uid()
    )
  );

create policy "post media is publicly readable"
  on public.letswitness_post_media
  for select
  using (true);

create policy "authors can manage post media"
  on public.letswitness_post_media
  for all
  using (
    exists (
      select 1
      from public.letswitness_posts posts
      where posts.id = post_id
        and posts.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.letswitness_posts posts
      where posts.id = post_id
        and posts.author_id = auth.uid()
    )
  );

create policy "comments are publicly readable"
  on public.letswitness_comments
  for select
  using (true);

create policy "users can create comments"
  on public.letswitness_comments
  for insert
  with check (auth.uid() = author_id);

create policy "users can update their own comments"
  on public.letswitness_comments
  for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "users can delete their own comments"
  on public.letswitness_comments
  for delete
  using (auth.uid() = author_id);

create policy "credibility votes are publicly readable"
  on public.letswitness_credibility_votes
  for select
  using (true);

create policy "users can manage their own credibility votes"
  on public.letswitness_credibility_votes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "verification votes are publicly readable"
  on public.letswitness_verification_votes
  for select
  using (true);

create policy "users can manage their own verification votes"
  on public.letswitness_verification_votes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "event trigger confirms are publicly readable"
  on public.letswitness_event_trigger_confirms
  for select
  using (true);

create policy "users can manage their own trigger confirms"
  on public.letswitness_event_trigger_confirms
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can read their own notifications"
  on public.letswitness_notifications
  for select
  using (auth.uid() = user_id);

create policy "authenticated users can insert notifications"
  on public.letswitness_notifications
  for insert
  with check (auth.role() = 'authenticated');

create policy "users can update their own notifications"
  on public.letswitness_notifications
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own notifications"
  on public.letswitness_notifications
  for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('letswitness-media', 'letswitness-media', true)
on conflict (id) do nothing;

create policy "letswitness media is publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'letswitness-media');

create policy "authenticated users can upload letswitness media"
  on storage.objects
  for insert
  with check (
    bucket_id = 'letswitness-media'
    and auth.role() = 'authenticated'
  );

create policy "authenticated users can update letswitness media"
  on storage.objects
  for update
  using (
    bucket_id = 'letswitness-media'
    and auth.role() = 'authenticated'
  )
  with check (
    bucket_id = 'letswitness-media'
    and auth.role() = 'authenticated'
  );

create policy "authenticated users can delete letswitness media"
  on storage.objects
  for delete
  using (
    bucket_id = 'letswitness-media'
    and auth.role() = 'authenticated'
  );

create or replace function public.letswitness_insert_notification(
  p_user_id uuid,
  p_type text,
  p_reference_id uuid,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.letswitness_notifications (user_id, type, reference_id, message)
  values (p_user_id, p_type, p_reference_id, p_message);
end;
$$;

create or replace function public.letswitness_recalculate_credibility_score(
  p_post_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  worthy_votes integer;
  total_votes integer;
  new_score integer;
begin
  select
    count(*) filter (where value),
    count(*)
  into worthy_votes, total_votes
  from public.letswitness_credibility_votes
  where post_id = p_post_id;

  if total_votes = 0 then
    new_score := 50;
  else
    new_score := round((worthy_votes::numeric / total_votes::numeric) * 100);
  end if;

  update public.letswitness_posts
  set credibility_score = new_score,
      updated_at = now()
  where id = p_post_id;

  return new_score;
end;
$$;

create or replace function public.letswitness_trigger_event(
  p_event_id uuid,
  p_triggered_by uuid,
  p_evidence_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_post_id uuid;
begin
  update public.letswitness_verification_events
  set status = 'triggered',
      triggered_at = coalesce(triggered_at, now()),
      triggered_by = coalesce(triggered_by, p_triggered_by),
      evidence_url = coalesce(p_evidence_url, evidence_url)
  where id = p_event_id
    and status = 'waiting'
  returning post_id into target_post_id;

  if target_post_id is not null then
    update public.letswitness_posts
    set status = 'verifying',
        updated_at = now()
    where id = target_post_id
      and status = 'pending';
  end if;
end;
$$;

create or replace function public.letswitness_sync_verification_states(
  p_post_ids uuid[] default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.letswitness_verification_events events
  set status = 'triggered',
      triggered_at = coalesce(events.triggered_at, now())
  where events.status = 'waiting'
    and events.type = 'time_point'
    and events.target_date is not null
    and events.target_date <= current_date
    and (p_post_ids is null or events.post_id = any(p_post_ids));

  update public.letswitness_verification_events events
  set status = 'expired'
  where events.status = 'waiting'
    and events.type = 'event_trigger'
    and events.deadline is not null
    and events.deadline < current_date
    and (p_post_ids is null or events.post_id = any(p_post_ids));

  with resolved_candidates as (
    select
      events.id,
      events.post_id,
      (
        select votes.result
        from public.letswitness_verification_votes votes
        where votes.verification_event_id = events.id
        group by votes.result
        order by count(*) desc, votes.result asc
        limit 1
      ) as winning_result
    from public.letswitness_verification_events events
    where events.status = 'triggered'
      and events.triggered_at is not null
      and events.triggered_at <= now() - interval '14 days'
      and (
        select count(*)
        from public.letswitness_verification_votes votes
        where votes.verification_event_id = events.id
      ) >= 20
      and (p_post_ids is null or events.post_id = any(p_post_ids))
  )
  update public.letswitness_verification_events events
  set status = 'resolved'
  from resolved_candidates candidates
  where events.id = candidates.id;

  with resolved_candidates as (
    select
      events.post_id,
      (
        select votes.result
        from public.letswitness_verification_votes votes
        where votes.verification_event_id = events.id
        group by votes.result
        order by count(*) desc, votes.result asc
        limit 1
      ) as winning_result
    from public.letswitness_verification_events events
    where events.status = 'resolved'
      and (p_post_ids is null or events.post_id = any(p_post_ids))
  )
  update public.letswitness_posts posts
  set status = candidates.winning_result,
      updated_at = now()
  from resolved_candidates candidates
  where posts.id = candidates.post_id;

  update public.letswitness_verification_events events
  set status = 'expired'
  where events.status = 'triggered'
    and events.triggered_at is not null
    and events.triggered_at <= now() - interval '21 days'
    and (
      select count(*)
      from public.letswitness_verification_votes votes
      where votes.verification_event_id = events.id
    ) < 20
    and (p_post_ids is null or events.post_id = any(p_post_ids));

  update public.letswitness_posts posts
  set status = 'verifying',
      updated_at = now()
  where exists (
      select 1
      from public.letswitness_verification_events events
      where events.post_id = posts.id
        and events.status = 'triggered'
    )
    and (p_post_ids is null or posts.id = any(p_post_ids));

  update public.letswitness_posts posts
  set status = 'expired',
      updated_at = now()
  where exists (
      select 1
      from public.letswitness_verification_events events
      where events.post_id = posts.id
        and events.status = 'expired'
    )
    and not exists (
      select 1
      from public.letswitness_verification_events events
      where events.post_id = posts.id
        and events.status in ('waiting', 'triggered', 'resolved')
    )
    and (p_post_ids is null or posts.id = any(p_post_ids));
end;
$$;

grant execute on function public.letswitness_insert_notification(uuid, text, uuid, text) to authenticated;
grant execute on function public.letswitness_recalculate_credibility_score(uuid) to authenticated;
grant execute on function public.letswitness_trigger_event(uuid, uuid, text) to authenticated;
grant execute on function public.letswitness_sync_verification_states(uuid[]) to anon, authenticated;
