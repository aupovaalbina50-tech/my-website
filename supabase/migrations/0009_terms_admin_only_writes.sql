-- =============================================================
-- Restrict term edits to admins via RLS (replaces the client-side
-- delete password in TermsListPage.jsx, which was never real
-- protection — anyone could read it out of the public JS bundle or
-- call supabase.from('terms').update/delete() directly from devtools).
--
-- HOW TO RUN:
--   Open your Supabase project -> SQL Editor -> paste this file -> Run.
--   (This project only ships the anon key to the client, so this
--   migration cannot be applied automatically — it must be run once
--   by a project owner via the Supabase dashboard.)
--
-- AFTER RUNNING: promote your own account to admin, e.g.
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
-- =============================================================

alter table public.terms enable row level security;

drop policy if exists "Anyone can view terms" on public.terms;
create policy "Anyone can view terms"
  on public.terms for select
  using (true);

drop policy if exists "Admins can update terms" on public.terms;
create policy "Admins can update terms"
  on public.terms for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can delete terms" on public.terms;
create policy "Admins can delete terms"
  on public.terms for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
