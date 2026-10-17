-- =============================================================
-- «Мои документы»: statuses that follow what really happened to a document,
-- and a link between the last expertise and the text it checked.
--
-- Statuses (work_documents.status):
--   draft / filling  Черновик            created, work not finished
--   review           На проверке         an expertise is running right now
--   issues           Требует исправлений the expertise found open remarks
--   checked          Проверен            the expertise finished, nothing open
--                                        (NEW — not an official approval)
--   ready            Готов к экспорту    the user finished the document
--   archive          Архив
-- Until now «review» meant «checked, nothing open»; those rows become «checked».
--
-- content_hash  fingerprint of the document's fields, written with every save
-- checked_hash  content_hash of the text the last expertise checked
--   checked_hash <> content_hash  →  the current text has not been checked
--   (checked_at, existing, is the time of that expertise)
--
-- Row level security is unchanged: every policy of work_documents and
-- work_document_versions already limits rows to auth.uid() = user_id
-- (0031_document_builder.sql); versions stay insert-only (no update policy).
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0055_document_status_and_check_link.sql
-- =============================================================

begin;

alter table public.work_documents drop constraint if exists work_documents_status_check;
alter table public.work_documents
  add constraint work_documents_status_check
  check (status in ('draft', 'filling', 'review', 'issues', 'checked', 'ready', 'archive'));

update public.work_documents set status = 'checked' where status = 'review';

alter table public.work_documents add column if not exists content_hash text;
alter table public.work_documents add column if not exists checked_hash text;

comment on column public.work_documents.content_hash is 'Fingerprint of the field values, written with every save.';
comment on column public.work_documents.checked_hash is 'content_hash of the text the last expertise checked; differs from content_hash when the text changed after the check.';

commit;
