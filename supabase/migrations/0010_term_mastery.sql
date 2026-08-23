-- =============================================================
-- Term mastery: term_mastery table
--
-- Per-user "I've learned this term" marker, set manually from the term
-- detail page. Combined with correct quiz answers (test_answers table,
-- see 0011) to compute the "терминов освоено" progress shown on the
-- account dashboard. Mirrors the existing term_favorites table.
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
--   (This project only ships the anon key to the client, so this
--   migration cannot be applied automatically — it must be run once
--   by a project owner via the Supabase dashboard.)
-- =============================================================

create table if not exists public.term_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, term_id)
);

comment on table public.term_mastery is 'Per-user terms manually marked as learned, shown in the account dashboard progress ring.';

alter table public.term_mastery enable row level security;

create policy "Users can view own term mastery"
  on public.term_mastery for select
  using (auth.uid() = user_id);

create policy "Users can add own term mastery"
  on public.term_mastery for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own term mastery"
  on public.term_mastery for delete
  using (auth.uid() = user_id);
