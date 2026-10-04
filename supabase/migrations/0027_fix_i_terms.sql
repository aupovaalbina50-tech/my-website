-- =============================================================
-- Fixes to «І» terms, requested by the site owner:
--  * older «І» rows stored with capitalised kk / ru / en are lower-cased
--    like the rest of the glossary (the site capitalises on display);
--  * typo «помошь» -> «помощь»;
--  * «іздеу-барлау жұмыстары» moves to rescue_ops (search and
--    reconnaissance work in rescue operations).
--
-- Applied with: npx supabase db query --linked -f supabase/migrations/0027_fix_i_terms.sql
-- =============================================================
update public.terms set kk = 'ізгілік көмек', ru = 'гуманитарная помощь', en = 'humanitarian aid'
  where id = '080c84df-2e8b-46ef-bcef-651719c75937';
update public.terms set kk = 'іркіліс', ru = 'перебой', en = 'interruption'
  where id = '0b448b00-52bb-4e64-b82d-bd4371028c39';
update public.terms set kk = 'ілгек бақан', ru = 'багор'
  where id = '4790a114-f944-449c-bcf3-73864d71b148';
update public.terms set kk = 'індет, эпизоотия', ru = 'эпизоотия', en = 'epizootic'
  where id = '85a8077a-63ec-4f00-948b-adf5f9bce4d3';
update public.terms set kk = 'індет', ru = 'эпидемия', en = 'epidemic'
  where id = 'd6e87cf1-a797-4597-8962-b3ea5381f6c6';
update public.terms set category = 'rescue_ops'
  where id = '8ef2e4be-ccae-4286-907b-55bf137394f8';
