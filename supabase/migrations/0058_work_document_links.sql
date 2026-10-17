-- =============================================================
-- «Связанные документы и контроль согласованности сведений».
--
-- A link joins two documents of the same user (work_documents) that belong
-- to one task, incident, event or service question. The pair is stored
-- once (document_a < document_b). With the link the user keeps:
--   decisions  what was decided about each discrepancy between the two
--              documents: { "<discrepancy id>": { status: 'confirmed' |
--              'both' | 'intentional', value?, note?, by, at } }. The id
--              includes both values, so a decision stops applying as soon
--              as either value changes.
--   reviewed   when the link was last reviewed from each side:
--              { "<document id>": "<timestamp>" } — a linked document
--              changed after that is shown as possibly outdated.
-- Nothing in a document is changed by a link: transferring a value is
-- an explicit edit of the target document by its owner.
--
-- RLS: only the owner sees and changes a link, and only between two of
-- their own documents (another user's document id is refused on insert
-- and update). Deleting a document deletes its links.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0058_work_document_links.sql
-- =============================================================

create table if not exists public.work_document_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_a uuid not null references public.work_documents (id) on delete cascade,
  document_b uuid not null references public.work_documents (id) on delete cascade,
  kind text not null default 'task' check (kind in ('task', 'incident', 'event', 'issue')),
  topic text not null default '' check (char_length(topic) <= 200),
  decisions jsonb not null default '{}'::jsonb,
  reviewed jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_document_links_ordered check (document_a < document_b),
  constraint work_document_links_pair unique (document_a, document_b)
);

create index if not exists work_document_links_a_idx on public.work_document_links (document_a);
create index if not exists work_document_links_b_idx on public.work_document_links (document_b);
create index if not exists work_document_links_user_idx on public.work_document_links (user_id);

comment on table public.work_document_links is
  'Links between two documents of one user (one task / incident / event / question), with the decisions on discrepancies.';

create or replace function public.work_document_links_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists work_document_links_touch on public.work_document_links;
create trigger work_document_links_touch
  before update on public.work_document_links
  for each row execute function public.work_document_links_touch();

alter table public.work_document_links enable row level security;

drop policy if exists "Users can view own document links" on public.work_document_links;
create policy "Users can view own document links"
  on public.work_document_links for select using (auth.uid() = user_id);

drop policy if exists "Users can link own documents" on public.work_document_links;
create policy "Users can link own documents"
  on public.work_document_links for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.work_documents d where d.id = document_a and d.user_id = auth.uid())
    and exists (select 1 from public.work_documents d where d.id = document_b and d.user_id = auth.uid())
  );

drop policy if exists "Users can update own document links" on public.work_document_links;
create policy "Users can update own document links"
  on public.work_document_links for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.work_documents d where d.id = document_a and d.user_id = auth.uid())
    and exists (select 1 from public.work_documents d where d.id = document_b and d.user_id = auth.uid())
  );

drop policy if exists "Users can delete own document links" on public.work_document_links;
create policy "Users can delete own document links"
  on public.work_document_links for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.work_document_links to authenticated;
