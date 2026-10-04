-- =============================================================
-- Batch add 6: terms starting with «Е» (55 terms), supplied by the site
-- owner as a kk / ru / en table pasted in chat.
-- category values map to CATEGORIES keys in src/i18n/translations.js;
-- assigned by best judgement (the source didn't specify one), matching
-- the categories of similar terms already in the base.
--
-- Cleanup applied while extracting from the source table: spaces lost
-- when copying from the source document were restored; typos fixed
-- ("имушествыенный" -> "имущественный", "ертінділерді" -> "ерітінділерді",
-- "length  of service" -> "length of service"); a cut-off third Kazakh
-- variant ("еңбекке жара…") was dropped from the expert-commission term.
-- Skipped because they are already in the base: «ерікті өрт сөндіруші»,
-- «ескерту белгісі», «есеп», «ерікті жасақ» (as «жасақ (ерікті жасақ)»).
-- «ерігіш зат» and «еріткіш заттек» appeared twice in the source and
-- are added once.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0025_add_terms_batch6.sql
-- =============================================================
insert into public.terms (kk, ru, en, category)
values
  ('егде жас', 'пожилой возраст', 'advanced age', 'disaster_medicine'),
  ('егістік қорғайтын орман жолағы', 'полоса лесная полезащитная', 'field-protection forest strip', 'emergencies'),
  ('егіншілік', 'земледелие', 'agriculture', 'coordination'),
  ('екі адым алға', 'два шага вперед', 'two steps forward', 'coordination'),
  ('екі жақты қозғалыс', 'движение двустороннее', 'two-way traffic', 'evacuation'),
  ('екінші оқпандарды бұрғылау', 'бурение вторых стволов', 'sidetracking', 'industrial_safety'),
  ('екінші топ', 'вторая группа', 'second group', 'coordination'),
  ('елді мекендер жері', 'земли населенных пунктов', 'settlement lands', 'coordination'),
  ('емдеуге жатқызу', 'госпитализация', 'hospitalization', 'disaster_medicine'),
  ('енгізу арнасы', 'канал впускной', 'intake port', 'industrial_safety'),
  ('ену аймағы', 'зона проникновения', 'penetration zone', 'industrial_safety'),
  ('еңбек демалысы', 'отпуск трудовой', 'annual leave', 'coordination'),
  ('еңбек демалысынан шақыртып алу', 'отзыв из трудового отпуска', 'recall from annual leave', 'coordination'),
  ('еңбек инспекциясы', 'инспекция труда', 'labor inspectorate', 'industrial_safety'),
  ('еңбек қауіпсіздігі', 'безопасность труда', 'workplace safety', 'industrial_safety'),
  ('еңбек сіңірген жылдар', 'выслуга лет', 'length of service', 'coordination'),
  ('еңбек шарты', 'договор трудовой', 'employment contract', 'coordination'),
  ('еңбекке жарамдылықты медициналық сараптау комиссиясы; еңбекке жарамдылығын медсараптау', 'врачебно-трудовая экспертная комиссия', 'medical-labor expert commission', 'disaster_medicine'),
  ('еңбекке жарамсыздық парағы', 'листок нетрудоспособности', 'temporary disability leave', 'disaster_medicine'),
  ('еңбекті қорғау', 'защита труда', 'occupational safety', 'industrial_safety'),
  ('ерекше бөлім', 'особый отдел', 'special department', 'coordination'),
  ('ерекше жағдай', 'особое условие', 'special condition', 'coordination'),
  ('ерекше қорғалатын табиғи аумақтарды қорғау', 'защита особо охраняемых природных территорий', 'protection of specially protected natural areas', 'coordination'),
  ('ереже', 'правило', 'rule', 'coordination'),
  ('ересек топ', 'взрослая группа', 'adult group', 'coordination'),
  ('ерігіш зат', 'вещество растворимое', 'soluble substance', 'industrial_safety'),
  ('еріксіз қоныс аударушы', 'вынужденный переселенец', 'forced migrant', 'evacuation'),
  ('еріксіз тербелістер', 'вынужденные колебания', 'forced oscillations', 'industrial_safety'),
  ('ерікті жарна', 'добровольный взнос', 'voluntary contribution', 'coordination'),
  ('ерікті көші-қон', 'добровольная миграция', 'voluntary migration', 'evacuation'),
  ('ерікті қайырмалдық', 'добровольные пожертвования', 'voluntary donations', 'coordination'),
  ('ерікті қоғамдастықтар', 'добровольные сообщества', 'voluntary associations', 'coordination'),
  ('ерікті мүліктік жарна', 'добровольный имущественный взнос', 'voluntary contribution in kind', 'coordination'),
  ('ерікті өрт сөндірушілер жасағы', 'добровольная пожарная дружина', 'volunteer fire brigade', 'fire_safety'),
  ('еріктілік', 'добровольность', 'voluntariness', 'coordination'),
  ('ерітінді', 'раствор', 'solution', 'industrial_safety'),
  ('ерітінділерді пайдалану', 'использование растворителей', 'use of solvents', 'industrial_safety'),
  ('еріткіш заттек', 'вещество растворяющее', 'dissolving substance', 'industrial_safety'),
  ('еріткіштерді айдау', 'закачка растворителей', 'solvent injection', 'industrial_safety'),
  ('еркін су алмасу аймағы', 'зона свободного водообмена', 'zone of free water exchange', 'industrial_safety'),
  ('ерлік', 'мужество', 'courage', 'coordination'),
  ('еру', 'таяние', 'melting', 'emergencies'),
  ('есепке алу', 'зачет', 'pass / credit', 'coordination'),
  ('есепке алу журналы', 'журнал учета', 'logbook', 'coordination'),
  ('есепті кезең', 'отчетный период', 'reporting period', 'coordination'),
  ('есептік қозғалыс қарқындылығы', 'интенсивность движения расчетная', 'traffic density', 'evacuation'),
  ('есерлену, аласұру, долылық', 'истерика', 'hysterics', 'disaster_medicine'),
  ('есірткі', 'наркотик', 'drug', 'disaster_medicine'),
  ('есірткіге тәуелділік', 'наркотическая зависимость', 'drug addiction', 'disaster_medicine'),
  ('ескек', 'весло', 'paddle', 'rescue_ops'),
  ('ескекші', 'гребец', 'rower', 'rescue_ops'),
  ('ескерту дабылы', 'предупреждающая сигнализация', 'warning alarm system', 'alerting_comms'),
  ('естілу аймағы', 'зона слышимости', 'audibility range', 'alerting_comms'),
  ('ефрейтор', 'ефрейтор', 'lance corporal', 'coordination'),
  ('жағдай', 'положение', 'position', 'coordination')
;
