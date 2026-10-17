import { supabase } from '../../../supabaseClient'

export { actualityOf } from './actuality.js'

// Sources of normative statements and their priority. The registry itself is
// the table public.kb_sources (migration 0030; read by anyone): every act the
// platform knows with its number, date, link and status. Nothing here is a
// copy of an act and no act is added by the client: an act the registry does
// not hold is shown as «Требуется проверка актуальности».
//
//   1 internal base of the site
//   2 normative legal act of RK (ИПС «Әділет»)
//   3 official state information resource (МЧС РК, gov.kz, termincom.kz)
//   4 other verified source

export const SOURCE_PRIORITIES = [1, 2, 3, 4]

// Where an act is checked by hand. These are the home pages of the official
// systems; the platform has no API connection to them.
export const OFFICIAL_SITES = [
  { key: 'adilet', priority: 2, url: 'https://adilet.zan.kz', title: { ru: 'ИПС «Әділет» — законодательство Республики Казахстан', kk: '«Әділет» АҚЖ — Қазақстан Республикасының заңнамасы' } },
  { key: 'mchs', priority: 3, url: 'https://www.gov.kz/memleket/entities/emer', title: { ru: 'МЧС Республики Казахстан на портале gov.kz', kk: 'ҚР ТЖМ gov.kz порталында' } },
  { key: 'termincom', priority: 3, url: 'https://termincom.kz', title: { ru: 'Республиканская терминологическая комиссия', kk: 'Республикалық терминология комиссиясы' } },
]

let cache = null

/** The acts of the registry (priority 2–3), loaded once per page. */
export function loadRegistry() {
  if (!cache) {
    cache = supabase
      .from('kb_sources')
      .select('*')
      .in('priority', [2, 3])
      .then(({ data, error }) => {
        if (error) {
          cache = null
          throw error
        }
        return data ?? []
      })
  }
  return cache
}
