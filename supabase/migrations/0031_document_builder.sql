-- =============================================================
-- «Кәсіби құжаттама конструкторы / Конструктор профессиональной
-- документации» (personal account).
--
-- The user picks a document type from the catalog (templates are code
-- configuration: src/pages/account/documents/catalog), fills its fields,
-- checks it and exports it. The «Умный рабочий рапорт» keeps its own tables
-- (work_reports, 0029) and is shown in the same catalog as the «Рапорт» type.
--
--   work_documents           one row per document: template, field values,
--                            status, result of the last check
--   work_document_versions   snapshots: original / checked / user / final
--   document_favorites       document types a user marked with ⭐
--   profiles (+ columns)     position, rank, department, organization —
--                            filled by the user, offered as «Заполнить
--                            данными профиля»
--
-- Checks and their remarks are kept on the document (issues jsonb): only the
-- last check matters to the user, older ones live in the versions.
-- Each user sees and changes only their own rows (row level security).
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0031_document_builder.sql
-- =============================================================

-- ---- profile data for «Заполнить данными профиля» --------------------------
alter table public.profiles add column if not exists position text not null default '';
alter table public.profiles add column if not exists rank text not null default '';
alter table public.profiles add column if not exists department text not null default '';
alter table public.profiles add column if not exists organization text not null default '';

-- ---- documents --------------------------------------------------------------
create table if not exists public.work_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id text not null,
  lang text not null default 'ru' check (lang in ('kk', 'ru')),
  title text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'filling', 'review', 'issues', 'ready', 'archive')),
  "values" jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  issue_count integer not null default 0,
  checked_at timestamptz,
  current_version integer not null default 0,
  copied_from uuid references public.work_documents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists work_documents_user_idx
  on public.work_documents (user_id, updated_at desc);

comment on table public.work_documents is
  'Documents a user creates in the personal account («Конструктор профессиональной документации»).';

create table if not exists public.work_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.work_documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version integer not null,
  kind text not null default 'user' check (kind in ('original', 'checked', 'user', 'final')),
  note text,
  "values" jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create index if not exists work_document_versions_doc_idx
  on public.work_document_versions (document_id, version desc);

create table if not exists public.document_favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, template_id)
);

-- updated_at follows every change (same function as work_reports).
drop trigger if exists work_documents_touch on public.work_documents;
create trigger work_documents_touch
  before update on public.work_documents
  for each row execute function public.work_reports_touch();

-- ---- row level security: own rows only -------------------------------------
alter table public.work_documents enable row level security;
alter table public.work_document_versions enable row level security;
alter table public.document_favorites enable row level security;

drop policy if exists "Users can view own documents" on public.work_documents;
create policy "Users can view own documents"
  on public.work_documents for select using (auth.uid() = user_id);

drop policy if exists "Users can add own documents" on public.work_documents;
create policy "Users can add own documents"
  on public.work_documents for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own documents" on public.work_documents;
create policy "Users can update own documents"
  on public.work_documents for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete own documents" on public.work_documents;
create policy "Users can delete own documents"
  on public.work_documents for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own document versions" on public.work_document_versions;
create policy "Users can view own document versions"
  on public.work_document_versions for select using (auth.uid() = user_id);

-- A version can only be attached to the user's own document.
drop policy if exists "Users can add own document versions" on public.work_document_versions;
create policy "Users can add own document versions"
  on public.work_document_versions for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.work_documents d where d.id = document_id and d.user_id = auth.uid())
  );

drop policy if exists "Users can delete own document versions" on public.work_document_versions;
create policy "Users can delete own document versions"
  on public.work_document_versions for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own favorites" on public.document_favorites;
create policy "Users can view own favorites"
  on public.document_favorites for select using (auth.uid() = user_id);

drop policy if exists "Users can add own favorites" on public.document_favorites;
create policy "Users can add own favorites"
  on public.document_favorites for insert with check (auth.uid() = user_id);

drop policy if exists "Users can delete own favorites" on public.document_favorites;
create policy "Users can delete own favorites"
  on public.document_favorites for delete using (auth.uid() = user_id);
