-- =============================================================
-- Terminology tests: test_attempts table
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
--   (This project only ships the anon key to the client, so this
--   migration cannot be applied automatically — it must be run once
--   by a project owner via the Supabase dashboard.)
-- =============================================================

create table if not exists public.test_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text,
  total_questions integer not null check (total_questions > 0),
  correct_answers integer not null check (correct_answers >= 0 and correct_answers <= total_questions),
  score_percent integer not null check (score_percent between 0 and 100),
  created_at timestamptz not null default now()
);

comment on table public.test_attempts is 'Per-user results of quiz attempts on the /account/tests page. category is null when the attempt covered all categories.';

create index if not exists test_attempts_user_id_idx
  on public.test_attempts (user_id, created_at desc);

alter table public.test_attempts enable row level security;

create policy "Users can view own test attempts"
  on public.test_attempts for select
  using (auth.uid() = user_id);

create policy "Users can record own test attempts"
  on public.test_attempts for insert
  with check (auth.uid() = user_id);

-- No update/delete policy for the client: attempts are an immutable log.
