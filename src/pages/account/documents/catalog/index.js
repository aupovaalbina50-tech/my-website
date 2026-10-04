import { L } from './fields.js'
import { TEMPLATES } from './templates.js'

export { TEMPLATES, TEMPLATE_STATUSES } from './templates.js'
export { FIELD_TYPES } from './fields.js'

export const CATEGORIES = [
  { key: 'service', letter: 'A', title: L('Қызметтік-баяндау құжаттамасы', 'Служебно-докладная документация') },
  { key: 'reports', letter: 'B', title: L('Есептік құжаттама', 'Отчётная документация') },
  { key: 'incident', letter: 'C', title: L('Оқиғалар мен ТЖ бойынша құжаттама', 'Документация по происшествиям и ЧС') },
  { key: 'organization', letter: 'D', title: L('Ұйымдастыру құжаттамасы', 'Организационная документация') },
  { key: 'acts', letter: 'E', title: L('Актілер мен тіркеу құжаттамасы', 'Актовая и фиксирующая документация') },
  { key: 'analytics', letter: 'F', title: L('Талдамалық құжаттама', 'Аналитическая документация') },
  { key: 'personnel', letter: 'G', title: L('Кадрлық / ішкі қызметтік құжаттама', 'Кадровая и внутрислужебная документация') },
]

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]))

export const templateById = (id) => BY_ID.get(id) ?? null

/** Every field of a template in order, with the section it belongs to. */
export function fieldsOf(template) {
  return (template?.sections ?? []).flatMap((s) => s.fields.map((field) => ({ ...field, section: s.key })))
}

const lower = (s) => String(s ?? '').toLowerCase()

/** Templates of a category (or all), matching the search words in either language. */
export function searchTemplates({ query = '', category = 'all', favorites = null } = {}) {
  const words = lower(query).split(/\s+/).filter(Boolean)
  return TEMPLATES.filter((t) => {
    if (category === 'favorites') {
      if (!favorites?.has(t.id)) return false
    } else if (category !== 'all' && !t.categories.includes(category)) return false
    if (!words.length) return true
    // Words of the query match the beginning of words («акт» → «акт», «актілер», not «фактілер»).
    const hay = lower(`${t.title.kk} ${t.title.ru} ${t.purpose.kk} ${t.purpose.ru}`).split(/[^\p{L}\p{N}]+/u)
    return words.every((w) => hay.some((word) => word.startsWith(w)))
  })
}
