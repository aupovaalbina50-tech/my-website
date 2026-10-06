-- =============================================================
-- Terms on «В» (Kazakh): the old cards are replaced by the 58 terms the
-- user sent («В-58+анг.docx», kk / ru / en). Copy of the old cards:
-- supabase/backups/terms_kk_V_2026-10-06.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «В» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0046_replace_kk_v_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'вакуумды сүзгі', 'вакуум-фильтр', 'vacuum filter', 'industrial_safety'),
  (2, 'вагонды ашу актісі', 'акт вскрытия вагона', 'Railcar Opening Report', 'industrial_safety'),
  (3, 'вагон', 'вагон', 'railcar', 'industrial_safety'),
  (4, 'вакуум', 'вакуум', 'vacuum', 'industrial_safety'),
  (5, 'вакуумөлшеуіш', 'вакуумметр', 'vacuum gauge', 'industrial_safety'),
  (6, 'вариант, нұсқа', 'вариант', 'variant', 'coordination'),
  (7, 'вариатор', 'вариатор', 'variable-speed drive', 'industrial_safety'),
  (8, 'вагонды желдету', 'вентиляция вагона', 'railcar ventilation', 'industrial_safety'),
  (9, 'вентури түтігі', 'вентури-трубка', 'venturi tube', 'industrial_safety'),
  (10, 'вагондарды таразылау', 'взвешивание вагонов', 'railcar weighing', 'industrial_safety'),
  (11, 'вокзал', 'вокзал', 'railway station', 'industrial_safety'),
  (12, 'вольтметр', 'вольтметр', 'voltmeter', 'industrial_safety'),
  (13, 'вольфрам', 'вольфрам', 'tungsten', 'industrial_safety'),
  (14, 'вулкандау', 'вулканизация', 'vulcanisation', 'industrial_safety'),
  (15, 'вагонның істен шығуы', 'выход вагонов из строя', 'railcar failures', 'industrial_safety'),
  (16, 'вагонның жүккөтерімділігі', 'грузоподъемность вагона', 'railcar load capacity', 'industrial_safety'),
  (17, 'вагондар тобы', 'группа вагонов', 'group of railcars', 'industrial_safety'),
  (18, 'вагон топтастыру', 'группировка вагонов', 'grouping of railcars', 'industrial_safety'),
  (19, 'вагонды газсыздандыру', 'дегазация вагонов', 'railcar degassing', 'industrial_safety'),
  (20, 'вагонды зарарсыздандыру', 'дезинфекция вагона', 'railcar disinfection', 'industrial_safety'),
  (21, 'вагон депосы', 'депо вагонов', 'railcar depot', 'industrial_safety'),
  (22, 'вагон жөндеу депосы', 'депо вагоноремонтное', 'railcar repair depot', 'industrial_safety'),
  (23, 'вагон ұзындығы', 'длина вагона', 'railcar length', 'industrial_safety'),
  (24, 'виртуал ұзынды', 'длина виртуальная', 'virtual length', 'coordination'),
  (25, 'вагон домкраты', 'домкрат вагонный', 'railcar jack', 'industrial_safety'),
  (26, 'вагон жөндеу зауыты', 'завод вагоноремонтный', 'railcar repair plant', 'industrial_safety'),
  (27, 'вагондарды бекіту', 'закрепление вагонов', 'securing of railcars', 'industrial_safety'),
  (28, 'вагон баяулатқысы', 'замедлитель вагонный', 'railcar retarder', 'industrial_safety'),
  (29, 'вагондар қоры', 'запас вагонов', 'railcar reserve', 'industrial_safety'),
  (30, 'вагон арқалығының омырылымы', 'излом балки вагона', 'fracture of a railcar beam', 'industrial_safety'),
  (31, 'вагон білігінің омырылымы', 'излом вала вагона', 'railcar axle shaft fracture', 'industrial_safety'),
  (32, 'вагондарды оқшаулау', 'изоляция вагонов', 'railcar insulation', 'industrial_safety'),
  (33, 'вагон санаты', 'категория вагона', 'railcar category', 'industrial_safety'),
  (34, 'вагонның жүріс сапасы', 'качество вагона ходовое', 'railcar running performance', 'industrial_safety'),
  (35, 'вагон тербелісі', 'колебание вагона', 'railcar oscillation', 'industrial_safety'),
  (36, 'вагон доңғалағы', 'колесо вагона', 'railcar wheel', 'industrial_safety'),
  (37, 'вибрациялық конвейер', 'конвейер вибрационный', 'vibrating conveyor', 'industrial_safety'),
  (38, 'вагон шанағы', 'кузов вагона', 'railcar body', 'industrial_safety'),
  (39, 'ваготомия', 'ваготомия', 'vagotomy', 'disaster_medicine'),
  (40, 'вариациялық қатар', 'вариационный ряд', 'variation series', 'coordination'),
  (41, 'вируленттік', 'вирулентность', 'virulence', 'disaster_medicine'),
  (42, 'вольер', 'вольер', 'enclosure', 'industrial_safety'),
  (43, 'вакуумдық бекітпе', 'вакуумный затвор', 'vacuum valve', 'industrial_safety'),
  (44, 'видеокард', 'видеокарта', 'graphics card', 'coordination'),
  (45, 'видеожады', 'видеопамять', 'video memory', 'coordination'),
  (46, 'вибрация, діріл', 'вибрация', 'vibration', 'industrial_safety'),
  (47, 'винт', 'винт', 'screw', 'industrial_safety'),
  (48, 'вакуум-сорғы', 'вакуум-насос', 'vacuum pump', 'industrial_safety'),
  (49, 'вентиль', 'вентиль', 'valve', 'industrial_safety'),
  (50, 'взвод командирі', 'командир взвода', 'platoon commander', 'civil_defense'),
  (51, 'веб-браузер', 'веб-браузер', 'web browser', 'coordination'),
  (52, 'веб-дизайн', 'веб-дизайн', 'web design', 'coordination'),
  (53, 'веб-сервер', 'веб-сервер', 'web server', 'coordination'),
  (54, 'векторлық график', 'векторная графика', 'vector graphics', 'coordination'),
  (55, 'виртуал мәшине', 'виртуальная машина', 'virtual machine', 'coordination'),
  (56, 'вазоконстрикция', 'вазоконстрикция', 'vasoconstriction', 'disaster_medicine'),
  (57, 'ваксиналау', 'вакцинация', 'vaccination', 'disaster_medicine'),
  (58, 'вегетациялық кезең', 'вегетационный период', 'growing season', 'industrial_safety');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'В';

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
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'В') as v_now,
       (select count(*) from public.terms) as terms_now;

commit;
