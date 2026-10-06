-- =============================================================
-- Terms on «Ж» (Kazakh): the old cards are replaced by the 116 terms the
-- user sent («Ж- 116+анг.docx», kk / ru / en; row 12 had Kazakh and Russian
-- swapped, «руковов» corrected). Copy of the old cards:
-- supabase/backups/terms_kk_ZH_2026-10-06.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «Ж» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0048_replace_kk_zh_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'жемірілу', 'абразия', 'abrasion', 'industrial_safety'),
  (2, 'жерасты құрылысындағы авария', 'авария на подземном сооружении', 'accident at an underground facility', 'emergencies'),
  (3, 'жанармай құю', 'автозаправка', 'filling station', 'industrial_safety'),
  (4, 'желіні қорғау автоматы', 'автомат для защиты сети', 'circuit breaker', 'alerting_comms'),
  (5, 'жоғарғы сыныпты автомобиль', 'автомобиль высшего класса', 'luxury car', 'industrial_safety'),
  (6, 'жүк автомобилі', 'автомобиль грузовой', 'truck', 'industrial_safety'),
  (7, 'жең төсегіш автомобилі', 'автомобиль для прокладки рукавов', 'hose-laying vehicle', 'fire_safety'),
  (8, 'жеңқұбырлар салуға арналған автомобиль', 'автомобиль для прокладки рукавов', 'hose-laying vehicle', 'fire_safety'),
  (9, 'жабық автомобиль', 'автомобиль закрытый', 'enclosed vehicle', 'industrial_safety'),
  (10, 'жеңіл автомобиль', 'автомобиль легковой', 'passenger car', 'industrial_safety'),
  (11, 'жарық бергіш автомобиль', 'автомобиль освещения', 'lighting vehicle', 'fire_safety'),
  (12, 'жеңқұбырлы автомобиль', 'автомобиль рукавный', 'hose tender', 'fire_safety'),
  (13, 'жеңдік автомобиль', 'автомобиль рукавный', 'hose tender', 'fire_safety'),
  (14, 'жол талғамайтын автомобиль', 'автомобиль-вездеход', 'cross-country vehicle', 'fire_safety'),
  (15, 'жемірлік', 'агрессивность (хим.)', 'corrosivity', 'industrial_safety'),
  (16, 'жандандыру', 'активация', 'activation', 'industrial_safety'),
  (17, 'жедел ақпаратты талдау', 'анализ оперативной информации', 'analysis of operational information', 'coordination'),
  (18, 'жол дәріқобдиша', 'аптечка дорожная', 'vehicle first aid kit', 'disaster_medicine'),
  (19, 'жаңбырға қарсы бөгеуіл', 'барьер противодождевой', 'rain barrier', 'industrial_safety'),
  (20, 'жерасты суы алабы', 'бассейн подземных вод', 'groundwater basin', 'industrial_safety'),
  (21, 'жол қозғалыс қауіпсіздігі', 'безопасность дорожного движения', 'road traffic safety', 'industrial_safety'),
  (22, 'жеңіл бетон', 'бетон легкий', 'lightweight concrete', 'industrial_safety'),
  (23, 'жертөле', 'блиндаж', 'dugout', 'civil_defense'),
  (24, 'жауынгерлік мүмкіндік', 'боевая возможность', 'combat capability', 'civil_defense'),
  (25, 'жауынгерлік машық', 'боевая выучка', 'combat proficiency', 'civil_defense'),
  (26, 'жауынгерлік іс-қимыл', 'боевая деятельность', 'combat operations', 'civil_defense'),
  (27, 'жауынгерлік бірлік', 'боевая единица', 'combat unit', 'civil_defense'),
  (28, 'жауынгерлік тапсырма', 'боевая задача', 'combat mission', 'civil_defense'),
  (29, 'жауынгерлік қызмет', 'боевая служба', 'combat duty', 'civil_defense'),
  (30, 'жауынгерлік тиімділік', 'боевая эффективность', 'combat effectiveness', 'civil_defense'),
  (31, 'жауынгерлік кезекшілік', 'боевое дежурство', 'combat duty', 'civil_defense'),
  (32, 'жауынгерлік ту', 'боевое знамя', 'battle flag', 'civil_defense'),
  (33, 'жауынгерлік қамтамасыз ету', 'боевое обеспечение', 'combat support', 'civil_defense'),
  (34, 'жауынгерлік өрістету', 'боевое развертывание', 'combat deployment', 'civil_defense'),
  (35, 'жауынгерлік тәжірибе', 'боевой опыт', 'combat experience', 'civil_defense'),
  (36, 'жауынгерлік бұйрық', 'боевой приказ', 'combat order', 'civil_defense'),
  (37, 'жауынгерлік атқыштоп', 'боевой расчет', 'combat crew', 'civil_defense'),
  (38, 'жауынгерлік құрам', 'боевой состав', 'combat strength', 'civil_defense'),
  (39, 'жауынгерлік жарғы', 'боевой устав', 'combat manual', 'civil_defense'),
  (40, 'жұқпалы аурулар', 'болезни инфекционные', 'infectious diseases', 'disaster_medicine'),
  (41, 'жал', 'вал', 'shaft', 'industrial_safety'),
  (42, 'желдету', 'вентиляция', 'ventilation', 'industrial_safety'),
  (43, 'жедел болжам', 'версия оперативная', 'working hypothesis', 'coordination'),
  (44, 'жылулық жарылыс', 'взрыв тепловой', 'thermal explosion', 'industrial_safety'),
  (45, 'жару', 'взрывание', 'explosion', 'industrial_safety'),
  (46, 'жарғыш', 'взрыватель', 'fuze', 'civil_defense'),
  (47, 'жарылыс толқыны', 'взрывная волна', 'blast wave', 'industrial_safety'),
  (48, 'жаратын декомпрессия', 'взрывная декомпрессия', 'explosive decompression', 'industrial_safety'),
  (49, 'жарылыс жарақаты', 'взрывная травма', 'blast injury', 'disaster_medicine'),
  (50, 'жарылыс жұмыстары', 'взрывные работы', 'blasting operations', 'industrial_safety'),
  (51, 'жарылыс құрылғылары', 'взрывные устройства', 'explosive devices', 'industrial_safety'),
  (52, 'жарылыс қауіпсіздігі', 'взрывобезопасность', 'explosion safety', 'industrial_safety'),
  (53, 'жарылыстан қорғау', 'взрывозащищенность', 'explosion protection', 'industrial_safety'),
  (54, 'жарылыс қаупі бар қоспа', 'взрывоопасная смесь', 'explosive mixture', 'industrial_safety'),
  (55, 'жарылу қаупі', 'взрывоопасность', 'explosion hazard', 'industrial_safety'),
  (56, 'жарылыс қауіпті', 'взрывоопасный', 'explosive', 'industrial_safety'),
  (57, 'жарылу-өртену қаупі бар заттек', 'взрывопожарное вещество', 'fire- and explosion-hazardous substance', 'fire_safety'),
  (58, 'жарылыс-техникалық топ', 'взрывотехническая группа', 'Explosive Ordnance Disposal (EOD) Team', 'civil_defense'),
  (59, 'жарылысты техникалық жұмыстар', 'взрывотехнические работы', 'explosive ordnance disposal (EOD) operations', 'civil_defense'),
  (60, 'жарылыс-техникалық зерттеу', 'взрывотехническое исследование', 'explosive ordnance examination', 'civil_defense'),
  (61, 'жарылысқа төзімділік', 'взрывоустойчивость', 'blast resistance', 'industrial_safety'),
  (62, 'жарылғыш қасиеті', 'взрывчатые свойства', 'explosive properties', 'industrial_safety'),
  (63, 'жазалау; өндіріп алу', 'взыскание', 'penalty', 'civil_defense'),
  (64, 'жылжымалы бастоған', 'водозабор передвижной', 'mobile water intake', 'fire_safety'),
  (65, 'жауынгер', 'воин', 'serviceman', 'civil_defense'),
  (66, 'жауынгерлік айбын', 'воинская доблесть', 'military valor', 'civil_defense'),
  (67, 'жауынгерлік абырой', 'воинская честь', 'military honour', 'civil_defense'),
  (68, 'жауынгерлік', 'воинский', 'military', 'civil_defense'),
  (69, 'жанартау', 'вулкан', 'volcano', 'emergencies'),
  (70, 'жанартаулық жер сілкінісі', 'вулканическое землетрясение', 'volcanic earthquake', 'emergencies'),
  (71, 'жанартау атқылауы', 'вулканическое извержение', 'volcanic eruption', 'emergencies'),
  (72, 'желдету', 'выветривание', 'weathering', 'industrial_safety'),
  (73, 'жанып кету', 'выгорать', 'burn out', 'fire_safety'),
  (74, 'жылжымалы өрт сөндіру сатысы', 'выдвижная пожарная лестница', 'extension fire ladder', 'fire_safety'),
  (75, 'жылу бөліну', 'выделение тепла', 'heat release', 'industrial_safety'),
  (76, 'жоғары температурада қайнайтын органикалық заттектер', 'высококипящие органические вещества', 'high-boiling organic substances', 'industrial_safety'),
  (77, 'жоғары температурада қайнайтын қалдықтар', 'высококипящие остатки', 'high-boiling residues', 'industrial_safety'),
  (78, 'жоғары күкіртті газ', 'высокосернистый газ', 'high-sulfur gas', 'industrial_safety'),
  (79, 'жоғары температуралы аймақ', 'высокотемпературная зона', 'high-temperature zone', 'industrial_safety'),
  (80, 'жоғары жиілікті қондырғы', 'высокочастотная установка', 'high-frequency installation', 'industrial_safety'),
  (81, 'жүк көтеру биіктігі', 'высота подъема груза', 'load lifting height', 'industrial_safety'),
  (82, 'жоғарғы көрсеткіш', 'высший показатель', 'highest indicator', 'coordination'),
  (83, 'жандандыру, серпіліс беру', 'генерировать', 'generate', 'coordination'),
  (84, 'жер сілкінісі гипосентрі', 'гипоцентр землетрясения', 'earthquake hypocenter', 'emergencies'),
  (85, 'жаһандану', 'глобализация', 'globalisation', 'coordination'),
  (86, 'жаһандық ластану', 'глобальное загрязнение', 'global pollution', 'industrial_safety'),
  (87, 'жану', 'горение', 'combustion', 'fire_safety'),
  (88, 'жанғыштық', 'горючесть', 'flammability', 'fire_safety'),
  (89, 'жанғыш газдар', 'горючие газы', 'flammable gases', 'fire_safety'),
  (90, 'жанғыш пайдалы қазбалар', 'горючие полезные ископаемые', 'combustible minerals', 'industrial_safety'),
  (91, 'жедел желі', 'горячая линия', 'hotline', 'coordination'),
  (92, 'жүк', 'груз', 'load', 'industrial_safety'),
  (93, 'жүк мәшинесі', 'грузовик', 'truck', 'industrial_safety'),
  (94, 'жолдың жүктасымалдылығы', 'грузонапряженность дороги', 'traffic load', 'industrial_safety'),
  (95, 'жүк тасымалы', 'грузоперевозки', 'freight transportation', 'industrial_safety'),
  (96, 'жүк тасқыны', 'грузопоток', 'freight flow', 'industrial_safety'),
  (97, 'жедел жауынгерлік қалқалау тобы', 'группа оперативно-боевого прикрытия', 'operational combat support team', 'civil_defense'),
  (98, 'жедел сарапшылық қолдау және ынтымақтастық тобы', 'группа оперативной экспертной поддержки и сотрудничества', 'Operational Expert Support and Cooperation Group', 'coordination'),
  (99, 'жоғары деңгейдегі жоспарлау тобы', 'группа планирования высокого уровня (гпву)', 'High-Level Planning Group (HLPG)', 'coordination'),
  (100, 'жұмысшы топ', 'группа рабочая', 'working group', 'coordination'),
  (101, 'жауынгерлік резерв тобы', 'группа резерва боевого', 'combat reserve group', 'civil_defense'),
  (102, 'жанасу датчигі', 'датчик касания', 'touch sensor', 'alerting_comms'),
  (103, 'жоғары айналымды қозғалтқыш', 'двигатель высокооборотный', 'high-speed engine', 'industrial_safety'),
  (104, 'жылулық қозғалтқыш', 'двигатель тепловой', 'heat engine', 'industrial_safety'),
  (105, 'жергілікті жол қозғалысы', 'движение дорожное местное', 'local road traffic', 'industrial_safety'),
  (106, 'жылулық қозғалыс', 'движение тепловое', 'thermal motion', 'industrial_safety'),
  (107, 'жарылыс', 'детонация', 'detonation', 'industrial_safety'),
  (108, 'жол ұзындығы', 'длина пути', 'path length', 'industrial_safety'),
  (109, 'жас өрт сөндірушілер жасағы', 'дружина юных пожарных', 'Young Firefighters'' Brigade', 'fire_safety'),
  (110, 'жеңқұбыр қысқышы', 'зажим рукавный', 'fire hose clamp', 'fire_safety'),
  (111, 'жерге тұйықтау', 'заземление', 'earthing / grounding', 'industrial_safety'),
  (112, 'жанғыш газ қорлары', 'запасы горючих газов', 'stocks of flammable gases', 'industrial_safety'),
  (113, 'жергілікті жердің зақымдануы', 'заражение местности', 'contamination of the area', 'civil_defense'),
  (114, 'жобадан тыс авария', 'запроектная авария', 'beyond-design-basis accident (BDBA)', 'emergencies'),
  (115, 'жемірілулік қорғаныс', 'защита от коррозии', 'corrosion protection', 'industrial_safety'),
  (116, 'жер сілкінісі', 'землетрясение', 'earthquake', 'emergencies');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'Ж';

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
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'Ж') as zh_now,
       (select count(*) from public.terms) as terms_now;

commit;
