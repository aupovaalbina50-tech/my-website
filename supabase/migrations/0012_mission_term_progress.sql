-- =============================================================
-- Mission term progress: mission_term_progress table
--
-- Per-user "I've studied this term" marker scoped to a single mission's
-- study stage (Missions section, Step 1 — "Изучение терминов"). This is
-- deliberately separate from term_mastery (0010): term_mastery is the
-- site-wide "I generally know this term" flag shown on the dashboard,
-- while a mission only counts a term as "изучен" for ITS OWN purposes
-- once the learner has explicitly confirmed it inside that mission's
-- study flow — viewing a term is not the same as studying it, and a
-- studied term is still not "освоено" until the mission's quiz (a later
-- stage) confirms it. mission_id is a free-form slug (see
-- src/data/missions.js) rather than a foreign key, since missions are
-- defined in frontend data, not a database table.
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
--   (This project only ships the anon key to the client, so this
--   migration cannot be applied automatically — it must be run once
--   by a project owner via the Supabase dashboard.)
-- =============================================================

create table if not exists public.mission_term_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  mission_id text not null,
  term_id uuid not null references public.terms (id) on delete cascade,
  studied_at timestamptz not null default now(),
  primary key (user_id, mission_id, term_id)
);

comment on table public.mission_term_progress is 'Per-user, per-mission "I''ve studied this term" markers for the Missions section''s Step 1 (Изучение терминов). Resets per mission; does not by itself imply site-wide term_mastery.';

create index if not exists mission_term_progress_user_mission_idx
  on public.mission_term_progress (user_id, mission_id);

alter table public.mission_term_progress enable row level security;

create policy "Users can view own mission term progress"
  on public.mission_term_progress for select
  using (auth.uid() = user_id);

create policy "Users can add own mission term progress"
  on public.mission_term_progress for insert
  with check (auth.uid() = user_id);

-- No update/delete policy for the client: a studied mark, once set for a
-- mission attempt, is not meant to be un-set from the study screen.
