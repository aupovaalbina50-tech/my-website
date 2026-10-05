-- =============================================================
-- Terms on «П» (Kazakh): the 27 old cards are replaced by the 17 terms the
-- user sent («П-17-сөз + англ.docx», kk / ru / en). Copy of the old cards:
-- supabase/backups/terms_kk_P_2026-10-05.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «П» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0040_replace_kk_p_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'пәрменді қауіпсіздік', 'безопасность активная', 'active safety', 'industrial_safety'),
  (2, 'персонал мен халықтың қауіпсіздігі', 'безопасность персонала и населения', 'personnel and public safety', 'civil_defense'),
  (3, 'психологиялық қауіпсіздік', 'безопасность психологическая', 'psychological safety', 'disaster_medicine'),
  (4, 'пайдаланылған газ', 'газ отработанный', 'exhaust gas', 'industrial_safety'),
  (5, 'парциалық қысым', 'давление парциальное', 'partial pressure', 'industrial_safety'),
  (6, 'пайдалану құжаттамасы', 'документация эксплуатационная', 'operational documentation', 'industrial_safety'),
  (7, 'пайдалы сыйымдылық', 'емкость полезная', 'useful capacity', 'industrial_safety'),
  (8, 'пәрмен', 'команда', 'command; team; crew', 'coordination'),
  (9, 'пойыз апаты', 'крушение поезда', 'train wreck; train accident', 'emergencies'),
  (10, 'пана', 'укрытие', 'shelter', 'civil_defense'),
  (11, 'пана', 'убежище', 'shelter; refuge', 'civil_defense'),
  (12, 'процесс, үдеріс', 'процесс', 'process', 'coordination'),
  (13, 'пост', 'пост', 'post', 'civil_defense'),
  (14, 'понтон паркі', 'понтонный парк', 'bridge train; pontoon park', 'rescue_ops'),
  (15, 'понтон көпір', 'понтонный мост', 'pontoon bridge', 'rescue_ops'),
  (16, 'понтон өткел', 'понтонная переправа', 'pontoon crossing', 'rescue_ops'),
  (17, 'патрульдеу', 'патрулирование', 'patrolling', 'civil_defense');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'П';

-- One old card per new term with the same Kazakh text (the first one).
create temp table keep_map on commit drop as
select distinct on (n.n) n.n, o.id
from new_o n join old_o o on lower(trim(o.kk)) = n.kk
order by n.n, o.id;

delete from keep_map k using keep_map k2 where k.id = k2.id and k.n > k2.n;

update public.terms t set kk = n.kk, ru = n.ru, en = n.en, category = n.category
from keep_map k join new_o n on n.n = k.n
where t.id = k.id;

delete from public.terms t using old_o o
where t.id = o.id and t.id not in (select id from keep_map);

insert into public.terms (kk, ru, en, category)
select kk, ru, en, category from new_o where n not in (select n from keep_map) order by n;

select (select count(*) from keep_map) as updated_in_place,
       (select count(*) from new_o) - (select count(*) from keep_map) as inserted,
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'П') as p_now,
       (select count(*) from public.terms) as terms_now;

commit;
