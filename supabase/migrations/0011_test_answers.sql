-- =============================================================
-- Per-question quiz answers: test_answers table
--
-- test_attempts only ever stored the aggregate score of a quiz. To let a
-- term count as "освоено" after being answered correctly in a quiz (not
-- just marked manually via term_mastery), each question's outcome needs
-- to be recorded per term. This table adds that per-answer breakdown
-- without changing the existing test_attempts row shape.
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
--   (This project only ships the anon key to the client, so this
--   migration cannot be applied automatically — it must be run once
--   by a project owner via the Supabase dashboard.)
-- =============================================================

create table if not exists public.test_answers (
  id bigint generated always as identity primary key,
  attempt_id bigint not null references public.test_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

comment on table public.test_answers is 'Per-question outcome of each quiz attempt, keyed by term. A term with at least one correct answer here counts toward "терминов освоено".';

create index if not exists test_answers_user_correct_idx
  on public.test_answers (user_id, term_id)
  where is_correct;

alter table public.test_answers enable row level security;

create policy "Users can view own test answers"
  on public.test_answers for select
  using (auth.uid() = user_id);

create policy "Users can record own test answers"
  on public.test_answers for insert
  with check (auth.uid() = user_id);

-- No update/delete policy for the client: answers are an immutable log.
