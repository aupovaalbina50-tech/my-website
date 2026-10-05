-- =============================================================
-- Terms on «Б» (Kazakh): the 81 old cards are replaced by the 59 terms the
-- user sent («Б-59 + англ.docx», kk / ru / en). Copy of the old cards:
-- supabase/backups/terms_kk_B_2026-10-05.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «Б» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0035_replace_kk_b_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'бұранда', 'винт', 'screw', 'industrial_safety'),
  (2, 'бастиек', 'головка', 'head', 'fire_safety'),
  (3, 'бықсып жану', 'горение затяжное', 'smouldering combustion', 'fire_safety'),
  (4, 'бықси жану', 'горение затяжное', 'smouldering combustion', 'fire_safety'),
  (5, 'барлау тобы', 'группа разведки', 'reconnaissance team', 'civil_defense'),
  (6, 'бөген', 'дамба', 'levee / dike', 'industrial_safety'),
  (7, 'біліктіліктен айыру', 'дисквалификация', 'disqualification', 'coordination'),
  (8, 'баянжазба', 'докладная (записка)', 'memorandum (memo)', 'coordination'),
  (9, 'баянхат', 'докладная записка', 'memorandum', 'coordination'),
  (10, 'бөгесін (уақытша істелген)', 'запруда', 'impound', 'industrial_safety'),
  (11, 'барлау аймағы', 'зона разведки', 'reconnaissance zone', 'civil_defense'),
  (12, 'біліктілік', 'квалификация', 'qualification', 'coordination'),
  (13, 'батальон командир', 'командир батальона', 'battalion commander', 'civil_defense'),
  (14, 'батарея командирі', 'командир батареи', 'battery commander', 'civil_defense'),
  (15, 'бөлімше командирі', 'командир отделения', 'squad leader', 'civil_defense'),
  (16, 'бүркемелеу', 'маскировка', 'camouflage', 'civil_defense'),
  (17, 'бүркемелеу іс-шаралары', 'маскировочные мероприятия', 'camouflage measures', 'civil_defense'),
  (18, 'бүркемелеу бөлімшелері', 'маскировочные подразделения', 'camouflage units', 'civil_defense'),
  (19, 'байқаушылық', 'наблюдаемость', 'observability', 'coordination'),
  (20, 'бейтараптану', 'нейтрализация', 'neutralization', 'industrial_safety'),
  (21, 'бейтараптандыру', 'нейтрализация', 'neutralization', 'industrial_safety'),
  (22, 'бөлімше', 'отделение', 'squad/ section', 'civil_defense'),
  (23, 'бөлік', 'отсек', 'compartment', 'industrial_safety'),
  (24, 'байланыс офицері', 'офицер связи', 'liaison officer', 'alerting_comms'),
  (25, 'беріліс функциясы', 'передаточная функция', 'transfer function', 'industrial_safety'),
  (26, 'бөгет', 'плотина', 'dam', 'industrial_safety'),
  (27, 'бақылау жолағы', 'полоса наблюдения', 'observation sector', 'civil_defense'),
  (28, 'бүркемелеу жолағы', 'полоса прикрытия', 'covering zone', 'civil_defense'),
  (29, 'барлау жолағы', 'полоса разведки', 'reconnaissance zone', 'civil_defense'),
  (30, 'бекет', 'пост', 'post', 'civil_defense'),
  (31, 'барлау авиациясы', 'разведывательная авиация', 'reconnaissance aviation / reconnaissance aircraft', 'civil_defense'),
  (32, 'барлау тобы', 'разведывательная группа', 'reconnaissance group', 'civil_defense'),
  (33, 'барлау-оқ ату кешені', 'разведывательно-огневой комплекс', 'reconnaissance and fire system', 'civil_defense'),
  (34, 'барлау-іздестіру тобы', 'разведывательно-поисковая группа', 'reconnaissance and search group', 'civil_defense'),
  (35, 'барлау деректері', 'разведывательные данные', 'intelligence data', 'civil_defense'),
  (36, 'барлау мәліметтері', 'разведывательные сведения', 'intelligence information / results of reconnaisance', 'civil_defense'),
  (37, 'барлау отряды', 'разведывательный отряд', 'reconnaissance detachment', 'civil_defense'),
  (38, 'баянат', 'рапорт', 'report', 'coordination'),
  (39, 'бедер', 'рельеф', 'terrain', 'civil_defense'),
  (40, 'байланысшы', 'связник', 'liaison officer', 'alerting_comms'),
  (41, 'бастапқы өрт сөндіру құралдары', 'средства первичного пожаротушения', 'portable fire-fighting equipment', 'fire_safety'),
  (42, 'бастау уақыты', 'стартовое время', 'start time', 'coordination'),
  (43, 'байланыс торабы', 'узел связи', 'communications center', 'alerting_comms'),
  (44, 'байрақ', 'штандарт', 'standard', 'civil_defense'),
  (45, 'биологиялық ластану', 'биологическое загрязнение', 'biological contamination', 'industrial_safety'),
  (46, 'браконьер', 'браконьер', 'poacher', 'industrial_safety'),
  (47, 'браконьерлік', 'браконьерство', 'poaching', 'industrial_safety'),
  (48, 'батпақтанғандық', 'заболоченность', 'wetland conditions', 'industrial_safety'),
  (49, 'бұташық', 'кустарничек', 'dwarf shrub', 'industrial_safety'),
  (50, 'бастапқы орман', 'лес первичный', 'primary forest', 'industrial_safety'),
  (51, 'бас арна', 'магистральный канал', 'main canal', 'industrial_safety'),
  (52, 'бұлтартпас дәлелдер', 'неопровержимые доказательства', 'conclusive evidence', 'coordination'),
  (53, 'бұрма арық', 'отводной арык', 'diversion canal', 'industrial_safety'),
  (54, 'биологиялық ыдырамайтын қалдықтар', 'отходы биологически неразложимые', 'non-biodegradable waste', 'industrial_safety'),
  (55, 'биологиялық ыдырайтын қалдықтар', 'отходы биологически разложимые', 'biodegradable waste', 'industrial_safety'),
  (56, 'биологиялық өнім', 'продукция биологическая', 'biological products', 'industrial_safety'),
  (57, 'бағалы тері кәсіпшілігі', 'промысел пушной', 'fur trapping; fur hunting', 'industrial_safety'),
  (58, 'балық кәсіпшілігі', 'промысел рыбный', 'fishing; commercial fishing', 'industrial_safety'),
  (59, 'биологиялық алуантүрлілік', 'разнообразие биологическое', 'biodiversity; biological diversity', 'industrial_safety');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'Б';

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
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'Б') as b_now,
       (select count(*) from public.terms) as terms_now;

commit;
