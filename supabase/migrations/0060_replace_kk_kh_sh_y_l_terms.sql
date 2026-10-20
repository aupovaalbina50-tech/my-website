-- Terms on «Х», «Ш», «Ы», «Л» (Kazakh): the old cards are replaced by the
-- user's lists (kk / ru / en): «Х» — 39, «Ш» — 35, «Ы» — 91, «Л» — 82
-- (247 terms). Exact duplicates inside the lists are dropped (лақтыра жарылыс,
-- лездік жару, ықтималдық логика). Typos corrected: оповещание, пульсирующое,
-- влагопоглатителей, «автомобиль пожарной штабной», «шығындары өтеу»,
-- «әлеуметті» (→ әлеуетті), enetrnity, preassure; two Russian cells that held
-- the Kazakh text got the Russian term (коэффициент потерь, дальность метания).
-- None of the user's earlier lists (0033–0052) has a term on these letters.
--
-- Before the change every old card on these letters is copied to
-- public.terms_backup_2026_10_20 (closed to the site by RLS).
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- cards on these letters are deleted (their user rows go with them, on delete
-- cascade), the rest of the new terms are inserted.
--
-- One DO block, so it runs as a single statement in the Supabase SQL Editor
-- (which does not keep temp tables between statements) and is all-or-nothing.
-- Running it again is safe: the backup skips cards already copied.
--
-- Apply: Supabase → SQL Editor → paste this file → Run
--   or:  npx supabase db query --linked -f supabase/migrations/0060_replace_kk_kh_sh_y_l_terms.sql

create table if not exists public.terms_backup_2026_10_20 as
select * from public.terms where false;
alter table public.terms_backup_2026_10_20 enable row level security;

do $$
begin
  insert into public.terms_backup_2026_10_20
  select t.* from public.terms t
  where upper(left(trim(t.kk), 1)) in ('Х', 'Ш', 'Ы', 'Л')
    and not exists (select 1 from public.terms_backup_2026_10_20 b where b.id = t.id);

  drop table if exists pg_temp.new_t, pg_temp.old_t, pg_temp.keep_map;

  create temp table new_t (n int, kk text, ru text, en text, category text);
  insert into new_t values
  (1, 'химиялық авария', 'химическая авария', 'chemical accident', 'emergencies'),
  (2, 'химиялық дабыл', 'химическая тревога', 'chemical alarm', 'civil_defense'),
  (3, 'химиялық бақылау', 'химический контроль', 'chemical control', 'civil_defense'),
  (4, 'химиялық байқау', 'химическое наблюдение', 'chemical surveillance', 'civil_defense'),
  (5, 'халықтың жас-жыныстық құрылымы', 'возрастно-половая структура населения', 'age-sex structure of the population', 'coordination'),
  (6, 'халықтың жас-жыныстық пирамидасы', 'возрастно-половая пирамида населения', 'population age-sex pyramid', 'coordination'),
  (7, 'хабарлау уақыты', 'время сообщения', 'reporting time', 'alerting_comms'),
  (8, 'халықтың географиялық құрылымы', 'географическая структура населения', 'geographical structure of the population', 'coordination'),
  (9, 'халық қозғалысы', 'движение населения', 'population movement', 'coordination'),
  (10, 'халықтың демографиялық құрылымы', 'демографическая структура населения', 'demographic structure of the population', 'coordination'),
  (11, 'халықтың табиғи қозғалысы', 'естественное движение населения', 'natural population change', 'coordination'),
  (12, 'хабаршы', 'информатор', 'informant', 'alerting_comms'),
  (13, 'хабарламаның ақпараттық оңтайландырылуы', 'информационная оптимизация сообщения', 'message optimization', 'alerting_comms'),
  (14, 'хабар беру', 'информирование', 'information provision', 'alerting_comms'),
  (15, 'хабарлау коды', 'код сообщения', 'message code', 'alerting_comms'),
  (16, 'халық саны өсуін бақылау', 'контроль роста численности населения', 'population growth control', 'coordination'),
  (17, 'химиялық жемірілу', 'коррозия химическая', 'chemical corrosion', 'industrial_safety'),
  (18, 'халықаралық жария құқық', 'международное публичное право', 'public international law', 'coordination'),
  (19, 'халықаралық қауымдастық', 'международное сообщество', 'international community', 'coordination'),
  (20, 'халықаралық ынтымақтастық', 'международное сотрудничество', 'international cooperation', 'coordination'),
  (21, 'халықаралық эпизоотикалық бюро', 'международное эпизоотическое бюро (МЭБ)', 'International Office of Epizootics (OIE), now World Organisation for Animal Health (WOAH)', 'disaster_medicine'),
  (22, 'халықаралық ұйымдар', 'международные организации', 'international organizations', 'coordination'),
  (23, 'халықаралық қатынастар', 'международные отношения', 'international relations', 'coordination'),
  (24, 'халықаралық экономикалық ұйымдар', 'международные экономические организации', 'international economic organizations', 'coordination'),
  (25, 'халықаралық шарт', 'международный договор', 'international treaty', 'coordination'),
  (26, 'халықаралық қақтығыс', 'международный конфликт', 'international conflict', 'coordination'),
  (27, 'халықаралық автокөлік одағы', 'международный союз автомобильного транспорта (МСАТ)', 'International Road Transport Union (IRU)', 'coordination'),
  (28, 'халықаралық телекоммуникация одағы', 'международный союз телекоммуникации', 'International Telecommunication Union (ITU)', 'alerting_comms'),
  (29, 'халықаралық стандарт', 'международный стандарт', 'international standard', 'coordination'),
  (30, 'халықтың механикалық қозғалысы', 'механическое движение населения', 'mechanical movement of the population', 'coordination'),
  (31, 'халықтың көші-қон қозғалысы', 'миграционное движение населения', 'migration movement of the population', 'coordination'),
  (32, 'халықтың көші-қоны', 'миграция населения', 'population migration', 'coordination'),
  (33, 'халық', 'население', 'population', 'coordination'),
  (34, 'хабардар ету', 'оповещение', 'alerting / notification', 'alerting_comms'),
  (35, 'химиялық қалдықтар', 'отходы химические', 'chemical waste', 'industrial_safety'),
  (36, 'халық тығыздығы', 'плотность населения', 'population density', 'coordination'),
  (37, 'халық санын бағалау', 'оценка численности населения', 'population estimate', 'coordination'),
  (38, 'хабар', 'передача', 'transmission', 'alerting_comms'),
  (39, 'хабарлама хат', 'письмо-извещение', 'notification letter', 'alerting_comms'),
  (40, 'шағын авиация', 'авиация малая', 'light aviation', 'rescue_ops'),
  (41, 'штабтық өрт сөндіргіш автомобиль', 'автомобиль пожарный штабной', 'fire service command vehicle', 'fire_safety'),
  (42, 'шасси базасы', 'база шасси', 'chassis base', 'industrial_safety'),
  (43, 'шексіздік', 'бесконечность', 'infinity, eternity', 'industrial_safety'),
  (44, 'шынайы-созылмалы ауру', 'болезнь истинно-хроническая', 'true chronic disease', 'disaster_medicine'),
  (45, 'шаншып ауыру', 'боль коликообразная', 'colicky pain', 'disaster_medicine'),
  (46, 'шаң дауыл', 'буря пыльная', 'dust storm', 'emergencies'),
  (47, 'шың', 'вершина; пик', 'summit; peak', 'industrial_safety'),
  (48, 'шекті салмақ', 'вес допустимый', 'allowable weight', 'industrial_safety'),
  (49, 'шығындарды өндіріп алу', 'взыскание убытков', 'recovery of damages', 'coordination'),
  (50, 'шикізат түрлері', 'виды сырья', 'types of raw materials', 'industrial_safety'),
  (51, 'шаңқұйын', 'вихрь пыльный', 'dust devil', 'emergencies'),
  (52, 'шамадан тыс ылғалдық', 'влажность избыточная', 'excess moisture', 'industrial_safety'),
  (53, 'шөмішгүл', 'водосбор', 'columbine (Aquilegia)', 'industrial_safety'),
  (54, 'шахта суы', 'воды шахтные', 'mine water', 'industrial_safety'),
  (55, 'шығындарды өтеу', 'возмещение убытков', 'compensation for losses', 'coordination'),
  (56, 'шаймаланғыштық', 'выщелачиваемость', 'leachability', 'industrial_safety'),
  (57, 'шашыранды газдар', 'газы рассеянные', 'dispersed gases', 'industrial_safety'),
  (58, 'шектелген газ жатыны', 'залежи газа ограниченные', 'bounded gas deposits', 'industrial_safety'),
  (59, 'шымтезек төсеу', 'засыпка торфяная', 'peat filling', 'industrial_safety'),
  (60, 'шоғырлану аумағы', 'зона концентрации', 'concentration zone', 'industrial_safety'),
  (61, 'шөл аймақ', 'зона пустынная', 'desert zone', 'emergencies'),
  (62, 'шүмек', 'кран (водопроводный)', 'bib-cock', 'industrial_safety'),
  (63, 'шығырын', 'кран (подъемный)', 'crane', 'industrial_safety'),
  (64, 'шекті температура', 'критическая температура', 'critical temperature, critical thermal point', 'industrial_safety'),
  (65, 'шекті қысым', 'критическое давление', 'critical pressure', 'industrial_safety'),
  (66, 'шынының оңай балқығыштығы', 'легкоплавкость стекла', 'fusibility of glass', 'industrial_safety'),
  (67, 'шапқыншылдық', 'нашествие', 'invasion', 'civil_defense'),
  (68, 'штаттан тыс жағдай', 'нештатная ситуация', 'abnormal situation, emergency situation', 'emergencies'),
  (69, 'шөгінді тау жыныстары', 'осадочные горные породы', 'sedimentary rocks', 'industrial_safety'),
  (70, 'шатыр', 'палатка', 'tent', 'civil_defense'),
  (71, 'шығын келтіру', 'причинение убытков', 'infliction of loss / causing damage', 'coordination'),
  (72, 'шаңтұтқы', 'респиратор', 'respirator', 'civil_defense'),
  (73, 'штат кестесі', 'штатное расписание', 'staffing table / staff establishment', 'civil_defense'),
  (74, 'шұғыл медициналық көмек', 'экстренная медицинская помощь', 'emergency medical care', 'disaster_medicine'),
  (75, 'ығысу амплитудасы', 'амплитуда смещения', 'displacement amplitude', 'industrial_safety'),
  (76, 'ықтимал мән', 'вероятное значение', 'probable value', 'industrial_safety'),
  (77, 'ықтималдықтар теориясы', 'вероятностей теория', 'probability theory', 'industrial_safety'),
  (78, 'ықтималдық логика', 'вероятностная логика', 'probabilistic logic', 'industrial_safety'),
  (79, 'ықтимал-статикалық үлгі', 'вероятностно-статическая модель', 'probabilistic-statistical model', 'industrial_safety'),
  (80, 'ықтимал жол карталары', 'вероятностные дорожные карты', 'probabilistic roadmaps', 'industrial_safety'),
  (81, 'ықтималдық', 'вероятность', 'probability', 'industrial_safety'),
  (82, 'ықтимал авариялар', 'вероятные аварии', 'probable accidents / potential accidents', 'emergencies'),
  (83, 'ыдыратқыш заттек', 'вещество разрыхляющее', 'release agent', 'industrial_safety'),
  (84, 'ықтиярхат', 'вид на жительство', 'residence permit', 'coordination'),
  (85, 'ылғал', 'влага', 'moisture', 'industrial_safety'),
  (86, 'ылғал сыйымдылық', 'влагоемкость', 'moisture-holding capacity / water-holding capacity', 'industrial_safety'),
  (87, 'ылғал жинау үшін суару', 'влагозарядковый полив', 'moisture-recharging irrigation', 'industrial_safety'),
  (88, 'ылғал өлшеуіш', 'влагомер', 'moisture meter / moisture sensor', 'industrial_safety'),
  (89, 'ылғалөтімсіздік', 'влагонепроницаемость', 'moisture impermeability', 'industrial_safety'),
  (90, 'ылғалалмасу', 'влагообмен', 'moisture exchange', 'industrial_safety'),
  (91, 'ылғал айналымы', 'влагооборот', 'moisture cycle', 'industrial_safety'),
  (92, 'ылғалайырғыш', 'влагоотделитель', 'moisture separator', 'industrial_safety'),
  (93, 'ылғал тасымалдау', 'влагоперенос', 'moisture transfer', 'industrial_safety'),
  (94, 'ылғалсорғыш', 'влагопоглотитель', 'moisture absorber / desiccant', 'industrial_safety'),
  (95, 'ылғалөткізгіштік', 'влагопроводность', 'moisture conductivity', 'industrial_safety'),
  (96, 'ылғал өтімділік', 'влагопроводность', 'moisture conductivity', 'industrial_safety'),
  (97, 'ылғалұстам', 'влагосодержание', 'moisture content', 'industrial_safety'),
  (98, 'ылғал мөлшері', 'влагосодержание', 'moisture content', 'industrial_safety'),
  (99, 'ылғалтұрақтылық', 'влагостойкость', 'moisture resistance', 'industrial_safety'),
  (100, 'ылғалсыздандырғыш', 'влагоудалитель', 'moisture remover', 'industrial_safety'),
  (101, 'ылғалтөзімділік', 'влагоустойчивость', 'moisture resistance / moisture stability', 'industrial_safety'),
  (102, 'ылғалды түйіршіктену', 'влажное гранулирование', 'wet granulation', 'industrial_safety'),
  (103, 'ылғалды қанығу', 'влажное насыщение', 'moisture saturation', 'industrial_safety'),
  (104, 'ылғалдық', 'влажность', 'moisture content / humidity', 'industrial_safety'),
  (105, 'ылғалды қаныққан бу', 'влажный насыщенный пар', 'wet saturated steam', 'industrial_safety'),
  (106, 'ықпал', 'влияние', 'influence / effect', 'industrial_safety'),
  (107, 'ылғалданғыштық', 'гигроскопичность', 'hygroscopicity', 'industrial_safety'),
  (108, 'ыдырата сутектендіру', 'гидрогенизация деструктивная', 'decomposition hydrogenation', 'industrial_safety'),
  (109, 'ыстық жанғыш газдар', 'горячие топочные газы', 'hot flue gases', 'industrial_safety'),
  (110, 'ыстықтай кептірілген астарлама', 'грунтовка горячей сушки', 'heat-cured primer', 'industrial_safety'),
  (111, 'ырғақты қозғалыс', 'движение ритмичное', 'rhythmic movement', 'coordination'),
  (112, 'ықтиярсыз әрекет', 'действие непроизвольное', 'involuntary action', 'coordination'),
  (113, 'ықтиярлы әрекет', 'действие произвольное', 'voluntary action', 'coordination'),
  (114, 'ынталандырмау', 'дестимулирование', 'destimulation', 'coordination'),
  (115, 'ығысу деформациясы', 'деформация сдвига', 'shear deformation', 'industrial_safety'),
  (116, 'ығу', 'дрейф', 'drift', 'industrial_safety'),
  (117, 'ығыстыру', 'дрейфовать', 'drift', 'industrial_safety'),
  (118, 'ыстыққа көнбістік', 'жаровыносливость', 'heat endurance', 'fire_safety'),
  (119, 'ыстыққа беріктік', 'жаропрочность', 'high-temperature strength', 'fire_safety'),
  (120, 'ыстыққабекемдік', 'жаростойкость', 'heat resistance', 'fire_safety'),
  (121, 'ыстыққа төзімділік', 'жаростойкость', 'heat resistance', 'fire_safety'),
  (122, 'ыстыққа төзімділік', 'жароустойчивость', 'thermal stability', 'fire_safety'),
  (123, 'ым, ишара', 'жест', 'gesture', 'coordination'),
  (124, 'ысырма', 'задвижка', 'gate valve', 'industrial_safety'),
  (125, 'ылғал сақтау', 'задержание влаги (влагосбережение)', 'moisture retention (moisture conservation)', 'industrial_safety'),
  (126, 'ылғалжұтқыштарды айдау', 'закачка влагопоглотителей', 'injection of moisture absorbents', 'industrial_safety'),
  (127, 'ылғал жабу', 'закрытие влаги', 'moisture sealing', 'industrial_safety'),
  (128, 'ыстық ұру', 'запал', 'igniter / primer', 'fire_safety'),
  (129, 'ықтимал қорлар', 'запасы вероятные', 'probable reserves', 'industrial_safety'),
  (130, 'ызасудың беті', 'зеркало грунтовых вод', 'groundwater table', 'industrial_safety'),
  (131, 'ылғалды ұсату', 'измельчение мокрое', 'wet grinding', 'industrial_safety'),
  (132, 'ысқылап езгілейтін ұсақтағыштар', 'измельчители истирающе-раздавливающего действия', 'attrition-crushing mills', 'industrial_safety'),
  (133, 'ықпалдасу', 'интеграция', 'integration', 'coordination'),
  (134, 'ылғалды қапас', 'камера влажности', 'humidity chamber', 'industrial_safety'),
  (135, 'ықтималдықтың классикалық анықтамасы', 'классическое определение вероятности', 'classical definition of probability', 'industrial_safety'),
  (136, 'ыстық сомдау', 'ковка горячая', 'hot forging', 'industrial_safety'),
  (137, 'ықшамдылық', 'компактность', 'compactness', 'industrial_safety'),
  (138, 'ықшам', 'компактный', 'compact', 'industrial_safety'),
  (139, 'ымыра', 'компромисс', 'compromise', 'coordination'),
  (140, 'ығыстыру коэффициенті', 'коэффициент вытеснения', 'displacement factor', 'industrial_safety'),
  (141, 'ығыстырудың әлеуетті коэффициенті', 'коэффициент вытеснения потенциальный', 'potential displacement factor', 'industrial_safety'),
  (142, 'ысырап коэффициенті', 'коэффициент потерь', 'loss coefficient', 'industrial_safety'),
  (143, 'ықтимал мәндер жиыны', 'множество вероятных значений', 'set of probable values', 'industrial_safety'),
  (144, 'ылғалдану нормасы', 'норма увлажнения', 'moisture application rate', 'industrial_safety'),
  (145, 'ыдырау тұрақтысы', 'постоянная распада', 'decay constant', 'industrial_safety'),
  (146, 'ықтимал осалдық', 'потенциальная уязвимость', 'potential vulnerability', 'industrial_safety'),
  (147, 'ықтимал, қарымды, әлеуетті', 'потенциальный', 'potential', 'industrial_safety'),
  (148, 'ызасу ағыны', 'поток грунтовый', 'groundwater flow', 'industrial_safety'),
  (149, 'ықтиярсыз алып қою', 'принудительное изъятие', 'compulsory seizure', 'coordination'),
  (150, 'ыдырау', 'разложение', 'decomposition', 'industrial_safety'),
  (151, 'ыдырағыштық', 'распадаемость', 'decomposability', 'industrial_safety'),
  (152, 'ыдырау реакциясы', 'реакция разложения', 'decomposition reaction', 'industrial_safety'),
  (153, 'ығысу', 'сдвиг', 'shift, displacement, shear', 'industrial_safety'),
  (154, 'ысыру', 'снос', 'demolition / removal / drift', 'industrial_safety'),
  (155, 'ықтималдылықтың бірлескен үлестірімі', 'совместное распределение вероятности', 'joint probability distribution', 'industrial_safety'),
  (156, 'ылғал мөлшері', 'содержание влаги', 'moisture content', 'industrial_safety'),
  (157, 'ынтымақты талап, ортақ талап', 'солидарное требование', 'joint and several claim', 'coordination'),
  (158, 'ынтымақтастық', 'солидарность', 'solidarity', 'coordination'),
  (159, 'ынтымақ', 'солидарность', 'solidarity', 'coordination'),
  (160, 'ынтымақтастық', 'сотрудничество', 'cooperation', 'coordination'),
  (161, 'ықтималдықтың статистикалық анықтамасы', 'статистическое определение вероятности', 'statistical definition of probability', 'industrial_safety'),
  (162, 'ынталандыру', 'стимулирование', 'incentivization / stimulation', 'coordination'),
  (163, 'ынталандыратын төлемдер', 'стимулирующие выплаты', 'incentive payments', 'coordination'),
  (164, 'ықтимал сырқаттықты сақтандыру', 'страхование на случай болезни', 'sickness insurance', 'disaster_medicine'),
  (165, 'ығысу тоғы', 'ток смещения', 'displacement current', 'industrial_safety'),
  (166, 'лездік жылулық баланс', 'баланс мгновенный тепловой', 'instantaneous heat balance', 'industrial_safety'),
  (167, 'лайлану', 'взмучивание', 'resuspension', 'industrial_safety'),
  (168, 'лездік жарылыс', 'взрыв мгновенный', 'instantaneous explosion', 'fire_safety'),
  (169, 'лақтыра жарылыс', 'взрыв на сброс', 'explosion during pressure release', 'fire_safety'),
  (170, 'лездік жару', 'взрывание мгновенное', 'instantaneous blasting', 'fire_safety'),
  (171, 'ластанған су', 'вода загрязненная', 'contaminated water', 'industrial_safety'),
  (172, 'лайлы құрылым', 'структура иловая (илистая)', 'silty structure', 'industrial_safety'),
  (173, 'лүпіл жиілігі', 'частота пульсаций', 'pulsation frequency', 'industrial_safety'),
  (174, 'ластағыштардың жинақталуы', 'аккумуляция загрязнителей', 'accumulation of pollutants', 'industrial_safety'),
  (175, 'ластаушы заттардың жинақталуы', 'аккумуляция загрязняющих веществ', 'accumulation of pollutants', 'industrial_safety'),
  (176, 'лезде жарылатын бомба', 'бомба мгновенного действия', 'instant-action bomb', 'civil_defense'),
  (177, 'лауазымға кірісу', 'вступление в должность', 'assumption of office', 'coordination'),
  (178, 'лақтырғыш', 'выбрасыватель', 'ejector', 'civil_defense'),
  (179, 'лауазымға жоғарылату', 'выдвижение на должность', 'nomination for a position', 'coordination'),
  (180, 'лек ұзындығы', 'глубина колонны', 'column depth', 'civil_defense'),
  (181, 'лек алды', 'голова колонны', 'head of the column', 'civil_defense'),
  (182, 'лекпен жүру', 'движение колонной', 'movement in column formation', 'civil_defense'),
  (183, 'лазерлік сәулеленудің бағытталғандық диаграммасы', 'диаграмма направленности лазерного излучения', 'laser radiation directivity pattern', 'civil_defense'),
  (184, 'лақтыру қашықтығы', 'дальность метания', 'throwing distance', 'civil_defense'),
  (185, 'лазерлік сәулелену толқынының ұзындығы', 'длина волны лазерного излучения', 'wavelength of laser radiation', 'civil_defense'),
  (186, 'лауазымдық қылмыс', 'должностное преступление', 'official misconduct', 'coordination'),
  (187, 'лауазымдық жалақы', 'должностной оклад', 'official salary', 'coordination'),
  (188, 'лауазым', 'должность', 'position', 'coordination'),
  (189, 'ластанған май', 'загрязненное масло', 'contaminated oil', 'industrial_safety'),
  (190, 'лазерлік қару', 'лазерное оружие', 'laser weapon', 'civil_defense'),
  (191, 'лазерлік белсенді элемент', 'лазерный активный элемент', 'laser active element', 'civil_defense'),
  (192, 'лакталған мата', 'лакоткань', 'varnished fabric', 'industrial_safety'),
  (193, 'ландшафт', 'ландшафт', 'landscape', 'industrial_safety'),
  (194, 'лездемелік бақылау', 'летучий контроль', 'spot check; rapid inspection', 'coordination'),
  (195, 'лездеме', 'летучка', 'briefing', 'coordination'),
  (196, 'люк жазбасы', 'люковая записка', 'hatch note', 'civil_defense'),
  (197, 'лақтыратын', 'метательные', 'propelling; throwing', 'civil_defense'),
  (198, 'люкті бұру тетігі', 'механизм поворота люка', 'hatch rotation mechanism', 'civil_defense'),
  (199, 'лаңкестік акті', 'акт терроризма', 'act of terrorism', 'civil_defense'),
  (200, 'лаңкестікке қарсы операция', 'антитеррористическая операция', 'counter-terrorism operation', 'civil_defense'),
  (201, 'лауазымдық аттестаттау', 'аттестация должностная', 'performance appraisal', 'coordination'),
  (202, 'лауазымдық нұсқаулық', 'должностная инструкция', 'job description', 'coordination'),
  (203, 'лауазымдық құпия', 'должностная тайна', 'official secret', 'coordination'),
  (204, 'лауазымды тұлға', 'должностное лицо', 'official / public official', 'coordination'),
  (205, 'лауазымдық жағдай', 'должностное положение', 'official position / official status', 'coordination'),
  (206, 'лауазымдық жалғандық', 'должностной подлог', 'official forgery', 'coordination'),
  (207, 'лауазымдық теріс қылық', 'должностной проступок', 'disciplinary offence / official misconduct', 'coordination'),
  (208, 'лауазымдық міндеттер', 'должностные обязанности', 'official duties', 'coordination'),
  (209, 'лауазымдық өкілеттік', 'должностные полномочия', 'official powers', 'coordination'),
  (210, 'лауазымдық қызметтер', 'должностные функции', 'official duties', 'coordination'),
  (211, 'лимит, шек', 'лимит', 'limit', 'industrial_safety'),
  (212, 'лицензиялық жүйе', 'лицензионная система', 'license system', 'coordination'),
  (213, 'лицензиялық шарт', 'лицензионный договор', 'license agreement', 'coordination'),
  (214, 'лицензиялық бақылау', 'лицензионный контроль', 'licensing supervision', 'coordination'),
  (215, 'лицензиялық төлқұжат', 'лицензионный паспорт', 'license passport; license certificate', 'coordination'),
  (216, 'лицензиялық алым', 'лицензионный сбор', 'license fee; license tax', 'coordination'),
  (217, 'лицензиялау', 'лицензирование', 'licensing', 'coordination'),
  (218, 'лицензиялық дана тасымалдағышы', 'носитель лицензионного экземпляра', 'licensed copy carrier', 'coordination'),
  (219, 'лауазымды адамдардың іс-әрекеттеріне шағымдану', 'обжалование действий должностных лиц', 'appeal against the actions of officials', 'coordination'),
  (220, 'лицензия беруден бас тарту негіздемелері', 'основания отказа в выдаче лицензии', 'grounds for refusal to issue a license', 'coordination'),
  (221, 'лауазымды тұлғалардың жауапкершілігі', 'ответственность должностных лиц', 'liability of officials; responsibility of officials', 'coordination'),
  (222, 'лауазымын төмендету', 'понижение в должности', 'demotion', 'coordination'),
  (223, 'лава тасқыны', 'поток лавы', 'lava flow', 'emergencies'),
  (224, 'лауазымға кірісер алдындағы ант', 'присяга при вступлении на должность', 'oath of office', 'coordination'),
  (225, 'лауазымды адамның атағын өз бетімен иемдену', 'самовольное присвоение звания должностного лица', 'unauthorized assumption of the title of a public official', 'coordination'),
  (226, 'логикалық және құралдық операциялар жүйесі', 'система логических и инструментальных операций', 'system of logical and instrumental operations', 'alerting_comms'),
  (227, 'лакты бояу материалдарын сот-сараптамалық зерттеу', 'судебно-экспертное исследование лакокрасочных материалов', 'forensic examination of paints and coatings', 'coordination'),
  (228, 'лицензиялау салалары', 'сферы лицензирования', 'areas of licensing', 'coordination'),
  (229, 'лаңкес', 'террорист', 'terrorist', 'civil_defense'),
  (230, 'лицензиялық тауар', 'товар лицензионный', 'licensed product', 'coordination'),
  (231, 'лауазымнан босату', 'увольнение от должности', 'dismissal from office', 'coordination'),
  (232, 'лек', 'колонна', 'column, convoy', 'civil_defense'),
  (233, 'лақтырғыш жарылғыш заттар', 'взрывчатые вещества метательные', 'propellant explosives', 'civil_defense'),
  (234, 'ламинарлық жану', 'горение ламинарное', 'laminar combustion', 'fire_safety'),
  (235, 'локалдік қысым', 'давление локальное', 'local pressure', 'industrial_safety'),
  (236, 'локалсізденген байланыс', 'делокализованная связь', 'delocalized bond', 'industrial_safety'),
  (237, 'латекстік бұйым', 'латексное изделие', 'latex product', 'industrial_safety'),
  (238, 'латекстік желім', 'латексный клей', 'latex adhesive', 'industrial_safety'),
  (239, 'локалденген телімдер', 'локализованные участки', 'localized areas', 'industrial_safety'),
  (240, 'локалді қыздыру', 'локальный разогрев', 'localized heating', 'industrial_safety'),
  (241, 'лездік солқылдау жылдамдығы', 'мгновенная пульсационная скорость', 'instantaneous pulsating velocity', 'industrial_safety'),
  (242, 'лайөлшегіштер', 'мутномеры', 'turbidimeters', 'industrial_safety'),
  (243, 'лайлылық', 'мутность', 'turbidity', 'industrial_safety'),
  (244, 'лакбояу материалын жағу', 'нанесение лакокрасочного материала', 'paint and coating application', 'industrial_safety'),
  (245, 'лакбояулы жабын көлемі', 'объем лакокрасочного покрытия', 'volume of paint coating', 'industrial_safety'),
  (246, 'ламинарлы жалын', 'пламя ламинарное', 'laminar flame', 'fire_safety'),
  (247, 'лүпілдеуіш жалын', 'пламя пульсирующее', 'pulsating flame', 'fire_safety');

  create temp table old_t as
  select id, kk from public.terms where upper(left(trim(kk), 1)) in ('Х', 'Ш', 'Ы', 'Л');

  -- One old card per new term with the same Kazakh text (the first one).
  create temp table keep_map as
  select distinct on (n.n) n.n, o.id
  from new_t n join old_t o on lower(trim(o.kk)) = lower(n.kk)
  order by n.n, o.id;

  delete from keep_map k using keep_map k2 where k.id = k2.id and k.n > k2.n;

  update public.terms t set kk = n.kk, ru = n.ru, en = n.en, category = n.category
  from keep_map k join new_t n on n.n = k.n
  where t.id = k.id;

  delete from public.terms t using old_t o
  where t.id = o.id and t.id not in (select id from keep_map);

  insert into public.terms (kk, ru, en, category)
  select kk, ru, en, category from new_t where n not in (select n from keep_map) order by n;

  drop table new_t, old_t, keep_map;
end
$$;

select (select count(*) from public.terms_backup_2026_10_20) as old_cards_backed_up,
       (select count(*) from public.terms where upper(left(trim(kk), 1)) in ('Х', 'Ш', 'Ы', 'Л')) as on_these_letters_now,
       (select count(*) from public.terms) as terms_now;
