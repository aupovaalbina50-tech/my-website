-- =============================================================
-- Terms on «С» (Kazakh): the old cards are replaced by the 57 terms the
-- user sent («С-57 + англ.docx», kk / ru / en; typos inquir, асфикция,
-- «водно – солевой» corrected). Copy of the old cards:
-- supabase/backups/terms_kk_S_2026-10-06.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «С» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0049_replace_kk_s_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'спринклерлік өрт сөндірудің автоматты жүйесі', 'автоматическая система спринклерного пожаротушения', 'automatic fire sprinkler system', 'fire_safety'),
  (2, 'санитариялық авиация', 'авиация санитарная', 'aeromedical evacuation', 'disaster_medicine'),
  (3, 'сіңіру', 'абсорбировать', 'to absorb', 'industrial_safety'),
  (4, 'сол рөлді автомобиль', 'автомобиль леворульный', 'left-hand drive (LHD) vehicle', 'industrial_safety'),
  (5, 'сейсмикалық режім аномалиясы', 'аномалия сейсмического режима', 'seismic regime anomaly', 'emergencies'),
  (6, 'сейсмикаға қарсы белдеу', 'антисейсмический пояс', 'seismic belt', 'emergencies'),
  (7, 'сегізкөздік анестезия', 'анестезия сакральная', 'sacral anesthesia', 'disaster_medicine'),
  (8, 'селқостық', 'апатичность, апатия', 'apathy, listlessness', 'disaster_medicine'),
  (9, 'соқырішектің жарылуы', 'аппендицит перфоративный', 'perforated appendicitis', 'disaster_medicine'),
  (10, 'сағалық арматура', 'арматура устья (устьевая арматура скважины)', 'wellhead equipment', 'industrial_safety'),
  (11, 'сұйықтық', 'жидкость', 'liquid, fluid', 'industrial_safety'),
  (12, 'сауал', 'запрос', 'request, inquiry', 'coordination'),
  (13, 'сұрау салу', 'запрос', 'request, inquiry', 'coordination'),
  (14, 'сырық - саты', 'лестница-палка', 'pole ladder', 'fire_safety'),
  (15, 'сорғы', 'насос', 'pump', 'fire_safety'),
  (16, 'саптық-өрт сөндіру дайындығы', 'пожарно-строевая подготовка', 'firefighter drill and training', 'fire_safety'),
  (17, 'сақтандырғыш ысырма', 'предохранительная задвижка', 'safety valve', 'fire_safety'),
  (18, 'сорғыш жең', 'рукав всасывающий', 'suction hose', 'fire_safety'),
  (19, 'сигналдау', 'сигнализация', 'alarm system', 'alerting_comms'),
  (20, 'ситуация, жағдай', 'ситуация', 'situation', 'coordination'),
  (21, 'стандарт', 'стандарт', 'standard', 'coordination'),
  (22, 'сұлба', 'схема', 'scheme', 'coordination'),
  (23, 'сүзгілеу стансасы', 'фильтровальная станция', 'water filtration plant', 'industrial_safety'),
  (24, 'сарапшы', 'эксперт', 'expert', 'coordination'),
  (25, 'сулы эмульсия', 'водная эмульсия', 'aqueous emulsion', 'industrial_safety'),
  (26, 'сулы-күйелік суспензия', 'водно-сажевая суспензия', 'carbon black-water suspension', 'industrial_safety'),
  (27, 'суда еритін тежегіштер', 'водорастворимые ингибиторы', 'water-soluble corrosion inhibitors', 'industrial_safety'),
  (28, 'су буы', 'водяной пар', 'water vapor, steam', 'industrial_safety'),
  (29, 'сыртқы диффузия', 'внешняя диффузия', 'external diffusion', 'industrial_safety'),
  (30, 'сұйық сіңіргіш', 'жидкий поглотитель', 'liquid absorber, liquid absorbent', 'industrial_safety'),
  (31, 'сәулелі энергия', 'лучистая энергия', 'radiant energy', 'industrial_safety'),
  (32, 'сәуле шығару қабілеті', 'лучеиспускательная способность', 'emissive power, emissivity', 'industrial_safety'),
  (33, 'салыстырмалы тығыздық', 'относительная плотность', 'specific gravity, relative density', 'industrial_safety'),
  (34, 'сусыма материалдар', 'сыпучие материалы', 'bulk materials, granular materials', 'industrial_safety'),
  (35, 'соқтығысып иондалу', 'ударная ионизация', 'impact ionization', 'industrial_safety'),
  (36, 'санитариялық тексеру актісі', 'акт санитарного обследования', 'sanitary inspection report', 'disaster_medicine'),
  (37, 'сіреспе анатоксині', 'анатоксин столбнячный', 'tetanus toxoid', 'disaster_medicine'),
  (38, 'странгуляциялық тұншығу', 'асфиксия странгуляционная', 'strangulation asphyxia', 'disaster_medicine'),
  (39, 'сан артериясы', 'артерия бедренная', 'femoral artery', 'disaster_medicine'),
  (40, 'сыртқы ұйқы күретамыры', 'артерия сонная наружная', 'external carotid artery', 'disaster_medicine'),
  (41, 'синустық аритмия', 'аритмия синусовая', 'sinus arrhythmia', 'disaster_medicine'),
  (42, 'сөйлей алмау', 'афазия', 'aphasia', 'disaster_medicine'),
  (43, 'суға ауа сіңіру', 'аэрация воды', 'water aeration', 'industrial_safety'),
  (44, 'сәуле ауруы', 'болезнь лучевая', 'radiation sickness, radiation disease', 'disaster_medicine'),
  (45, 'сәулесоқ ауру', 'болезнь лучевая', 'radiation sickness, radiation disease', 'disaster_medicine'),
  (46, 'синустық брадикардия', 'брадикардия синусовая', 'sinus bradycardia', 'disaster_medicine'),
  (47, 'сырқат', 'больной', 'patient, sick person', 'disaster_medicine'),
  (48, 'сұққылап ауыру', 'боль колющая', 'stabbing pain, sharp pain', 'disaster_medicine'),
  (49, 'су-тұз теңгерімі', 'водно-солевой баланс', 'water-electrolyte balance', 'disaster_medicine'),
  (50, 'су эпидемиясы', 'водные эпидемии', 'waterborne diseases', 'disaster_medicine'),
  (51, 'сутартқыш заттек', 'водоотнимающее вещество', 'dehydrating agent', 'industrial_safety'),
  (52, 'сутектік көрсеткіш', 'водородный показатель', 'hydrogen ion exponent (pH)', 'industrial_safety'),
  (53, 'сарапшы дәрігер', 'врач эксперт', 'medical expert', 'disaster_medicine'),
  (54, 'субдуралдық гематома', 'гематома субдуральная', 'subdural hematoma', 'disaster_medicine'),
  (55, 'сырқаттанушылық', 'заболеваемость', 'morbidity', 'disaster_medicine'),
  (56, 'сырғытқы', 'каталка', 'patient trolley', 'disaster_medicine'),
  (57, 'санитариялық киім', 'санитарная одежда', 'protective clothing', 'disaster_medicine');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'С';

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
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'С') as s_now,
       (select count(*) from public.terms) as terms_now;

commit;
