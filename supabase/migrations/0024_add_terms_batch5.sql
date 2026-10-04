-- =============================================================
-- Batch add 5: terms starting with «Д» (29 terms), supplied by the site
-- owner as a kk / ru / en table pasted in chat.
-- category values map to CATEGORIES keys in src/i18n/translations.js;
-- assigned by best judgement (the source didn't specify one), matching
-- the categories of similar terms already in the base.
--
-- Cleanup applied while extracting from the source table: spaces lost
-- when copying from the source document were restored
-- ("дәріқобдишасы" -> "дәрі қобдишасы", "полевойштаб" -> "полевой штаб"…),
-- a double space was removed ("интенсивность  звука").
-- Skipped because they are already in the base: «дренчерлік өрт
-- сөндірудің автоматты жүйесі», «дауылды алдын ала ескерту», «дауылды
-- жел», «дауылды су ағыны»; «далалық штаб» appeared twice in the source
-- and is added once.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0024_add_terms_batch5.sql
-- =============================================================
insert into public.terms (kk, ru, en, category)
values
  ('дабыл бойынша жолға шығу', 'выезд по тревоге', 'deployment in response to an alarm', 'rescue_ops'),
  ('дабыл, сигнал', 'сигнал', 'signal', 'alerting_comms'),
  ('дағдарыс кезеңі', 'кризисный период', 'period of crisis', 'emergencies'),
  ('далалық жабдықталым', 'полевое довольствие', 'field fare', 'coordination'),
  ('далалық киім', 'форма полевая', 'field uniform', 'coordination'),
  ('далалық штаб', 'полевой штаб', 'field headquarters', 'coordination'),
  ('дамба', 'дамба', 'dam', 'industrial_safety'),
  ('даулы жағдай', 'конфликтная ситуация', 'conflict situation', 'coordination'),
  ('дәке майлық', 'салфетка марлевая', 'gauze pad', 'disaster_medicine'),
  ('дәрі қобдишасы', 'аптечка', 'first aid kit', 'disaster_medicine'),
  ('дәрі-дәрмекпен қамтамасыз ету', 'лекарственное обеспечение', 'provision of medicines', 'disaster_medicine'),
  ('дәрілік асқыну', 'лекарственное обострение', 'drug-induced exacerbation', 'disaster_medicine'),
  ('дәрілік жиынтық', 'сбор лекарственный', 'medicinal herbal blend', 'disaster_medicine'),
  ('дәрілік заттек', 'лекарственное вещество', 'medicinal substance', 'disaster_medicine'),
  ('дәруменсіздік', 'авитаминоз', 'avitaminosis', 'disaster_medicine'),
  ('демалыс жәрдемақысы', 'пособие выходное', 'mustering-out pay', 'coordination'),
  ('дене пульсі', 'пульс тела', 'body''s pulse', 'disaster_medicine'),
  ('денсаулыққа ауыр зиян келтіру', 'причинение тяжкого вреда здоровью', 'infliction of grievous bodily harm', 'disaster_medicine'),
  ('денсаулыққа ауырлығы орташа зиян', 'средней тяжести вред здоровью', 'moderate harm to health', 'disaster_medicine'),
  ('денсаулыққа жеңіл зиян келтіру', 'причинение легкого вреда здоровью', 'causing minor harm to health', 'disaster_medicine'),
  ('денсаулыққа зиян келтіру', 'причинение вреда здоровью', 'causing harm to health', 'disaster_medicine'),
  ('денсаулыққа орташа зиян келтіру', 'причинение среднего вреда здоровью', 'causing moderate harm to health', 'disaster_medicine'),
  ('динамикалық сорап', 'насос динамический', 'dynamic pump', 'industrial_safety'),
  ('диспетчерлік ақпарат', 'информация диспетчерская', 'dispatch information', 'coordination'),
  ('дүлей зілзала аймағы', 'зона стихийного бедствия', 'natural disaster zone', 'emergencies'),
  ('дыбыс күші', 'сила звука', 'sound intensity', 'alerting_comms'),
  ('дыбыс оқшаулау', 'звукоизоляция', 'soundproofing', 'industrial_safety'),
  ('дыбыстың қарқындылығы', 'интенсивность звука', 'sound intensity', 'alerting_comms'),
  ('дымқыл дәке', 'примочка', 'lotion', 'disaster_medicine')
;
