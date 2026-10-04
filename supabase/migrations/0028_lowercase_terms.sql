-- =============================================================
-- Lower-case the start of every glossary term, as requested by the site
-- owner: all terms (kk / ru / en) start with a small letter, except where
-- grammar requires a capital. Kept as is: abbreviations (ЭОТ, ВОЛС, ЭПУ,
-- DAC, PSU, CAO…), Roman numerals (І және ІІ топтағы…), and official
-- names (Служба радиационной, химической и биологической защиты
-- Министерства обороны Республики Казахстан — all three languages;
-- Unified State System of Records Management; Internal Troops).
-- Title-case inside English terms ("Digital Subscriber Channel") and after
-- "/" ("Igniter / Detonator") was lowered too.
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0028_lowercase_terms.sql
-- =============================================================
update public.terms set kk = 'тұтану', ru = 'воспламенение', en = 'ignition' where id = '07cf0eb4-3cac-43ae-acb3-50d19df69f90';
update public.terms set en = 'protein foam concentrate' where id = '09194284-4199-44b6-acd4-3d027c8e7cb0';
update public.terms set kk = 'ЭОТ электронды-оптикалық түрлендіргіш', ru = 'ЭОП электронно-оптический преобразователь', en = 'IIT (image intensifier tube)' where id = '0c69ee79-b643-4ca6-821c-74b13e0cad39';
update public.terms set en = 'protein foam' where id = '15bcfa61-47b3-41ae-a31e-0959098f3810';
update public.terms set en = 'radiation warning' where id = '180a0b13-f922-4608-8fb7-7a7d16aebe2a';
update public.terms set kk = 'тұтандырғыш', ru = 'запал', en = 'igniter / detonator / primer / fuse' where id = '1943667e-6be5-42c9-a636-ce46d9ed3305';
update public.terms set ru = 'селективный канал', en = 'selective channel' where id = '202dedef-e2bc-424a-8214-93f488d61d42';
update public.terms set kk = 'тексеріп қарау', ru = 'досмотр', en = 'inspection / security screening' where id = '222df958-81bc-454d-a474-e3164449540b';
update public.terms set kk = 'түтіндемейтін саты', ru = 'лестница незадымляемая', en = 'smokeproof staircase' where id = '22abe263-e80d-44ed-8231-c501238bcde6';
update public.terms set en = 'atmospheric precipitation' where id = '25e2d440-e019-4dce-a418-510c4bf79f75';
update public.terms set en = 'automatic broadcast' where id = '28f2138d-9ae0-447d-b247-e136641b618e';
update public.terms set kk = 'экологиялық аудит', ru = 'аудит экологический', en = 'environmental audit' where id = '2ea13f3d-6f69-49c8-b54f-362a3e079d5b';
update public.terms set ru = 'авария в морском праве', en = 'maritime average' where id = '2efc42fd-37f8-46d9-90b2-84dd23a198bc';
update public.terms set kk = 'ТОБК талшықты-оптикалық байланыс кәбілі', ru = 'ВОКС волоконно-оптический кабель связи', en = 'FOCC fiber-optic communication cable' where id = '317a5c39-39ac-4d4e-bc64-838b4872eb00';
update public.terms set ru = 'взрыв цепной', en = 'chain explosion' where id = '381d6631-fef8-4396-bb57-a4237a99a25e';
update public.terms set kk = 'ТК тоқ көзі', ru = 'ИТ источник тока', en = 'CS current source' where id = '388a8b6c-0302-442a-9ca8-66497819c146';
update public.terms set ru = 'индикаторы окислительно-восстановительные', en = 'redox indicators' where id = '3936883e-0f4e-400e-98bc-96360b4c61fe';
update public.terms set kk = 'үш иінді саты', ru = 'лестница трех коленная', en = 'three-section ladder' where id = '3d582db2-a007-41a9-8d6d-500d27641444';
update public.terms set ru = 'селекторная линия связи', en = 'intercom line' where id = '431d6ce0-80c4-45c2-b60d-e18d9a0e041e';
update public.terms set kk = 'ылғалтұрақтылық', ru = 'влагостойкость', en = 'moisture resistance' where id = '44c9af2a-09b3-4bc2-9bce-2d48b1a28163';
update public.terms set kk = 'тотығу', ru = 'окисление', en = 'oxidation' where id = '487b098d-869b-403e-91b3-085ba8719b93';
update public.terms set kk = 'ұйықтану', ru = 'заиление', en = 'siltation' where id = '4c90508a-84a7-4b4c-8ed0-50ee677267bc';
update public.terms set en = 'elevating platform truck' where id = '56359c57-6c3e-4517-825b-55accb04fa98';
update public.terms set kk = 'тез тұтанғыш', ru = 'легковоспламеняющийся', en = 'flammable' where id = '5833fd25-3a96-42dd-9e49-a6b8d1f31539';
update public.terms set ru = 'ингибиторы окисления', en = 'oxidation inhibitors' where id = '60ae6f36-ef91-4057-8ae5-85a406b432f8';
update public.terms set en = 'radiation safety regulations' where id = '60d3c806-19a4-42f8-8fa2-38fc4e58072b';
update public.terms set ru = 'детонация', en = 'detonation' where id = '63b22c81-25d9-4eaa-b4e5-1f894e7a8131';
update public.terms set ru = 'штеккерный соединитель', en = 'plug-in connector' where id = '63bd74e1-385d-4179-b26e-168386853775';
update public.terms set ru = 'электропитающее устройство (ЭПУ)', en = 'power supply unit (PSU)' where id = '654bc650-48e6-4c25-b219-d94209c17dc8';
update public.terms set kk = 'ЦАА цифрлы абонент арнасы', ru = 'ЦАК цифровой абонентский канал', en = 'digital subscriber channel' where id = '67b6c29d-18f0-40cb-a995-56b45a72dadc';
update public.terms set ru = 'искрогаситель', en = 'spark arrester' where id = '71be46b3-56cc-43c2-bf35-d31d59041e57';
update public.terms set en = 'incident occurred time' where id = '73e5af89-b8b8-42dd-a425-7d30ea94dfa6';
update public.terms set en = 'communications battalion' where id = '7499356d-87e2-4ce2-9f75-203313dab5ed';
update public.terms set en = 'activator reagent' where id = '749e97b1-0994-4307-b8ab-e45e8a36e9be';
update public.terms set ru = 'окиси', en = 'oxides' where id = '797fe1c2-227d-468d-b50d-9520d00ca16b';
update public.terms set kk = 'түтіндемейтін сатылы алаң', ru = 'клетка лестничная незадымляемая', en = 'smokeproof stairwell' where id = '79ca04f3-de7d-46bd-adfb-2fa878a8f6e1';
update public.terms set en = 'reserve engine' where id = '7cb1592d-dfc5-4721-8366-fc52e95e389b';
update public.terms set en = 'hypothermia' where id = '7d9af530-7a1b-41ce-b894-ff933d1b6f85';
update public.terms set kk = 'ТОК талшықты-оптикалық кәбіл', ru = 'ВОК волоконно-оптический кабель', en = 'FOC fiber-optic cable' where id = '7e7bfaf3-3655-40ba-9747-e1edbe83c771';
update public.terms set ru = 'респиратор', en = 'respirator' where id = '8226df26-3121-4c35-ac8f-de3b314bcd80';
update public.terms set kk = 'түтіннен шыққан дүрбелең', ru = 'паника вызванная появлением дыма', en = 'panic caused by the appearance of smoke' where id = '85942e42-be04-4ff7-baf2-1ca368dcc3cc';
update public.terms set kk = 'техникалық-өрт сөндіру комиссиясы', ru = 'пожарно-техническая комиссия', en = 'fire safety commission' where id = '88b9eed8-03ad-4dd6-b7dc-17a1821410d7';
update public.terms set kk = 'ұнтақпен өрт сөндірудің автоматтық жүйесі', ru = 'автоматическая система порошкового пожаротушение', en = 'automatic dry powder fire suppression system' where id = '89877501-d295-4124-9b70-f77fc8ea5baf';
update public.terms set kk = 'штабтық өрт сөндіргіш автомобиль', ru = 'автомобиль пожарной штабной', en = 'fire command vehicle' where id = '89a53fd2-e82e-4e15-b081-66f5d2d058a8';
update public.terms set kk = 'үдеріс', ru = 'процесс', en = 'process' where id = '8d24711b-5c21-48c4-bb39-8f0720ec007d';
update public.terms set kk = 'тергеуге дейінгі тексеріс', ru = 'доследственная проверка', en = 'pre-investigation check' where id = '8df37f7c-dc0c-4f61-9387-1cb40ecb7b4a';
update public.terms set kk = 'тежегіштер', ru = 'ингибиторы', en = 'inhibitors' where id = '95b7de85-10bd-471f-b6d7-e46c00497336';
update public.terms set ru = 'штеккерный разъем', en = 'plug connector' where id = '97b59fc9-085b-49aa-93d3-a5660c59623b';
update public.terms set en = 'biomass growth' where id = '97fc364d-cde6-4520-a37a-901163b14ea3';
update public.terms set kk = 'ызасу ағыны', ru = 'поток грунтовый', en = 'groundwater flow' where id = '9b413f7f-07a4-4c47-9bf8-4c0dd6aea285';
update public.terms set kk = 'уәкілеттік беру' where id = 'a24f8304-15de-444d-87a6-50107b2467f6';
update public.terms set kk = 'тасқұлама' where id = 'ae3763e9-2124-4efe-a02d-4f8bd3f3dbf3';
update public.terms set en = 'persons with group I and group II disabilities' where id = 'b1744204-8f4a-453a-be63-2305e8146eed';
update public.terms set ru = 'кран (водопроводный)', en = 'tap (faucet)' where id = 'b54d4f18-1b44-495c-a84e-5a9bbc927f3d';
update public.terms set kk = 'байытылған жанармай қоспасы', ru = 'обогащенная горючая смесь', en = 'enriched fuel mixture' where id = 'b804dade-a5ea-4355-bbab-204e17f3020e';
update public.terms set kk = 'ықтимал, қарымды, әлеуметті', ru = 'потенциальный', en = 'potential' where id = 'b8b4279c-beb7-461f-83aa-584c902db20d';
update public.terms set ru = 'сетка вещания', en = 'broadcast schedule' where id = 'ba574ef3-bdc5-4f96-b1e6-ebe12ed8cc78';
update public.terms set ru = 'селективный вызов', en = 'selective calling' where id = 'bb120b80-6463-4035-bddf-d24414a2b09b';
update public.terms set en = 'head of the garrison' where id = 'bc2608b3-9633-4eaf-9f2c-3dd7d3703801';
update public.terms set en = 'chief administrative officer (CAO) / head of administration' where id = 'c0b6501c-e5de-4857-bafb-e545c76d2431';
update public.terms set en = 'dispatch control / dispatcher control' where id = 'c392a483-4069-4713-9984-c37373cbd1c7';
update public.terms set en = 'compressed air' where id = 'c8d80606-b0a7-4358-b773-7a7471cea8c1';
update public.terms set kk = 'террорлық, лаңкестік', ru = 'терроризм', en = 'terrorism' where id = 'cb987d7b-63e4-4dd4-b302-32a4d2bf7715';
update public.terms set kk = 'эрозия', ru = 'эрозия', en = 'erosion' where id = 'ce3a6af7-d541-49d8-b8f0-d98e5b830ca7';
update public.terms set ru = 'кабель ВОЛС', en = 'fiber-optic cable' where id = 'cf16f1c3-eb25-4c97-bcaa-7109d70cde96';
update public.terms set kk = 'ТОБЖ талшықты-оптикалық байланыс желісі', ru = 'ВОЛС волоконно-оптическая линия связи', en = 'FOCL fiber-optic communication line' where id = 'd4eaf38e-0e8d-4374-b73f-e8ccb4ea1d96';
update public.terms set en = 'dressing material, bandage, dressing' where id = 'd921a5c2-71f1-41bb-8ed4-461e2995e880';
update public.terms set kk = 'ТТГ толықтыру тоғының генераторы', ru = 'ГТН генератор тока накачки', en = 'GTN pump current generator' where id = 'd946f95b-0055-4f6c-af63-338d1790ee5c';
update public.terms set kk = 'хабар-ошарсыз', ru = 'без вести (пропавшие)', en = 'missing' where id = 'dbbae44e-8b96-4f23-9dba-52151fd08b01';
update public.terms set en = 'jack feet' where id = 'dff35a2a-ec29-458d-8ad9-6b21bb7d5275';
update public.terms set kk = 'ұнтақты өрт сөндіргіш', ru = 'огнетушитель порошковый', en = 'dry powder fire extinguisher' where id = 'e0d50793-ff63-445e-acff-b5a7306b0596';
update public.terms set en = 'senior dispatcher' where id = 'e6a82219-9d0f-48db-a4c9-dcea42bdd5ac';
update public.terms set kk = 'тұйықталу', ru = 'замыкание', en = 'short circuit' where id = 'e801b9d0-6e89-4ab2-9a43-f2562268809e';
update public.terms set en = 'radio iodine concentration' where id = 'e8eadb06-4d1c-4ca4-a1e2-89967721d911';
update public.terms set kk = 'уәкілетті' where id = 'ea1b472b-0cf2-4bf3-928e-8e4c85cc6a55';
update public.terms set ru = 'штеккерное соединение', en = 'plug-in connection' where id = 'edc4eb66-ed30-44a7-b014-a8310c9902ff';
update public.terms set kk = 'үрей', ru = 'паника', en = 'panic' where id = 'ef9917b8-7ada-48bf-84ce-e32d72c50d35';
update public.terms set kk = 'ылғал сыйымдылық', ru = 'влагоемкость', en = 'moisture-holding capacity' where id = 'f32d3cf2-f3e5-4bbb-8cbe-171a21e18c0f';
update public.terms set kk = 'ЦАТ цифрлы-аналогтық түрлендіргіш', ru = 'ЦАП цифро-аналоговый преобразователь', en = 'DAC (digital-to-analog converter)' where id = 'f5fc7303-9fdb-4a63-b793-c1c807786e17';
update public.terms set en = 'psychological trap' where id = 'f73ab407-a072-414b-b9f4-e9623194da16';
update public.terms set kk = 'ТОТЖ талшықты-оптикалық тарату жүйесі', ru = 'ВОСП волоконно-оптическая система передачи', en = 'FOTS fiber-optic transmission system' where id = 'fcfac76d-4aaf-4260-8804-37ada70964c2';
update public.terms set en = 'administrative department / general affairs department'
  where en = 'administrative department / General Affairs Department';
update public.terms set en = 'chief, head of the garrison'
  where en = 'chief,Head of the garrison';
