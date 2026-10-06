-- =============================================================
-- Terms on «Ғ» (Kazakh): the old cards are replaced by the 82 terms the
-- user sent («Ғ-82+анг.docx», kk / ru / en). Copy of the old cards:
-- supabase/backups/terms_kk_GH_2026-10-06.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «Ғ» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0047_replace_kk_gh_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'ғарыш сәулесі', 'космические лучи', 'cosmic rays', 'industrial_safety'),
  (2, 'ғимараттың ұзаққа төзімділігі', 'долговечность зданий', 'building durability', 'industrial_safety'),
  (3, 'ғылымға қайшы', 'антинаучный', 'unscientific', 'coordination'),
  (4, 'ғаныш', 'ганч', 'gypsum plaster', 'industrial_safety'),
  (5, 'ғаныш', 'гипс', 'gypsum', 'industrial_safety'),
  (6, 'ғарыштық түсірімдерді айқындау', 'дешифрирование космических снимков', 'interpretation of satellite imagery', 'coordination'),
  (7, 'ғылым докторы', 'доктор наук', 'doctor of science', 'coordination'),
  (8, 'ғылыми-техникалық құжаттама', 'документация научно-техническая', 'scientific and technical documentation', 'coordination'),
  (9, 'ғимарат', 'здание', 'building', 'industrial_safety'),
  (10, 'ғимараттар мен құрылыстар; ғимараттар мен құрылысжайлар', 'здания и сооружения', 'buildings and structures', 'industrial_safety'),
  (11, 'ғарыштық сәулелендіру', 'излучение космическое', 'cosmic radiation', 'industrial_safety'),
  (12, 'ғылыми-зерттеу институты', 'институт научно-исследовательский', 'research institute', 'coordination'),
  (13, 'ғимараттар арасындағы кәбіл', 'кабель между зданиями', 'interbuilding cable', 'industrial_safety'),
  (14, 'ғылым кандидаты', 'кандидат наук', 'candidate of sciences', 'coordination'),
  (15, 'ғарыш кемесі', 'корабль космический', 'spacecraft', 'coordination'),
  (16, 'ғимарат дәлізі', 'коридор здания', 'building corridor', 'industrial_safety'),
  (17, 'ғарыш қызметі', 'космическая деятельность', 'space activities', 'coordination'),
  (18, 'ғарыштық байланыс', 'космическая связь', 'space communications', 'alerting_comms'),
  (19, 'ғарыштық жылдамдық', 'космическая скорость', 'cosmic velocity', 'coordination'),
  (20, 'ғарыштық орта', 'космическая среда', 'space environment', 'coordination'),
  (21, 'ғарыш аппараты', 'космический аппарат', 'spacecraft', 'coordination'),
  (22, 'ғарыш мазері', 'космический мазер', 'space maser', 'coordination'),
  (23, 'ғарыш объектісі', 'космический объект', 'space object', 'coordination'),
  (24, 'ғарыштық ұшу', 'космический полет', 'space flight', 'coordination'),
  (25, 'ғарыштық сәуле әсері', 'космическое излучение', 'cosmic radiation', 'industrial_safety'),
  (26, 'ғарыш кеңістігі', 'космическое пространство', 'outer space', 'coordination'),
  (27, 'ғаламнама', 'космогония', 'cosmogony', 'coordination'),
  (28, 'ғарыш айлағы', 'космодром', 'spaceport', 'coordination'),
  (29, 'ғарыштану', 'космология', 'cosmology', 'coordination'),
  (30, 'ғарышкер', 'космонавт', 'cosmonaut', 'coordination'),
  (31, 'ғарышнама', 'космонавтика', 'astronautics', 'coordination'),
  (32, 'ғарыш', 'космос', 'space', 'coordination'),
  (33, 'ғарышхимия', 'космохимия', 'cosmochemistry', 'coordination'),
  (34, 'ғарыштық байланыс желісі', 'линия космической связи', 'space communication link', 'alerting_comms'),
  (35, 'ғашықтық эпос', 'любовный эпос', 'romantic epic', 'coordination'),
  (36, 'ғұмырнама', 'мемуар', 'memoir', 'coordination'),
  (37, 'ғұлама', 'мудрец', 'sage', 'coordination'),
  (38, 'ғарыш аппараттарын жерүсті басқару кешені', 'наземный комплекс управления космических аппаратов', 'ground-based spacecraft control complex', 'coordination'),
  (39, 'ғылым', 'наука', 'science', 'coordination'),
  (40, 'ғылымтану', 'науковедение', 'science studies', 'coordination'),
  (41, 'ғылымды қажетсінетін салалар', 'наукоемкие отрасли', 'high-tech industries', 'coordination'),
  (42, 'ғылымды қажетсінетін өндіріс', 'наукоемкое производство', 'high-tech manufacturing', 'coordination'),
  (43, 'ғылымды қажетсінушілік', 'наукоемкость', 'knowledge intensity', 'coordination'),
  (44, 'ғылыми қамтымдық', 'наукоемкость', 'knowledge intensity', 'coordination'),
  (45, 'ғылыми қызмет', 'научная деятельность', 'scientific activity', 'coordination'),
  (46, 'ғылыми жазба', 'научная запись (отчет)', 'scientific report', 'coordination'),
  (47, 'ғылыми зияткерлік меншік', 'научная интеллектуальная собственность', 'scientific intellectual property', 'coordination'),
  (48, 'ғылыми инфрақұрылым', 'научная инфраструктура', 'research infrastructure', 'coordination'),
  (49, 'ғылыми мақала', 'научная статья', 'scientific article', 'coordination'),
  (50, 'ғылыми фантастика', 'научная фантастика', 'science fiction', 'coordination'),
  (51, 'ғылыми-зерттеу жұмысы', 'научно-исследовательская работа', 'research work', 'coordination'),
  (52, 'ғылыми-әдістемелік жұмыс', 'научно-методическая работа', 'scientific and methodological work', 'coordination'),
  (53, 'ғылыми-көпшілік мақала', 'научно-популярная статья', 'popular science article', 'coordination'),
  (54, 'ғылыми-анықтамалық аппарат', 'научно-справочный аппарат', 'scholarly reference apparatus', 'coordination'),
  (55, 'ғылыми-техникалық қызмет', 'научно-техническая деятельность', 'scientific and technical activities', 'coordination'),
  (56, 'ғылыми-техникалық ақпарат', 'научно-техническая информация', 'scientific and technical information', 'coordination'),
  (57, 'ғылыми-техникалық төңкеріс', 'научно-техническая революция', 'scientific and technological revolution', 'coordination'),
  (58, 'ғылыми-техникалық құралдар', 'научно-технические средства', 'scientific and technical equipment', 'coordination'),
  (59, 'ғылыми фантастикалық әдебиет', 'научно-фантастическая литература', 'science fiction literature', 'coordination'),
  (60, 'ғылыми-фантастикалық жанр', 'научно-фантастический жанр', 'science fiction genre', 'coordination'),
  (61, 'ғылыми басылым', 'научное издание', 'scientific publication', 'coordination'),
  (62, 'ғылыми зерттеу', 'научное исследование', 'scientific research', 'coordination'),
  (63, 'ғылыми құқықтық сана', 'научное правосознание', 'scientific legal consciousness', 'coordination'),
  (64, 'ғылыми баяндама', 'научный доклад', 'scientific report', 'coordination'),
  (65, 'ғылыми стиль', 'научный стиль', 'scientific style', 'coordination'),
  (66, 'ғылым қажеттілігі', 'необходимость науки', 'the need for science', 'coordination'),
  (67, 'ғұрып', 'обычай', 'custom', 'coordination'),
  (68, 'ғаламшар', 'планета', 'planet', 'coordination'),
  (69, 'ғарышкердің құқықтық жағдайы', 'правовое положение космонавта', 'legal status of a cosmonaut', 'coordination'),
  (70, 'ғылыми жетекші', 'руководитель научный', 'scientific supervisor', 'coordination'),
  (71, 'ғарыш аппаратын құрастыру', 'сборка космического аппарата', 'spacecraft assembly', 'coordination'),
  (72, 'ғылыми еңбектер жинағы', 'сборник научных трудов', 'collection of scientific papers', 'coordination'),
  (73, 'ғаламдық желі', 'сеть глобальная', 'global network', 'alerting_comms'),
  (74, 'ғалымдар кеңесі', 'совет ученых', 'council of scientists', 'coordination'),
  (75, 'ғарыш аппараттарын сүйемелдеу', 'сопровождение космических аппаратов', 'spacecraft support', 'coordination'),
  (76, 'ғылыми қызметкер', 'сотрудник научный', 'research scientist', 'coordination'),
  (77, 'ғарыштық тәуекелдіктерді сақтандыру', 'страхование космических рисков', 'space risk insurance', 'coordination'),
  (78, 'ғарыштық байланыс телепорты', 'телепорт космической связи', 'space communications teleport', 'alerting_comms'),
  (79, 'ғарыш аппараттары үшін тоқтап тұру нүктесі; ғарыш аппараттарына арналған тұру нүктесі', 'точка стояния для космических аппаратов', 'orbital position for spacecraft', 'coordination'),
  (80, 'ғалым', 'ученый', 'scientist', 'coordination'),
  (81, 'ғалым хатшы', 'ученый секретарь', 'scientific secretary', 'coordination'),
  (82, 'ғылыми кеңес', 'ученый совет', 'academic council', 'coordination');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'Ғ';

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
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'Ғ') as gh_now,
       (select count(*) from public.terms) as terms_now;

commit;
