-- =============================================================
-- Term viewing history: term_views table
--
-- Tracks the last time each authenticated user opened a given term,
-- so the "История просмотра терминов" account page can list it.
-- Mirrors the existing quote_views table.
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
--   (This project only ships the anon key to the client, so this
--   migration cannot be applied automatically — it must be run once
--   by a project owner via the Supabase dashboard.)
-- =============================================================

create table if not exists public.term_views (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique (user_id, term_id)
);

comment on table public.term_views is 'Per-user record of the last time each term was viewed, for the account "viewing history" page.';

create index if not exists term_views_user_id_idx
  on public.term_views (user_id, viewed_at desc);

alter table public.term_views enable row level security;

create policy "Users can view own term views"
  on public.term_views for select
  using (auth.uid() = user_id);

create policy "Users can record own term views"
  on public.term_views for insert
  with check (auth.uid() = user_id);

create policy "Users can update own term views"
  on public.term_views for update
  using (auth.uid() = user_id);
