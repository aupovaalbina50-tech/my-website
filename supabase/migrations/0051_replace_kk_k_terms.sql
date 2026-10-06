-- =============================================================
-- Terms on «К» (Kazakh): the old cards are replaced by the 98 terms the
-- user sent («к-99+англ.docx», kk / ru / en; typos corrected: Cyrillic «с» in
-- classical, «now avalanche», English of аэрация, бақылаау, two hyphens).
-- Copy of the old cards: supabase/backups/terms_kk_K_2026-10-06.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «К» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0051_replace_kk_k_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'күн белсенділігі', 'активность солнечная', 'solar activity', 'industrial_safety'),
  (2, 'кермек су', 'вода жесткая', 'hard water', 'industrial_safety'),
  (3, 'капилляр суы', 'вода капиллярная', 'capillary water', 'industrial_safety'),
  (4, 'кәріз сулары', 'воды дренажные', 'drainage water, drainage effluent', 'industrial_safety'),
  (5, 'күмбез тәрізді қырат', 'возвышенность куполовидная', 'dome-shaped upland, domed elevation', 'industrial_safety'),
  (6, 'климатқа әсер', 'воздействие на климат', 'climate impact, climatic effect', 'industrial_safety'),
  (7, 'көлік әсері', 'воздействие транспорта', 'transport impact', 'industrial_safety'),
  (8, 'күйдіргішөп (бот.)', 'волдырник (бот.)', 'cucubalus', 'industrial_safety'),
  (9, 'көтерілу толқыны', 'волна приливная', 'tidal wave, tide wave', 'emergencies'),
  (10, 'кездесушілік', 'встречаемость', 'occurrence', 'coordination'),
  (11, 'килігу', 'вторгнуться', 'to invade', 'civil_defense'),
  (12, 'көміртектік бірліктердің қайта айналымы', 'вторичный оборот углеродных единиц', 'secondary carbon unit turnover, secondary carbon offset trading', 'industrial_safety'),
  (13, 'келтірілген шығарынды', 'выброс приведенный', 'specific emission, equivalent emission, normalized emission', 'industrial_safety'),
  (14, 'күйіп кету', 'выгорание', 'burnout, depletion, burnup', 'industrial_safety'),
  (15, 'күн күркіреу', 'гром', 'thunder', 'emergencies'),
  (16, 'көріну қашықтығы', 'дальность видимости', 'visibility, visibility range', 'industrial_safety'),
  (17, 'кендіржапырақ (бот.)', 'датиска (бот.)', 'datisca', 'industrial_safety'),
  (18, 'кеміргішжою', 'дератизация', 'deratization, pest control', 'disaster_medicine'),
  (19, 'кентсіздену', 'деурбанизация', 'deurbanization, counterurbanization', 'industrial_safety'),
  (20, 'кенжар қысымы', 'забойное давление', 'bottomhole pressure, downhole pressure', 'industrial_safety'),
  (21, 'кәсіптік ауру', 'заболевание профессиональное', 'occupational disease', 'disaster_medicine'),
  (22, 'күнге күю, күнқақтылық', 'загар', 'sunburn, tan', 'disaster_medicine'),
  (23, 'кездейсоқ ластану', 'загрязнение случайное', 'accidental pollution, accidental contamination', 'industrial_safety'),
  (24, 'кезеңдік цикл заңы', 'закон периодического цикла', 'periodic law', 'industrial_safety'),
  (25, 'кәсіпшілік аулау қоры', 'запас промысловый', 'commercial stock, fishable stock, exploitable stock', 'industrial_safety'),
  (26, 'кертік', 'зарубка', 'notch, kerf, score', 'industrial_safety'),
  (27, 'кесіп белгілеу', 'засека', 'abatis, intersection', 'civil_defense'),
  (28, 'күннің батуы', 'заход солнца', 'sunset', 'industrial_safety'),
  (29, 'көшіп келу, иммиграция', 'иммиграция', 'immigration', 'industrial_safety'),
  (30, 'климаттық ауысу', 'инверсия климатическая', 'climatic inversion', 'industrial_safety'),
  (31, 'күннің белсенділік индексі', 'индекс солнечной активности', 'solar activity index', 'industrial_safety'),
  (32, 'көбею инерциясы', 'инерция размножения', 'reproductive inertia', 'industrial_safety'),
  (33, 'карьер (ашық кеніш) алаңы', 'карьерное поле', 'open-pit mine field / quarry field', 'industrial_safety'),
  (34, 'катаклизм', 'катаклизм', 'cataclysm', 'emergencies'),
  (35, 'катакомба', 'катакомба', 'catacomb', 'industrial_safety'),
  (36, 'кинетикалық энергия', 'кинетическая энергия', 'kinetic energy', 'industrial_safety'),
  (37, 'классикалық механика', 'классическая механика', 'classical mechanics', 'industrial_safety'),
  (38, 'кездесу жиілігі кластары', 'классы встречаемости', 'frequency classes, occurrence classes', 'coordination'),
  (39, 'климаттық климакс', 'климакс климатический', 'climatic climax', 'industrial_safety'),
  (40, 'климат карталары', 'климатические карты', 'climatic maps, climate maps', 'industrial_safety'),
  (41, 'климаттық маусымдар', 'климатические сезоны', 'climatic seasons', 'industrial_safety'),
  (42, 'климаттық факторлар', 'климатические факторы', 'climate factors', 'industrial_safety'),
  (43, 'көшкін', 'лавина', 'avalanche, snow avalanche', 'emergencies'),
  (44, 'күндізгі жарық беру шамы', 'лампа дневного света', 'daylight fluorescent lamp, fluorescent lamp', 'industrial_safety'),
  (45, 'курорт орманы', 'лес курортный', 'resort forest, recreational forest', 'industrial_safety'),
  (46, 'күңгіртқылқанды орман', 'лес темнохвойный', 'dark coniferous forest', 'industrial_safety'),
  (47, 'кемемен ағаш тасымалдау', 'лесосплав судовой', 'timber rafting, log driving', 'industrial_safety'),
  (48, 'көшбасшы', 'лидер', 'leader', 'coordination'),
  (49, 'көлдете суару', 'лиманное орошение', 'liman irrigation, basin irrigation', 'industrial_safety'),
  (50, 'көкжиек сызықтары', 'линии горизонта', 'horizon lines', 'industrial_safety'),
  (51, 'кәсіпшілік лицензия', 'лицензия промысловая', 'commercial fishing, hunting license, harvesting license', 'industrial_safety'),
  (52, 'көбею орны', 'место размножения', 'breeding site, breeding ground', 'industrial_safety'),
  (53, 'кері байланыс механизмі', 'механизм обратной связи', 'feedback mechanism', 'alerting_comms'),
  (54, 'көші-қон (адамдар), қоныс аудару (жануарлар), өрістеу (балық), келу-қайту (құстар), таралу, жылыстау', 'миграция', 'migration', 'industrial_safety'),
  (55, 'катадромдық өрістеу', 'миграция катадромная', 'catadromous migration', 'industrial_safety'),
  (56, 'көпқұрамдасты катализатор', 'многокомпонентный катализатор', 'multi-component catalyst, multicomponent catalyst', 'industrial_safety'),
  (57, 'көпжылдық', 'многолетник', 'perennial plant, perennial', 'industrial_safety'),
  (58, 'көппараметрлі талдау', 'многопараметрический анализ', 'multiparameter analysis, multivariable analysis', 'industrial_safety'),
  (59, 'көпкезеңді дезактивация', 'многостадийная дезактивация', 'multistage deactivation', 'industrial_safety'),
  (60, 'көпкезеңді ферментация', 'многостадийная ферментация', 'multistage fermentation', 'industrial_safety'),
  (61, 'көпсатылы аэрация', 'многоступенчатая аэрация', 'multistage aeration', 'industrial_safety'),
  (62, 'көпдеңгейлі байланыстар', 'многоуровневые связи', 'multi-level connections, multilevel links', 'alerting_comms'),
  (63, 'көзбен бақылау', 'наблюдение визуальное', 'visual observation, visual monitoring', 'industrial_safety'),
  (64, 'көтере алатын жүктеме', 'нагрузка переносимая', 'carried load, portable load, transmissible load', 'industrial_safety'),
  (65, 'көлбеу бұрғылау', 'наклонное бурение', 'slant drilling, directional drilling', 'industrial_safety'),
  (66, 'кернеу, ширығу', 'напряжение', 'voltage, stress', 'industrial_safety'),
  (67, 'катодтық кернеу', 'напряжение катодное', 'cathode voltage, cathodic potential', 'industrial_safety'),
  (68, 'келеңсіз әсер', 'негативное воздействие', 'negative impact', 'industrial_safety'),
  (69, 'код әліпбиі', 'алфавит кода', 'code alphabet', 'alerting_comms'),
  (70, 'кодталған карта', 'кодированная карта', 'coded map', 'alerting_comms'),
  (71, 'кодтау', 'кодирование', 'encoding, coding', 'alerting_comms'),
  (72, 'кодтық жүйелілік', 'кодовая последовательность', 'code sequence, codeword sequence', 'alerting_comms'),
  (73, 'кодтық кесте', 'кодовая таблица', 'code table, code page', 'alerting_comms'),
  (74, 'кокарда', 'кокарда', 'cockade', 'civil_defense'),
  (75, 'коллиматорды ортануға арналған кронштейн', 'кронштейн для установки коллиматора', 'collimator mount, collimator bracket', 'civil_defense'),
  (76, 'команда (алдын ала орындайтын)', 'команда', 'command, order', 'civil_defense'),
  (77, 'команда беру', 'скомандовать', 'to give a command, to order', 'civil_defense'),
  (78, 'командалық құрам', 'командный состав', 'command staff, commanding personnel, officers', 'civil_defense'),
  (79, 'командалық политаждық – навигациялық жүйе', 'командные политажно –навигационные системы', 'command flight and navigation systems', 'civil_defense'),
  (80, 'командалық пункттың ақпараттық қабілеті', 'информационная способность командного пункта', 'information capacity of a command post', 'civil_defense'),
  (81, 'командалық шек', 'высота командная', 'command height, dominant height', 'civil_defense'),
  (82, 'командалық бақылау пункты', 'командно-наблюдательный пункт', 'command and observation post', 'civil_defense'),
  (83, 'командалық өлшеу кешені', 'командно-измерительный комплекс', 'command and tracking station', 'civil_defense'),
  (84, 'командир', 'командир', 'commander, commanding officer', 'civil_defense'),
  (85, 'командир жәшігі', 'командирский ящик', 'commander''s map case, commander''s kit', 'civil_defense'),
  (86, 'командир шешімі', 'решение командира', 'commander''s decision', 'civil_defense'),
  (87, 'командирдің ниеті', 'замысел командира', 'commander''s intent, commander''s concept', 'civil_defense'),
  (88, 'командирлерге таныстыру тәртібі', 'порядок представления командирам', 'procedure for reporting to commanders', 'civil_defense'),
  (89, 'командирлік даярлық', 'командирская подготовка', 'commander training, officer professional development', 'civil_defense'),
  (90, 'командирлік ұшулар', 'командирские полеты', 'commander''s flights, proficiency flights', 'civil_defense'),
  (91, 'комбинациялық логикалық құрылғы', 'комбинационное логическое устройство', 'combinational logic circuit, combinational logic device', 'alerting_comms'),
  (92, 'комбинациялық сұлбалар', 'комбинационные схемы', 'combinational circuits', 'alerting_comms'),
  (93, 'комбинациялық функциялар', 'комбинационные функции', 'combinational functions', 'alerting_comms'),
  (94, 'комендант', 'комендант', 'commandant, provost marshal', 'civil_defense'),
  (95, 'коменданттық басқарма', 'комендантское управление', 'commandant''s office, provost administration', 'civil_defense'),
  (96, 'коменданттық команда', 'команда комендантская', 'commandant''s detachment, provost team', 'civil_defense'),
  (97, 'коменданттық қызмет', 'комендантская служба', 'provost service, commandant''s service', 'civil_defense'),
  (98, 'коменданттық сағат', 'комендантский час', 'curfew', 'civil_defense');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'К';

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
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'К') as k_now,
       (select count(*) from public.terms) as terms_now;

commit;
