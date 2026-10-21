-- =============================================================
-- Activity log for the account dashboard chart «Динамика активности».
--
-- One row = one dated action of a user:
--   term_study       — a term studied for the first time: opened
--                      (term_views), marked as learned (term_mastery) or
--                      studied in a mission (mission_term_progress).
--                      Stored once per term: re-opening the same term
--                      later is not counted again.
--   test             — an attempt on the «Тесты» page (test_attempts);
--                      every attempt is a row.
--   mission_test     — a mission quiz attempt (mission_test_attempts);
--                      every attempt, retries included, is a row.
--   mission_complete — a mission finished for the first time
--                      (mission_completions); replays are not counted again.
--
-- The rows are written by triggers on those tables, so the app's existing
-- writes need no change; users can only read their own rows.
--
-- Backfill: existing rows of the source tables are copied once. term_views
-- keeps only the latest view of a term, and mission_term_progress may move
-- studied_at on a replay, so for terms studied before this migration the
-- earliest date still on record is used.
--
-- Apply: Supabase -> SQL Editor -> paste this file -> Run. Safe to re-run.
-- =============================================================

create table if not exists public.user_activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('term_study', 'test', 'mission_test', 'mission_complete')),
  -- term id for term_study, mission id for mission_test / mission_complete.
  ref text,
  occurred_at timestamptz not null default now()
);

comment on table public.user_activity_events is
  'Dated user actions for the dashboard activity chart; written by triggers, term_study and mission_complete once per term / mission.';

create index if not exists user_activity_events_user_time_idx
  on public.user_activity_events (user_id, occurred_at desc);

-- First study of a term and first completion of a mission are stored once.
create unique index if not exists user_activity_events_once_idx
  on public.user_activity_events (user_id, kind, ref)
  where kind in ('term_study', 'mission_complete');

alter table public.user_activity_events enable row level security;

drop policy if exists "Users can view own activity events" on public.user_activity_events;
create policy "Users can view own activity events"
  on public.user_activity_events for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies: rows come only from the triggers below.

create or replace function public.log_user_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
  v_ref text;
  v_at timestamptz;
begin
  if tg_table_name = 'term_views' then
    v_kind := 'term_study'; v_ref := new.term_id::text; v_at := new.viewed_at;
  elsif tg_table_name = 'term_mastery' then
    v_kind := 'term_study'; v_ref := new.term_id::text; v_at := new.created_at;
  elsif tg_table_name = 'mission_term_progress' then
    v_kind := 'term_study'; v_ref := new.term_id::text; v_at := new.studied_at;
  elsif tg_table_name = 'test_attempts' then
    v_kind := 'test'; v_ref := new.category; v_at := new.created_at;
  elsif tg_table_name = 'mission_test_attempts' then
    v_kind := 'mission_test'; v_ref := new.mission_id; v_at := new.created_at;
  elsif tg_table_name = 'mission_completions' then
    v_kind := 'mission_complete'; v_ref := new.mission_id; v_at := new.completed_at;
  else
    return new;
  end if;

  insert into public.user_activity_events (user_id, kind, ref, occurred_at)
  values (new.user_id, v_kind, v_ref, coalesce(v_at, now()))
  on conflict (user_id, kind, ref) where kind in ('term_study', 'mission_complete') do nothing;
  return new;
end;
$$;

revoke all on function public.log_user_activity() from public;

-- Term views: only a first view of a term inserts a row (later views update
-- viewed_at), and the log keeps a term once anyway.
drop trigger if exists log_activity_term_views on public.term_views;
create trigger log_activity_term_views
  after insert on public.term_views
  for each row execute function public.log_user_activity();

drop trigger if exists log_activity_term_mastery on public.term_mastery;
create trigger log_activity_term_mastery
  after insert on public.term_mastery
  for each row execute function public.log_user_activity();

drop trigger if exists log_activity_mission_terms on public.mission_term_progress;
create trigger log_activity_mission_terms
  after insert on public.mission_term_progress
  for each row execute function public.log_user_activity();

drop trigger if exists log_activity_tests on public.test_attempts;
create trigger log_activity_tests
  after insert on public.test_attempts
  for each row execute function public.log_user_activity();

drop trigger if exists log_activity_mission_tests on public.mission_test_attempts;
create trigger log_activity_mission_tests
  after insert on public.mission_test_attempts
  for each row execute function public.log_user_activity();

drop trigger if exists log_activity_mission_completions on public.mission_completions;
create trigger log_activity_mission_completions
  after insert on public.mission_completions
  for each row execute function public.log_user_activity();

-- ---- one-time backfill (idempotent) ----

insert into public.user_activity_events (user_id, kind, ref, occurred_at)
select user_id, 'term_study', term_id::text, min(at)
from (
  select user_id, term_id, viewed_at as at from public.term_views
  union all
  select user_id, term_id, created_at from public.term_mastery
  union all
  select user_id, term_id, studied_at from public.mission_term_progress
) studied
group by user_id, term_id
on conflict (user_id, kind, ref) where kind in ('term_study', 'mission_complete') do nothing;

insert into public.user_activity_events (user_id, kind, ref, occurred_at)
select user_id, 'mission_complete', mission_id, min(completed_at)
from public.mission_completions
group by user_id, mission_id
on conflict (user_id, kind, ref) where kind in ('term_study', 'mission_complete') do nothing;

-- Attempts: copied only if none of this kind is logged yet for the user, so
-- re-running the file does not double them.
insert into public.user_activity_events (user_id, kind, ref, occurred_at)
select t.user_id, 'test', t.category, t.created_at
from public.test_attempts t
where not exists (
  select 1 from public.user_activity_events e where e.user_id = t.user_id and e.kind = 'test'
);

insert into public.user_activity_events (user_id, kind, ref, occurred_at)
select a.user_id, 'mission_test', a.mission_id, a.created_at
from public.mission_test_attempts a
where not exists (
  select 1 from public.user_activity_events e where e.user_id = a.user_id and e.kind = 'mission_test'
);
