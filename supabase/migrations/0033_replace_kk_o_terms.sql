-- =============================================================
-- Terms on «Ө» (Kazakh): the 81 old cards are replaced by the 50 terms the
-- user sent («Ө- 50+англ.docx», kk / ru / en). Copy of the old cards:
-- supabase/backups/terms_kk_O_2026-10-05.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «Ө» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0033_replace_kk_o_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'өрт сөндіруші', 'пожарный', 'firefighter', 'fire_safety'),
  (2, 'өрт температурасы', 'температура пожара', 'fire temperature', 'fire_safety'),
  (3, 'өрт', 'пожар', 'fire, blaze', 'fire_safety'),
  (4, 'өрт ілмегі', 'багор пожарный', 'fire hook, pike pole', 'fire_safety'),
  (5, 'өрт кезінде адамдарды құлақтандыру және эвакуациялауды басқару жүйесі', 'система оповещения и управления эвакуацией людей при пожаре', 'public address and voice alarm', 'alerting_comms'),
  (6, 'өрт сөндіру-құтқару автомобилі', 'автомобиль пожарно-спасательный', 'rescue engine, firefighting appliance', 'fire_safety'),
  (7, 'өрт туралы акт', 'акт о пожаре', 'fire incident report', 'fire_safety'),
  (8, 'өрт сөндірушінің жауынгер киімі', 'боевая одежда пожарного', 'turnout gear', 'fire_safety'),
  (9, 'өрт сөндіргіш автомобильдің жауынгерлік тобы', 'боевой расчет пожарного автомобиля', 'fire company', 'fire_safety'),
  (10, 'өртпен күрес', 'борьба с пожарами', 'fire-fighting, fire control', 'fire_safety'),
  (11, 'өрт себепкері', 'виновник пожара', 'fire setter, incendiary', 'fire_safety'),
  (12, 'өрт сөндіру мүкіндіктері', 'возможности по тушению пожара', 'fire-fighting capability, extinguishing capability', 'fire_safety'),
  (13, 'өрт жою уақыты', 'время ликвидации пожара', 'time of extinguishment', 'fire_safety'),
  (14, 'өрт тежеу уақыты', 'время локализации пожара', 'time of fire control', 'fire_safety'),
  (15, 'өрт оқшаулау уақыты', 'время локализации пожара', 'time of fire control', 'fire_safety'),
  (16, 'өртке жету уақыты', 'время следования на пожар', 'running time', 'fire_safety'),
  (17, 'өртте опат болу', 'гибель в огне', 'fire death, fire fatality', 'fire_safety'),
  (18, 'өрт сөндіру депосы', 'депо пожарное', 'fire station, fire house', 'fire_safety'),
  (19, 'өрт зардаптарын жою міндеттері', 'задачи по ликвидации последствий пожара', 'tasks for fire aftermath response', 'fire_safety'),
  (20, 'өртке ұқсату', 'имитация пожара', 'fire simulation', 'fire_safety'),
  (21, 'өрт қарқыны', 'интенсивность пожара', 'fire intensity', 'fire_safety'),
  (22, 'өрт сөндіргіш кеме', 'катер пожарный', 'fireboat', 'fire_safety'),
  (23, 'өрт сатысы', 'лестница пожарная', 'fire ladder', 'fire_safety'),
  (24, 'өрттің бастапқы өршу кезеңі', 'начальная стадия развития пожара', 'initial stage of fire development', 'fire_safety'),
  (25, 'өрт сөндіру бөлімінің бастығы', 'начальник пожарной части', 'fire station chief', 'fire_safety'),
  (26, 'өрт кауіпсіздігін қамтамасыз ету', 'обеспечение пожарной безопасности', 'fire-safety management', 'fire_safety'),
  (27, 'өрт басындағы жағдай', 'обстановка на месте пожара', 'fire scene conditions', 'fire_safety'),
  (28, 'өрт нысанасы', 'объект пожара', 'property involved, structure involved', 'fire_safety'),
  (29, 'өрттің қауіпті себептері', 'опасные факторы пожара', 'fire hazards', 'fire_safety'),
  (30, 'өрт сөндірудің шұғыл жоспары', 'оперативный план тушения пожара', 'firefighting operational plan', 'fire_safety'),
  (31, 'өрт шалған аумақ', 'площадь охваченная пожарами', 'fire-affected territory', 'fire_safety'),
  (32, 'өрт себебі', 'причина пожара', 'cause of fire, fire cause', 'fire_safety'),
  (33, 'өртенбейтін есік', 'противопожарная дверь', 'fire door', 'fire_safety'),
  (34, 'өртенбейтін жапқыш', 'противопожарная заслонка', 'fire damper', 'fire_safety'),
  (35, 'өртке қарсы жасалған', 'противопожарная стена', 'fire wall', 'fire_safety'),
  (36, 'өртке қарсы тосқауылдар', 'противопожарные преграды', 'fire breaks', 'fire_safety'),
  (37, 'өртке қарсы аралықтар', 'противопожарные разрывы', 'fire lines, fire breaks', 'fire_safety'),
  (38, 'өртке қарсы талаптар', 'противопожарные требования', 'fire protection requirements', 'fire_safety'),
  (39, 'өрт бөлімінің баратын ауданы', 'район выезда пожарной части', 'response district, first-due area', 'fire_safety'),
  (40, 'өртке қарсы тәртіп', 'режим противопожарный', 'fire safety regulations, fire prevention regime', 'fire_safety'),
  (41, 'өрт сөндіргіш жең', 'рукав пожарный', 'fire hose', 'fire_safety'),
  (42, 'өрт сөндіру басшысы', 'руководитель тушения пожара', 'incident commander', 'fire_safety'),
  (43, 'өзін-өзі жойғыш', 'самоликвидатор', 'self-destructor, self-destructive device', 'industrial_safety'),
  (44, 'өрттің өршу деңгейі', 'степень развития пожара', 'fire severity, stage of fire development', 'fire_safety'),
  (45, 'өртке қарсы қалқан', 'щит противопожарный', 'fire equipment board', 'fire_safety'),
  (46, 'өрт экспонометрі', 'экспонометр пожарный', 'exposure meter', 'fire_safety'),
  (47, 'өнеркәсіптік апат', 'промышленная катастрофа', 'industrial disaster', 'industrial_safety'),
  (48, 'өндірістік апат', 'авария производственная', 'industrial accident', 'industrial_safety'),
  (49, 'өндірістегі авария', 'авария производственная', 'industrial accident', 'industrial_safety'),
  (50, 'өртке қарсы бөгеуіл', 'барьер противопожарный', 'fire barrier', 'fire_safety');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'Ө';

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
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'Ө') as o_now,
       (select count(*) from public.terms) as terms_now;

commit;
