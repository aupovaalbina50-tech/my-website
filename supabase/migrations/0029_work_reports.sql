-- =============================================================
-- «Рапортты құрастыру / Составление рапорта» (personal account tool).
--
-- A user describes a situation in their own words; the tool extracts the
-- facts, proposes professional wording grounded in the site's term base and
-- assembles a draft report. Fully separate from the terminology expertise
-- («Құжат мазмұнын сараптау», table inspection_history): different input
-- (a situation, not a finished document) and different output (a draft).
--
--   work_reports          one row per report: source text, facts, wording,
--                         content of the draft, status, current version
--   work_report_versions  saved snapshots («Сохранить версию», finalising)
--
-- report_type selects the template (src/pages/account/smartReport/templates);
-- more document types / departmental templates are new values, not new tables.
-- Each user sees and changes only their own rows.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0029_work_reports.sql
-- =============================================================

create table if not exists public.work_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  report_type text not null default 'incident_report',
  lang text not null default 'ru' check (lang in ('kk', 'ru')),
  title text not null default '',
  status text not null default 'draft' check (status in ('draft', 'final')),
  step smallint not null default 1 check (step between 1 and 5),
  source_text text not null default '',
  facts jsonb not null default '{}'::jsonb,
  missing jsonb not null default '[]'::jsonb,
  phrasing jsonb not null default '[]'::jsonb,
  content jsonb not null default '{}'::jsonb,
  terms jsonb not null default '[]'::jsonb,
  current_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_reports_user_idx
  on public.work_reports (user_id, updated_at desc);

comment on table public.work_reports is
  'Reports a user is composing in the personal account («Рапортты құрастыру»).';

create table if not exists public.work_report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.work_reports (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version integer not null,
  note text,
  facts jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (report_id, version)
);

create index if not exists work_report_versions_report_idx
  on public.work_report_versions (report_id, version desc);

comment on table public.work_report_versions is
  'Saved versions of a «Рапортты құрастыру» report.';

-- updated_at follows every change of the report.
create or replace function public.work_reports_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists work_reports_touch on public.work_reports;
create trigger work_reports_touch
  before update on public.work_reports
  for each row execute function public.work_reports_touch();

-- ---- row level security: own rows only -------------------------------------
alter table public.work_reports enable row level security;
alter table public.work_report_versions enable row level security;

drop policy if exists "Users can view own reports" on public.work_reports;
create policy "Users can view own reports"
  on public.work_reports for select
  using (auth.uid() = user_id);

drop policy if exists "Users can add own reports" on public.work_reports;
create policy "Users can add own reports"
  on public.work_reports for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own reports" on public.work_reports;
create policy "Users can update own reports"
  on public.work_reports for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reports" on public.work_reports;
create policy "Users can delete own reports"
  on public.work_reports for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can view own report versions" on public.work_report_versions;
create policy "Users can view own report versions"
  on public.work_report_versions for select
  using (auth.uid() = user_id);

-- A version can only be attached to the user's own report.
drop policy if exists "Users can add own report versions" on public.work_report_versions;
create policy "Users can add own report versions"
  on public.work_report_versions for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.work_reports r where r.id = report_id and r.user_id = auth.uid())
  );

drop policy if exists "Users can delete own report versions" on public.work_report_versions;
create policy "Users can delete own report versions"
  on public.work_report_versions for delete
  using (auth.uid() = user_id);
