-- =============================================================
-- Letters «Ң», «Щ», «Һ» (Kazakh) are removed from the site, as the user
-- asked: the cards whose Kazakh term starts with one of them are deleted,
-- so these letters no longer appear in the Kazakh alphabet catalogue.
--
-- A copy of every removed card is kept in public.terms_backup_ng_shch_h_2026_10_15
-- (RLS on, no policies: not readable from the site). Their user rows
-- (favourites, progress…) go with them, on delete cascade.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0054_remove_kk_ng_shch_h_terms.sql
-- =============================================================

begin;

create table if not exists public.terms_backup_ng_shch_h_2026_10_15 as
  select * from public.terms where false;
alter table public.terms_backup_ng_shch_h_2026_10_15 enable row level security;

create temp table old_cards on commit drop as
  select t.* from public.terms t
  where lower(left(btrim(t.kk), 1)) in ('ң', 'щ', 'һ');

insert into public.terms_backup_ng_shch_h_2026_10_15 select * from old_cards;

delete from public.terms where id in (select id from old_cards);

commit;

-- Should be 0.
select count(*) as left_on_ng_shch_h
from public.terms
where lower(left(btrim(kk), 1)) in ('ң', 'щ', 'һ');
