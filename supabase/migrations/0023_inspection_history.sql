-- =============================================================
-- History of terminology expertises («История экспертиз»).
--
-- One row per check a signed-in user ran on the Документация tab: the
-- summary figures for the list, and a snapshot of the results (document
-- text + findings + the user's decisions) so the check can be reopened
-- exactly as it was. The original file itself is not stored.
--
-- Each user sees and changes only their own rows.
-- Applied with: npx supabase db query --linked -f supabase/migrations/0023_inspection_history.sql
-- =============================================================

create table if not exists public.inspection_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  file_name text not null,
  document_type text,
  term_count integer not null default 0,
  issue_count integer not null default 0,
  compliance integer,
  status text not null default 'checked' check (status in ('checked', 'fixed')),
  snapshot jsonb not null
);

create index if not exists inspection_history_user_idx
  on public.inspection_history (user_id, created_at desc);

comment on table public.inspection_history is
  'Terminology expertises a user ran (Документация tab), with a snapshot to reopen the results.';

alter table public.inspection_history enable row level security;

drop policy if exists "Users can view own inspections" on public.inspection_history;
create policy "Users can view own inspections"
  on public.inspection_history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can add own inspections" on public.inspection_history;
create policy "Users can add own inspections"
  on public.inspection_history for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own inspections" on public.inspection_history;
create policy "Users can update own inspections"
  on public.inspection_history for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own inspections" on public.inspection_history;
create policy "Users can delete own inspections"
  on public.inspection_history for delete
  using (auth.uid() = user_id);
