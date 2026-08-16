-- =============================================================
-- Term favorites: term_favorites table
--
-- Per-user saved/favorited terms, shown on the account "Мой словарь"
-- ("My Dictionary") page. Mirrors the existing quote_favorites table.
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
--   (This project only ships the anon key to the client, so this
--   migration cannot be applied automatically — it must be run once
--   by a project owner via the Supabase dashboard.)
-- =============================================================

create table if not exists public.term_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  term_id uuid not null references public.terms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, term_id)
);

comment on table public.term_favorites is 'Per-user saved terms, shown on the account "Мой словарь" page.';

alter table public.term_favorites enable row level security;

create policy "Users can view own term favorites"
  on public.term_favorites for select
  using (auth.uid() = user_id);

create policy "Users can add own term favorites"
  on public.term_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own term favorites"
  on public.term_favorites for delete
  using (auth.uid() = user_id);
