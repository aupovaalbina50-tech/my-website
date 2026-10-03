-- =============================================================
-- Unofficial variants of glossary terms, for «Цифровой инспектор МЧС».
--
-- Each row says: in a service document, «variant» (colloquial, outdated or
-- otherwise unofficial wording) stands for the official term `term_id`.
-- The doc-inspector Edge Function finds these variants in the text without
-- AI (with grammatical endings, like official terms) and suggests the
-- official term in the same language.
--
-- Anyone can read; only admins (profiles.role = 'admin') can change.
-- Applied with: npx supabase db query --linked -f supabase/migrations/0021_term_variants.sql
-- =============================================================

create table if not exists public.term_variants (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.terms (id) on delete cascade,
  lang text not null check (lang in ('kk', 'ru')),
  variant text not null check (length(trim(variant)) >= 2),
  note text,
  created_at timestamptz not null default now()
);

create unique index if not exists term_variants_unique_idx
  on public.term_variants (lang, lower(variant));
create index if not exists term_variants_term_idx
  on public.term_variants (term_id);

comment on table public.term_variants is
  'Unofficial wordings of glossary terms (variant -> official term), used by the doc-inspector.';

alter table public.term_variants enable row level security;

drop policy if exists "Anyone can view term variants" on public.term_variants;
create policy "Anyone can view term variants"
  on public.term_variants for select
  using (true);

drop policy if exists "Admins can manage term variants" on public.term_variants;
create policy "Admins can manage term variants"
  on public.term_variants for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- First entry: the base's official term for a firefighter is «огнеборец».
insert into public.term_variants (term_id, lang, variant, note)
select id, 'ru', 'пожарник', 'разговорное название профессии'
from public.terms
where lower(ru) = 'огнеборец'
limit 1
on conflict do nothing;
