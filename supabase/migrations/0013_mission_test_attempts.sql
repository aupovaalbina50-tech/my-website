-- =============================================================
-- Mission quiz attempts: mission_test_attempts table
--
-- Per-user, per-mission results of the Missions section's Step 2 quiz
-- ("Проверка знаний"). Separate from the site-wide test_attempts (0005):
-- that table scores the general vocabulary quiz on /account/tests, while
-- this one scores a specific mission's 15-question quiz built only from
-- the terms studied in that mission's Step 1. `status` mirrors the
-- 4-tier system in src/utils/missionScoreTier.js (failed / needs_practice
-- / passed / excellent) so the mission's real status can be read back
-- without recomputing it from score_percent everywhere. Attempts are an
-- immutable log — "attempt count" for a mission is just a row count.
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
--   (This project only ships the anon key to the client, so this
--   migration cannot be applied automatically — it must be run once
--   by a project owner via the Supabase dashboard.)
-- =============================================================

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

comment on table public.mission_test_attempts is 'Per-user, per-mission quiz attempts for the Missions section''s Step 2 (Проверка знаний). mission_id is a frontend slug (see src/data/missions.js), not a foreign key. Immutable log — attempt count is a row count, not a stored column.';

create index if not exists mission_test_attempts_user_mission_idx
  on public.mission_test_attempts (user_id, mission_id, created_at desc);

alter table public.mission_test_attempts enable row level security;

create policy "Users can view own mission test attempts"
  on public.mission_test_attempts for select
  using (auth.uid() = user_id);

create policy "Users can record own mission test attempts"
  on public.mission_test_attempts for insert
  with check (auth.uid() = user_id);

-- No update/delete policy for the client: attempts are an immutable log.
