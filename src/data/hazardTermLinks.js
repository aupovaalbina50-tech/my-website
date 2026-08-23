// Links each emergency-type node on the terminological map to the parts of
// the existing `terms` table (Supabase) that actually describe it:
//   - `categories`: exact matches against the `terms.category` column
//     (see CATEGORIES in i18n/translations.js) — used where a hazard maps
//     cleanly onto an existing category (fire -> fire_safety, industrial
//     accidents -> industrial_safety).
//   - `keywords`: kk/ru substrings checked against `terms.kk` / `terms.ru`
//     — used for hazard types the current category taxonomy doesn't break
//     out on its own (flood, landslide, earthquake, wind, chemical,
//     radiation). Every keyword here was checked against the real term
//     data in supabase/migrations before being added.
//
// This is a client-side stand-in for a proper relation. Nothing here is
// invented — a hazard with no real matching terms yet (e.g. chemical) is
// left with an empty/thin keyword list on purpose rather than padded out,
// so the map can say so honestly instead of showing unrelated terms.
//
// To move this server-side later, the shape maps directly onto either a
// `hazard_id text` column added to `terms`, or a join table such as
// `hazard_term_links(hazard_id text, term_id uuid)`.
export const HAZARD_TERM_LINKS = {
  fire: { categories: ['fire_safety'], keywords: [] },
  flood: { categories: [], keywords: ['наводнен', 'паводок', 'тасқын'] },
  landslide: { categories: [], keywords: ['оползен', 'обвал', 'көшкін'] },
  earthquake: { categories: [], keywords: ['землетрясен', 'сейсм', 'сілкін'] },
  wind: { categories: [], keywords: ['ураган', 'шторм', 'шквал', 'смерч', 'дауыл'] },
  chemical: { categories: [], keywords: ['химическ', 'химиялық', 'токсич', 'отравля'] },
  radiation: { categories: [], keywords: ['радиац', 'радиоактив'] },
  industrial: { categories: ['industrial_safety'], keywords: [] },
}
