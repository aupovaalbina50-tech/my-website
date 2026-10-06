-- =============================================================
-- Terms on «Р» (Kazakh): the 16 old cards are replaced by the 21 terms the
-- user sent («Р-әріпі 21 сөз + англ.docx», kk / ru / en). Copy of the old
-- cards: supabase/backups/terms_kk_R_2026-10-06.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «Р» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0044_replace_kk_r_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'радиоактив заттектің белсенділігі', 'активность радиоактивного вещества', 'activity of a radioactive substance', 'civil_defense'),
  (2, 'радиоактив элементтің белсенділігі', 'активность радиоактивного элемента', 'activity of a radioactive element', 'civil_defense'),
  (3, 'радиобелсенді атом', 'атом радиоактивный', 'radioactive atom', 'civil_defense'),
  (4, 'радиоактив заттек', 'вещество радиоактивное', 'radioactive substance; radioactive material', 'civil_defense'),
  (5, 'реттегіш', 'регулятор', 'regulator; control device', 'industrial_safety'),
  (6, 'режим, тәртіп', 'режим', 'regime', 'coordination'),
  (7, 'реакция', 'реакция', 'reaction', 'industrial_safety'),
  (8, 'резус-фактор', 'резус-фактор', 'Rh factor', 'disaster_medicine'),
  (9, 'радиактивті ластану', 'радиоактивное загрязнение', 'radioactive contamination', 'civil_defense'),
  (10, 'рельстің істен шығуы', 'выход рельсов из строя', 'rail failure', 'industrial_safety'),
  (11, 'разрядты жүк', 'груз разрядный', 'special-category dangerous cargo', 'industrial_safety'),
  (12, 'реверсивті қозғалыс', 'движение реверсивное', 'reversible traffic / bidirectional traffic', 'industrial_safety'),
  (13, 'рельс жымының алға шығуы', 'забегание рельсовых стыков', 'rail joint stagger', 'industrial_safety'),
  (14, 'рельстер арасындағы саңылау', 'зазор между рельсами', 'rail gap; rail joint gap', 'industrial_safety'),
  (15, 'радио байланыс арнасы', 'канал радиосвязи', 'radio communication channel', 'alerting_comms'),
  (16, 'рельстің омырылуы', 'излом рельса', 'rail fracture', 'industrial_safety'),
  (17, 'рельстің тозуы', 'износ рельса', 'rail wear', 'industrial_safety'),
  (18, 'реттегіш сына', 'клин регулировочный', 'adjustment wedge', 'industrial_safety'),
  (19, 'рельсті сынау', 'испытание рельса', 'rail testing', 'industrial_safety'),
  (20, 'реостат', 'реостат', 'rheostat', 'industrial_safety'),
  (21, 'реагенттер', 'реагенты', 'reagent', 'industrial_safety');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'Р';

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
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'Р') as r_now,
       (select count(*) from public.terms) as terms_now;

commit;
