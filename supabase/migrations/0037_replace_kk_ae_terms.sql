-- =============================================================
-- Terms on «Ә» (Kazakh): the 16 old cards are replaced by the 59 terms the
-- user sent («Ә-59 + англ.docx», kk / ru / en). Copy of the old cards:
-- supabase/backups/terms_kk_AE_2026-10-05.json.
--
-- A new term whose Kazakh text equals an old card's updates that card in
-- place, so favourites and learning progress on it are kept; the other old
-- «Ә» cards are deleted (their user rows go with them, on delete cascade),
-- the rest of the new terms are inserted.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0037_replace_kk_ae_terms.sql
-- =============================================================

begin;

create temp table new_o (n int, kk text, ru text, en text, category text) on commit drop;
insert into new_o values
  (1, 'әкімшілік айыппұлдар', 'административные штрафы', 'administrative fines', 'coordination'),
  (2, 'әскери қабілеттілік', 'боевая способность', 'combat capability', 'civil_defense'),
  (3, 'әскери кеме', 'боевое судно', 'warship', 'civil_defense'),
  (4, 'әскерилендірілген құрылым', 'военизированное формирование', 'paramilitary formation', 'civil_defense'),
  (5, 'әскери әкімшілік', 'военная администрация', 'military administration', 'civil_defense'),
  (6, 'әскери академия', 'военная академия', 'military academy', 'civil_defense'),
  (7, 'әскери кафедра', 'военная кафедра', 'military department; military training department', 'civil_defense'),
  (8, 'әскери қуат', 'военная мощь', 'military power', 'civil_defense'),
  (9, 'әскери ғылым', 'военная наука', 'military science', 'civil_defense'),
  (10, 'әскери пошта', 'военная почта', 'military mail', 'civil_defense'),
  (11, 'әскери барлау', 'военная разведка', 'military intelligence', 'civil_defense'),
  (12, 'әскери стратегия', 'военная стратегия', 'military strategy', 'civil_defense'),
  (13, 'әскери құрылым', 'военная структура', 'military structure', 'civil_defense'),
  (14, 'әскери теория', 'военная теория', 'military theory', 'civil_defense'),
  (15, 'әскери терминология', 'военная терминология', 'military terminology', 'civil_defense'),
  (16, 'әскери техника', 'военная техника', 'military equipment', 'civil_defense'),
  (17, 'әскери топография', 'военная топография', 'military topography', 'civil_defense'),
  (18, 'әскери киім', 'военная форма', 'military uniform', 'civil_defense'),
  (19, 'әскери өнеркәсіп кешені', 'военно промышленный комплекс', 'military-industrial complex', 'civil_defense'),
  (20, 'әскери дәрігерлік комиссия', 'военно-врачебная комиссия', 'military medical commission', 'disaster_medicine'),
  (21, 'әскери-инженерлік іс', 'военно-инженерное дело', 'military engineering', 'civil_defense'),
  (22, 'әскери-инженерлік өнер', 'военно-инженерное искусство', 'military engineering; the art of military engineering', 'civil_defense'),
  (23, 'әскери-далалық госпиталь', 'военно-полевой госпиталь', 'field hospital', 'disaster_medicine'),
  (24, 'әскери-саяси стратегия', 'военно-политическая стратегия', 'military-political strategy', 'civil_defense'),
  (25, 'әскери-саяси блок', 'военно-политический блок', 'military-political bloc; military alliance', 'civil_defense'),
  (26, 'әскери-пошта қызметі', 'военно-почтовая служба', 'Military Postal Service', 'civil_defense'),
  (27, 'әскери-тергеу органдары', 'военно-следственные органы', 'military investigative bodies', 'civil_defense'),
  (28, 'әскери-қызметтік іс-қимыл', 'военно-служебная деятельность', 'military service activities', 'civil_defense'),
  (29, 'әскери-стратегиялық жағдайлар', 'военно-стратегические условия', 'military-strategic conditions', 'civil_defense'),
  (30, 'әскери-стратегиялық жоспар', 'военно-стратегический план', 'military strategic plan', 'civil_defense'),
  (31, 'әскери-стратегиялық плацдарм', 'военно-стратегический плацдарм', 'strategic bridgehead; strategic foothold', 'civil_defense'),
  (32, 'әскери-техникалық ынтымақтастық', 'военно-техническое сотрудничество', 'military-technical cooperation', 'civil_defense'),
  (33, 'әскери қызметші әйелдер', 'военнослужащие-женщины', 'servicewomen', 'civil_defense'),
  (34, 'әскери қызметші', 'военнослужащий', 'serviceman', 'civil_defense'),
  (35, 'әскери өкілдіктер', 'военные представительства', 'military representative offices', 'civil_defense'),
  (36, 'әскери кеңесші', 'военный советник', 'military adviser', 'civil_defense'),
  (37, 'әскери маман', 'военный специалист', 'military specialist', 'civil_defense'),
  (38, 'әскери трибунал', 'военный трибунал', 'military tribunal', 'civil_defense'),
  (39, 'әуе күштері', 'воздушные силы', 'air force', 'civil_defense'),
  (40, 'әскери тәртіп', 'воинская дисциплина', 'military discipline', 'civil_defense'),
  (41, 'әскери жарғылар', 'воинские уставы', 'military regulations', 'civil_defense'),
  (42, 'әскери полигон', 'воинский полигон', 'military training ground', 'civil_defense'),
  (43, 'әскери шен', 'воинский чин', 'military rank', 'civil_defense'),
  (44, 'әскери эшелон', 'воинский эшелон', 'military train', 'civil_defense'),
  (45, 'әскери тәрбие', 'воинское воспитание', 'military education; military upbringing', 'civil_defense'),
  (46, 'әскери атақ', 'воинское звание', 'military rank', 'civil_defense'),
  (47, 'әскер', 'войска', 'troops; military forces; armed forces', 'civil_defense'),
  (48, 'әскери тағылымдам', 'войсковая стажировка', 'military internship', 'civil_defense'),
  (49, 'әскери бөлім', 'войсковая часть', 'military unit', 'civil_defense'),
  (50, 'әскери бақылау', 'войсковое наблюдение', 'military observation', 'civil_defense'),
  (51, 'әскери құрама', 'войсковое соединение', 'military formation', 'civil_defense'),
  (52, 'әскери шаруашылық', 'войсковое хозяйство', 'military logistics', 'civil_defense'),
  (53, 'әлеуметтік оңалту', 'социальная реабилитация', 'social rehabilitation', 'disaster_medicine'),
  (54, 'әлеуметтік жағдай', 'социальное положение', 'social status', 'coordination'),
  (55, 'әлеуметтік қатер', 'социальный риск', 'social risk', 'coordination'),
  (56, 'әлеуметтік тәуекел', 'социальный риск', 'social risk', 'coordination'),
  (57, 'әскери топография', 'топография военная', 'military topography', 'civil_defense'),
  (58, 'әскери қауіпсіздік қатері', 'угроза военной безопасности', 'threat to military security', 'civil_defense'),
  (59, 'әскерлерді басқару', 'управление войсками', 'command and control of troops', 'civil_defense');

create temp table old_o on commit drop as
select id, kk from public.terms where upper(left(trim(kk), 1)) = 'Ә';

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
       (select count(*) from public.terms where upper(left(trim(kk), 1)) = 'Ә') as ae_now,
       (select count(*) from public.terms) as terms_now;

commit;
