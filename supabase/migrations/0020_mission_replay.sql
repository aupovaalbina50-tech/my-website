-- =============================================================
-- Mission replay support
--
-- 1. mission_test_attempts (from 0013) was never applied in the live
--    project, so quiz results were not saved at all. It is (re)created
--    here idempotently — safe to run even if 0013 was already applied.
--
-- 2. Missions are replayable. A run starts after the user's latest
--    mission_completions row, and a term only counts as studied for the
--    current run if its mission_term_progress.studied_at is after that.
--    On a repeat run the client re-marks terms whose row already exists
--    (upsert -> ON CONFLICT DO UPDATE), so the user needs an UPDATE policy
--    on their own rows, and a trigger stamps studied_at = now() on every
--    update so the mark moves into the current run. Completions and test
--    attempts stay immutable logs — overall progress is never reset.
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
-- =============================================================

-- ---- 1. mission_test_attempts -------------------------------------------

create table if not exists public.mission_test_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id text not null,
  total_questions integer not null check (total_questions > 0),
  correct_answers integer not null check (correct_answers >= 0 and correct_answers <= total_questions),
  score_percent integer not null check (score_percent between 0 and 100),
  status text not null check (status in ('failed', 'needs_practice', 'passed', 'excellent')),
  created_at timestamptz not null default now()
);

create index if not exists mission_test_attempts_user_mission_idx
  on public.mission_test_attempts (user_id, mission_id, created_at desc);

alter table public.mission_test_attempts enable row level security;

drop policy if exists "Users can view own mission test attempts" on public.mission_test_attempts;
create policy "Users can view own mission test attempts"
  on public.mission_test_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can record own mission test attempts" on public.mission_test_attempts;
create policy "Users can record own mission test attempts"
  on public.mission_test_attempts for insert
  with check (auth.uid() = user_id);

-- ---- 2. Re-marking terms on a repeat run --------------------------------

drop policy if exists "Users can re-mark own mission term progress" on public.mission_term_progress;
create policy "Users can re-mark own mission term progress"
  on public.mission_term_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_mission_term_progress()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.studied_at := now();
  return new;
end;
$$;

drop trigger if exists mission_term_progress_touch on public.mission_term_progress;
create trigger mission_term_progress_touch
  before update on public.mission_term_progress
  for each row execute function public.touch_mission_term_progress();

-- Make PostgREST see the new table right away.
notify pgrst, 'reload schema';
