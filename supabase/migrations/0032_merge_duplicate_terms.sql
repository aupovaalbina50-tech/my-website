-- =============================================================
-- Duplicate term cards: the same term on all three languages added twice
-- (4 exact copies) or differing only by the English variant, a note in
-- brackets or the word order of the Kazakh line (10 more). One card stays,
-- the English variants are joined, and everything users have on the removed
-- card — favourites, mastery, viewing history, mission progress, test
-- answers, variants — is moved to the card that stays.
--
-- Terms with the same Russian word but a different translation (дамба /
-- бөген, гипоцентр / ішкіндік …) are different readings and are NOT merged.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0032_merge_duplicate_terms.sql
-- =============================================================

begin;

-- ru — which card stays (by its Kazakh / English text when the copies differ) — final English.
create temp table dup_spec (ru text, keep_kk text, keep_en text, en text) on commit drop;
insert into dup_spec values
  ('искрогаситель', null, null, null),
  ('легковоспламеняющийся', null, null, null),
  ('огнетушитель порошковый', null, null, null),
  ('подъёмный кран', null, null, null),
  ('воспламенение', null, 'ignition, lighting', 'ignition, lighting'),
  ('воспламеняемость', null, 'inflammability, flammability', 'flammability, inflammability'),
  ('автомеханическая лестница', null, 'aerial ladder, turntable ladder', 'aerial ladder, turntable ladder'),
  ('выдвижная пожарная лестница', null, 'extension ladder', 'extension ladder, extension fire ladder'),
  ('воздухозаборник', null, 'air inlet, air intake', 'air inlet, air intake'),
  ('камнепад', null, 'rockfall', 'rockfall, avalanche of earth and rocks'),
  ('канат', null, 'rope, sling', 'rope, sling'),
  ('инспектор', null, 'inspector', 'inspector'),
  ('катушка рукавная', 'жең орағыш катушка', null, null),
  ('боевое дежурство', 'жауынгерлік кезекшілік', null, null);

create temp table dup_map (keeper uuid, loser uuid) on commit drop;

insert into dup_map
select k.id, t.id
from dup_spec s
cross join lateral (
  select id from public.terms t
  where lower(t.ru) = s.ru
  order by (t.kk = s.keep_kk) desc nulls last, (t.en = s.keep_en) desc nulls last, t.created_at, t.id
  limit 1
) k
join public.terms t on lower(t.ru) = s.ru and t.id <> k.id;

-- The final English variant on the card that stays.
update public.terms t set en = s.en
from dup_spec s, dup_map m
where m.keeper = t.id and lower(t.ru) = s.ru and s.en is not null;

-- Per-user rows: move unless the user already has the same row on the card that stays.
update public.term_favorites f set term_id = m.keeper from dup_map m
where f.term_id = m.loser
  and not exists (select 1 from public.term_favorites x where x.user_id = f.user_id and x.term_id = m.keeper);
update public.term_mastery f set term_id = m.keeper from dup_map m
where f.term_id = m.loser
  and not exists (select 1 from public.term_mastery x where x.user_id = f.user_id and x.term_id = m.keeper);
update public.term_views f set term_id = m.keeper from dup_map m
where f.term_id = m.loser
  and not exists (select 1 from public.term_views x where x.user_id = f.user_id and x.term_id = m.keeper);
update public.mission_term_progress f set term_id = m.keeper from dup_map m
where f.term_id = m.loser
  and not exists (
    select 1 from public.mission_term_progress x
    where x.user_id = f.user_id and x.mission_id = f.mission_id and x.term_id = m.keeper
  );
update public.test_answers f set term_id = m.keeper from dup_map m where f.term_id = m.loser;
update public.term_variants f set term_id = m.keeper from dup_map m where f.term_id = m.loser;

-- What is left on the removed cards (rows the user already has on the kept
-- card, the mirrored knowledge-base entry) goes with them (on delete cascade).
delete from public.terms t using dup_map m where t.id = m.loser;

select (select count(*) from dup_map) as removed, (select count(*) from public.terms) as terms_now;

commit;
