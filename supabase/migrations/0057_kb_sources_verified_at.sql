-- =============================================================
-- Registry of sources: when the status of an act was last checked.
--
-- «Работа со служебными документами» checks the normative references of a
-- document against public.kb_sources. An act counts as confirmed only when
-- the registry holds it as in force (status 'official') AND says when that
-- was last checked in the official system; until then the editor shows
-- «Требуется проверка актуальности». No date is filled in here: an
-- administrator sets it after checking the act on adilet.zan.kz.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0057_kb_sources_verified_at.sql
-- =============================================================

alter table public.kb_sources add column if not exists verified_at date;

comment on column public.kb_sources.verified_at is
  'Date the status of the act was last checked in the official system (ИПС «Әділет» etc.); null = not checked.';
