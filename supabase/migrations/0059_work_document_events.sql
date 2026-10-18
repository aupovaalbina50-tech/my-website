-- =============================================================
-- «Паспорт документа»: the log of what was done with a document.
--
-- What already has its own log is not duplicated here:
--   versions of the text        work_document_versions (insert-only)
--   completed expertise runs    inspection_history (snapshot.documentId)
-- This table keeps the other actions, one row per action of the user or
-- of the system — never one per typed character:
--   created, edited (one per editing session: which fields, text or
--   requisites), check_failed, remark_accepted / remark_rejected /
--   remark_edited / remark_undone, status_changed, exported,
--   version_restored, values_transferred, draft_restored, conflict_resolved.
-- `summary` is a short text for the user; `details` holds plain facts
-- (field keys, counts, versions, file format) — no model reasoning.
--
-- Rows are insert-only: no update, no delete except with the document.
-- RLS: only the owner, only for their own documents.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0059_work_document_events.sql
-- =============================================================

create table if not exists public.work_document_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.work_documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in (
    'created', 'edited', 'check_failed', 'remark_accepted', 'remark_rejected', 'remark_edited', 'remark_undone',
    'status_changed', 'exported', 'version_restored', 'values_transferred', 'draft_restored', 'conflict_resolved')),
  summary text not null default '' check (char_length(summary) <= 500),
  details jsonb not null default '{}'::jsonb,
  version integer,
  created_at timestamptz not null default now()
);

create index if not exists work_document_events_document_idx on public.work_document_events (document_id, created_at desc);

comment on table public.work_document_events is
  'Actions on a document for its passport (insert-only). Versions and completed checks have their own tables.';

alter table public.work_document_events enable row level security;

drop policy if exists "Users can view own document events" on public.work_document_events;
create policy "Users can view own document events"
  on public.work_document_events for select using (auth.uid() = user_id);

drop policy if exists "Users can add events to own documents" on public.work_document_events;
create policy "Users can add events to own documents"
  on public.work_document_events for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.work_documents d where d.id = document_id and d.user_id = auth.uid())
  );

-- No update / delete policies: the log cannot be rewritten (rows go with the document).

grant select, insert on public.work_document_events to authenticated;
