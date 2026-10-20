-- Fire-tactics terms the base lacked: a check of a fire report could not
-- point to a base entry for «караул», «пожарный ствол», «ликвидация пожара»,
-- «пострадавший» and others, so the inspector had no term to suggest.
--
-- Kazakh forms follow what the site already uses: «оқпан» (ауа-көбікті
-- оқпан, «Бірінші оқпан» in the fire report), «жеңқұбыр желісі» (наращивание
-- рукавной линии), «Өрттің нөмірі (дәрежесі)» (fire report form), «өрт жою»
-- (время ликвидации пожара), «эвакуациялау». Not added until an official
-- Kazakh form is confirmed: СИЗОД, кровля.
--
-- Only terms whose Russian text is not in the base yet are inserted, so
-- running it again changes nothing. No existing card is changed or deleted.
--
-- Apply: Supabase → SQL Editor → paste this file → Run

insert into public.terms (kk, ru, en, category)
select v.kk, v.ru, v.en, v.category
from (
  values
    ('қарауыл', 'караул', 'watch, shift', 'fire_safety'),
    ('кезекші қарауыл', 'дежурный караул', 'duty watch, duty shift', 'fire_safety'),
    ('өрт сөндіру оқпаны', 'пожарный ствол', 'fire nozzle, branchpipe', 'fire_safety'),
    ('оқпанды беру', 'подача ствола', 'nozzle deployment', 'fire_safety'),
    ('өрттің нөмірі (дәрежесі)', 'номер (ранг) пожара', 'fire alarm level', 'fire_safety'),
    ('өртті жою', 'ликвидация пожара', 'fire extinguishment', 'fire_safety'),
    ('өрт ауданы', 'площадь пожара', 'fire area', 'fire_safety'),
    ('жеңқұбыр желісі', 'рукавная линия', 'hose line', 'fire_safety'),
    ('адамдарды эвакуациялау', 'эвакуация людей', 'evacuation of people', 'civil_defense'),
    ('зардап шеккен', 'пострадавший', 'injured person, victim', 'emergencies'),
    ('қаза тапқан', 'погибший', 'fatality', 'emergencies'),
    ('полиция', 'полиция', 'police', 'coordination')
) as v(kk, ru, en, category)
where not exists (select 1 from public.terms t where lower(trim(t.ru)) = lower(v.ru));
