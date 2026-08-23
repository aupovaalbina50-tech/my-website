-- =============================================================
-- Mission completions: mission_completions table
--
-- A mission only counts as truly "completed" once the learner finishes
-- BOTH the quiz (>= MISSION_PASSING_SCORE, see mission_test_attempts /
-- 0013) AND the Step 3 operation walkthrough that follows it — passing
-- the test alone only grants "допуск" (clearance) to start the
-- operation. This table is the record of that final completion, read by
-- useMissionsProgress to decide a mission's status badge (list screen,
-- mission page, hero "X / 9 completed" count). Log-style like the other
-- mission_* tables: a mission can be completed more than once (redone),
-- "is completed" is just "row exists", "current score" is the latest row.
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
--   (This project only ships the anon key to the client, so this
--   migration cannot be applied automatically — it must be run once
--   by a project owner via the Supabase dashboard.)
-- =============================================================

create table if not exists public.mission_completions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id text not null,
  category text not null,
  score_percent integer not null check (score_percent between 0 and 100),
  completed_at timestamptz not null default now()
);

comment on table public.mission_completions is 'One row per finished Missions-section run-through (quiz passed AND the Step 3 operation completed). Existence of a row = mission "completed" for useMissionsProgress; category/score_percent are the values at time of completion, kept denormalized for easy history/reporting.';

create index if not exists mission_completions_user_mission_idx
  on public.mission_completions (user_id, mission_id, completed_at desc);

alter table public.mission_completions enable row level security;

create policy "Users can view own mission completions"
  on public.mission_completions for select
  using (auth.uid() = user_id);

create policy "Users can record own mission completions"
  on public.mission_completions for insert
  with check (auth.uid() = user_id);

-- No update/delete policy for the client: completions are an immutable log.
