-- =============================================================
-- Terms on «Г» (Kazakh): the 42 old cards are replaced by the 65 terms the
-- user sent («Г-66 + англ.docx», kk / ru / en; one exact repeat in the file
-- is added once, three cut-off words completed). Copy of the old cards:
-- supabase/backups/terms_kk_G_2026-10-05.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «Г» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0039_replace_kk_g_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'газбен өрт сөндірудің автоматты жүйесі', 'автоматическая система газового пожаротушения', 'automatic gas fire suppression system', 'fire_safety'),
  (2, 'газ-түтіннен қорғау қызметінің автомобилі', 'автомобиль газодымозащитной службы', 'gas and smoke protection service vehicle', 'fire_safety'),
  (3, 'газды шабуыл', 'газовая атака', 'gas attack', 'civil_defense'),
  (4, 'газ-түтіннен қорғау қызметі', 'газодымозащитная служба', 'gas and smoke protection service', 'fire_safety'),
  (5, 'галванилік элемент', 'гальванический элемент', 'galvanic cell', 'industrial_safety'),
  (6, 'гарнизондық қызмет', 'гарнизонная служба', 'garrison service', 'civil_defense'),
  (7, 'гарнизон жарғысы', 'гарнизонный устав', 'garrison regulations', 'civil_defense'),
  (8, 'генерал-полковник', 'генерал-полковник', 'Colonel General', 'civil_defense'),
  (9, 'гидравликалық жетек', 'гидравлический привод', 'hydraulic drive', 'industrial_safety'),
  (10, 'гидро қақпақша', 'гидроклапан', 'hydraulic valve', 'industrial_safety'),
  (11, 'гидроцилиндр', 'гидроцилиндр', 'hydraulic cylinder', 'industrial_safety'),
  (12, 'гильза, оққауыз', 'гильза', 'cartridge case', 'civil_defense'),
  (13, 'гуманитарлық көмек', 'гуманитарная помощь', 'humanitarian aid; humanitarian assistance', 'coordination'),
  (14, 'газсыздандыру пункті', 'дегазационный пункт', 'decontamination station', 'civil_defense'),
  (15, 'газсыздандыру', 'дегазация', 'decontamination', 'civil_defense'),
  (16, 'гарнизон бастығы', 'начальник гарнизона', 'garrison commander', 'civil_defense'),
  (17, 'газ-түтіннен қорғау қызметінің өрт сөндірушісі', 'пожарный газодымозащитной службы', 'gas and smoke protection firefighter', 'fire_safety'),
  (18, 'газтұтқы', 'противогаз', 'gas mask; ABC-protective mask', 'civil_defense'),
  (19, 'газтұмша', 'противогаз', 'gas mask; ABC-protective mask', 'civil_defense'),
  (20, 'географиялық ландшафт', 'географический ландшафт', 'geographical landscape', 'industrial_safety'),
  (21, 'газдануды бақылау', 'контроль загазованности', 'gas concentration monitoring', 'industrial_safety'),
  (22, 'газ шығындысы', 'выхлоп газа', 'gas exhaust; gas emission', 'industrial_safety'),
  (23, 'газ өткізгіш магистралі', 'газопровод магистральный', 'main gas pipeline; gas transmission pipeline', 'industrial_safety'),
  (24, 'гидрофобтандырғыш сұйықтық', 'жидкость гидрофобизирующая', 'hydrophobizing liquid', 'industrial_safety'),
  (25, 'гидратқа қарсы тежегіштер', 'антигидратные ингибиторы', 'antihydrate inhibitors', 'industrial_safety'),
  (26, 'газ тасымалдағыш', 'газ-носитель', 'carrier gas; gas carrier', 'industrial_safety'),
  (27, 'газ-күйе қоспасы', 'газо-сажевая смесь', 'gas-soot mixture', 'industrial_safety'),
  (28, 'газ фазасы', 'газовая фаза', 'gas phase', 'industrial_safety'),
  (29, 'газ кен орны', 'газовое месторождение', 'gas field', 'industrial_safety'),
  (30, 'газ режімі', 'газовый режим', 'gas regime', 'industrial_safety'),
  (31, 'газ конденсаттық кен орны', 'газоконденсатное месторождение', 'gas-condensate field', 'industrial_safety'),
  (32, 'газды қабаттар', 'газоносные пласты', 'gas-bearing strata', 'industrial_safety'),
  (33, 'газфазалық реакция', 'газофазная реакция', 'gas-phase reaction', 'industrial_safety'),
  (34, 'газфазалық термиялық үдеріс', 'газофазовый термический процесс', 'gas-phase thermal process', 'industrial_safety'),
  (35, 'газ сақтау бөлімі', 'газохранилище', 'gas storage facility', 'industrial_safety'),
  (36, 'геологиялық ерекшелік', 'геологическая особенность', 'geological feature', 'industrial_safety'),
  (37, 'геологиялық саты', 'геологическая ступень', 'geological stage', 'industrial_safety'),
  (38, 'геофизикалық жұмыстар', 'геофизические работы', 'geophysical operations', 'industrial_safety'),
  (39, 'геохимиялық жұмыстар', 'геохимические работы', 'geochemical operations', 'industrial_safety'),
  (40, 'гидраттық тығын', 'гидратная пробка', 'hydrate plug', 'industrial_safety'),
  (41, 'гидродинамикалық есептеулер', 'гидродинамические расчеты', 'hydrodynamic calculations', 'industrial_safety'),
  (42, 'гидрокарбонилдік кешендер', 'гидрокарбонильные комплексы', 'hydrocarbonyl complexes', 'industrial_safety'),
  (43, 'гидропероксидтер', 'гидропероксиды', 'hydroperoxides', 'industrial_safety'),
  (44, 'гумин қышқылы', 'гуминовая кислота', 'humic acid', 'industrial_safety'),
  (45, 'газ десорбциясы', 'десорбция газа', 'gas desorption', 'industrial_safety'),
  (46, 'газ қоры', 'запас газа', 'gas reserves', 'industrial_safety'),
  (47, 'геометриялық изомерлер', 'изомеры геометрические', 'geometric isomers', 'industrial_safety'),
  (48, 'газды құрғату', 'осушка газа', 'gas dehydration', 'industrial_safety'),
  (49, 'газ сынамасы', 'проба газа', 'gas sample', 'industrial_safety'),
  (50, 'газ тасымалы', 'транспорт газа', 'gas transportation', 'industrial_safety'),
  (51, 'газдандырғыш', 'газификатор', 'gasifier; gas generator', 'industrial_safety'),
  (52, 'геодезиялық негіз', 'геодезическая основа', 'geodetic framework', 'industrial_safety'),
  (53, 'гигроскопиялық ылғал', 'гигроскопическая влажность', 'hygroscopic moisture content', 'industrial_safety'),
  (54, 'гидротазалау', 'гидроочистка', 'hydrotreating', 'industrial_safety'),
  (55, 'гидроперфоратор', 'гидроперфоратор', 'hydraulic rock drill / hydraulic drill', 'industrial_safety'),
  (56, 'гидростаздық қысым', 'гидростатическое давление', 'hydrostatic pressure', 'industrial_safety'),
  (57, 'гидросоққылы бұрғылау', 'гидроударное бурение', 'hydraulic percussion drilling', 'industrial_safety'),
  (58, 'газ концентрациясы', 'концентрация газа', 'gas concentration', 'industrial_safety'),
  (59, 'газдың жылыстауы', 'миграция газа', 'gas migration', 'industrial_safety'),
  (60, 'гидрогеодинамикалық аномалия', 'аномалия гидрогеодинамическая', 'hydrogeodynamic anomaly', 'industrial_safety'),
  (61, 'гидрогеологиялық алап', 'бассейн гидрогеологический', 'hydrogeological basin', 'industrial_safety'),
  (62, 'геологиялық блок', 'блок геологический', 'geological block', 'industrial_safety'),
  (63, 'газқалпақ газы', 'газ газовых шапок', 'gas-cap gas', 'industrial_safety'),
  (64, 'газконденсат жатындар газы', 'газ газоконденсатных залежей', 'gas of gas-condensate deposits; gas in gas-condensate reservoirs', 'industrial_safety'),
  (65, 'газды гидраттар', 'газовые гидраты', 'gas hydrates', 'industrial_safety');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'Г';

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
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'Г') as g_now,
       (select count(*) from public.terms) as terms_now;

commit;
