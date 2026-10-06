-- =============================================================
-- Terms on «У» (Kazakh): the old cards are replaced by the 39 terms the
-- user sent («у-39 + англ.docx», kk / ru / en; two cut-off Russian words
-- completed, the English of «окись урана» corrected). Copy of the old
-- cards: supabase/backups/terms_kk_U_2026-10-06.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «У» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0045_replace_kk_u_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'улы заттек', 'вещество ядовитое', 'poisonous substance; toxic substance', 'industrial_safety'),
  (2, 'ультрадыбыстық толқындар', 'волны ультразвуковые', 'ultrasonic waves', 'industrial_safety'),
  (3, 'ультрақысқа толқындар', 'волны ультракороткие', 'ultrashort waves', 'alerting_comms'),
  (4, 'уақытша бос мемлекеттік лауазым', 'временная вакансия на государственную должность', 'temporary vacancy for a civil service position', 'coordination'),
  (5, 'уақытша қорғау визасы', 'временная защитная виза', 'temporary protective visa', 'coordination'),
  (6, 'уақытша еңбекке жарамсыздық', 'временная нетрудоспособность', 'temporary incapacity for work; temporary disability', 'disaster_medicine'),
  (7, 'уақытша сақтау', 'временное хранение', 'temporary storage', 'industrial_safety'),
  (8, 'уытсыздандыру', 'детоксикация', 'detoxification', 'disaster_medicine'),
  (9, 'уақытша жол', 'дорога временная', 'temporary road', 'industrial_safety'),
  (10, 'уату', 'дробление', 'crushing', 'industrial_safety'),
  (11, 'уақытша белгі', 'знак временный', 'temporary sign', 'industrial_safety'),
  (12, 'ультракүлгін сәулелендіру', 'излучение ультрафиолетовое', 'ultraviolet radiation', 'industrial_safety'),
  (13, 'уақытша ұстау изоляторы', 'изолятор временного содержания', 'temporary detention center', 'coordination'),
  (14, 'улану', 'интоксикация', 'intoxication', 'disaster_medicine'),
  (15, 'уақыт сызығы', 'линия времени', 'timeline', 'coordination'),
  (16, 'усойқы майлар', 'масла сивушные', 'fusel oils', 'industrial_safety'),
  (17, 'уәждеме', 'мотивация', 'motivation', 'coordination'),
  (18, 'уран тотығы', 'окись урана', 'uranium oxide', 'industrial_safety'),
  (19, 'ушыққан аурулар', 'острые заболевания', 'acute diseases', 'disaster_medicine'),
  (20, 'уытты қалдықтар', 'отходы токсичные', 'toxic waste', 'industrial_safety'),
  (21, 'улы қалдықтар', 'отходы ядовитые', 'poisonous waste', 'industrial_safety'),
  (22, 'уақыт тұрақтысы', 'постоянная времени', 'time constant', 'coordination'),
  (23, 'уәкілетті өкіл', 'представитель уполномочный', 'authorized representative', 'coordination'),
  (24, 'уқайтарғыштар', 'противоядия', 'antidotes', 'disaster_medicine'),
  (25, 'уытты доза', 'токсическая доза', 'toxic dose', 'disaster_medicine'),
  (26, 'уытты араласпа', 'токсичные примеси', 'toxic impurities', 'industrial_safety'),
  (27, 'ультиматум', 'ультиматум', 'ultimatum', 'coordination'),
  (28, 'уәкілетті мемлекеттік орган', 'уполномоченный государственный орган', 'authorized state body', 'coordination'),
  (29, 'уәкілеттік беру', 'уполномочивать', 'authorize', 'coordination'),
  (30, 'уақытша орналастыру орталығы', 'центр временного размещения', 'temporary accommodation center', 'evacuation'),
  (31, 'ушығу', 'эскалация', 'escalation', 'coordination'),
  (32, 'улы газ', 'ядовитый газ', 'poisonous gas', 'civil_defense'),
  (33, 'уландырғыш заттек', 'вещество отравляющее', 'poisonous substance', 'civil_defense'),
  (34, 'учәскелік дәрігер, учәске дәрігері', 'врач участковый', 'district physician', 'disaster_medicine'),
  (35, 'уақытша бақылау пункті', 'временный контрольный пункт', 'temporary checkpoint', 'civil_defense'),
  (36, 'уақыт интервалы', 'временной интервал', 'time interval', 'coordination'),
  (37, 'уақытша шекаралық бекет', 'временный пограничный пост', 'temporary border post', 'civil_defense'),
  (38, 'уәж', 'мотив', 'motive', 'coordination'),
  (39, 'учаске', 'участок', 'section', 'coordination');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'У';

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
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'У') as u_now,
       (select count(*) from public.terms) as terms_now;

commit;
