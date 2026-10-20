import { L } from './fields.js'
import { CATALOG_IDS, TEMPLATES } from './templates.js'

export { TEMPLATES, TEMPLATE_STATUSES, FREE_TEXT_ID, CATALOG_IDS } from './templates.js'
export { FIELD_TYPES } from './fields.js'

// Categories of the catalog. Hidden templates may still name the former
// «analytics» / «personnel» groups; those are not offered any more.
export const CATEGORIES = [
  { key: 'service', letter: 'A', title: L('Қызметтік құжаттама', 'Служебная документация') },
  { key: 'incident', letter: 'B', title: L('Оқиғалар мен ТЖ бойынша құжаттама', 'Документация по происшествиям и ЧС') },
  { key: 'reports', letter: 'C', title: L('Есептік құжаттама', 'Отчётная документация') },
  { key: 'acts', letter: 'D', title: L('Актілер және нәтижелерді тіркеу', 'Акты и фиксация результатов') },
  { key: 'organization', letter: 'E', title: L('Ұйымдастыру құжаттамасы', 'Организационная документация') },
]

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]))

/** Every template by id — also the hidden ones, so older documents keep working. */
export const templateById = (id) => BY_ID.get(id) ?? null

/** The forms offered for new documents, in catalog order. */
export const CATALOG = CATALOG_IDS.map((id) => BY_ID.get(id))
export const inCatalog = (id) => CATALOG_IDS.includes(id)

/** Every field of a template in order, with the section it belongs to. */
export function fieldsOf(template) {
  return (template?.sections ?? []).flatMap((s) => s.fields.map((field) => ({ ...field, section: s.key })))
}

const lower = (s) => String(s ?? '').toLowerCase()

/** Templates of a category (or all), matching the search words in either language. */
export function searchTemplates({ query = '', category = 'all', favorites = null } = {}) {
  const words = lower(query).split(/\s+/).filter(Boolean)
  return CATALOG.filter((t) => {
    if (category === 'favorites') {
      if (!favorites?.has(t.id)) return false
    } else if (category !== 'all' && !t.categories.includes(category)) return false
    if (!words.length) return true
    // Words of the query match the beginning of words («акт» → «акт», «актілер», not «фактілер»).
    const hay = lower(`${t.title.kk} ${t.title.ru} ${t.purpose.kk} ${t.purpose.ru}`).split(/[^\p{L}\p{N}]+/u)
    return words.every((w) => hay.some((word) => word.startsWith(w)))
  })
}

// ---- «Каталог документов и форм» ---------------------------------------------------

// The kind of a document (рапорт, записка, акт…) from its Russian title. A
// filter of the catalog, not a property anyone has to maintain.
export const KINDS = [
  { key: 'raport', re: /^рапорт/i, title: L('Рапорт', 'Рапорт') },
  { key: 'note', re: /записка/i, title: L('Жазба', 'Записка') },
  { key: 'briefing', re: /^доклад$/i, title: L('Баяндама', 'Доклад') },
  { key: 'letter', re: /письмо/i, title: L('Хат', 'Письмо') },
  { key: 'request', re: /^(заявление|представление|предложение)/i, title: L('Өтініш, ұсыным, ұсыныс', 'Заявление, представление, предложение') },
  { key: 'report', re: /отч[её]т/i, title: L('Есеп', 'Отчёт') },
  { key: 'certificate', re: /справка/i, title: L('Анықтама', 'Справка') },
  { key: 'information', re: /информация|материал|обзор/i, title: L('Ақпарат, шолу', 'Информация, обзор') },
  { key: 'plan', re: /^(план|график|программа|перечень)/i, title: L('Жоспар, кесте, бағдарлама', 'План, график, программа') },
  { key: 'regulation', re: /^(положение|инструкция)/i, title: L('Ереже, нұсқаулық', 'Положение, инструкция') },
  { key: 'act', re: /^акт/i, title: L('Акт', 'Акт') },
  { key: 'protocol', re: /^протокол/i, title: L('Хаттама', 'Протокол') },
  { key: 'record', re: /^(ведомость|журнал)/i, title: L('Тізімдеме, журнал', 'Ведомость, журнал') },
  { key: 'personnel', re: /^характеристика/i, title: L('Мінездеме', 'Характеристика') },
]

export const kindOfTemplate = (template) => KINDS.find((k) => k.re.test(template?.title?.ru ?? ''))?.key ?? 'other'

/** Languages a template can be filled in: those it has a title for. */
export const templateLanguages = (template) => ['kk', 'ru'].filter((l) => template?.title?.[l])

/** Required requisites of a template (field labels), in order. */
export const requiredFields = (template) => fieldsOf(template).filter((f) => f.required)

/** Everything a search may match: names, purpose, sections and fields — the situations a document is for. */
function haystack(template) {
  const parts = [template.title.kk, template.title.ru, template.purpose.kk, template.purpose.ru, template.docTitle?.kk, template.docTitle?.ru]
  for (const s of template.sections ?? []) {
    parts.push(s.title?.kk, s.title?.ru)
    for (const f of s.fields) parts.push(f.label?.kk, f.label?.ru, f.hint?.kk, f.hint?.ru)
  }
  return lower(parts.filter(Boolean).join(' ')).split(/[^\p{L}\p{N}]+/u)
}
const HAY = new Map(CATALOG.map((t) => [t.id, haystack(t)]))

/**
 * The catalog with every filter: words (names, purpose and the fields of
 * the form), category, kind, language, status, favorites; sorted. More
 * words found rank higher, a match in the name higher still.
 */
export function filterCatalog({ query = '', category = 'all', kind = 'all', lang = 'all', status = 'all', favoritesOnly = false, favorites = null, sort = 'category', uiLang = 'ru' } = {}) {
  const words = lower(query).split(/\s+/).filter((w) => w.length > 1)
  const scored = []
  for (const t of CATALOG) {
    if (category !== 'all' && !t.categories.includes(category)) continue
    if (kind !== 'all' && kindOfTemplate(t) !== kind) continue
    if (lang !== 'all' && !templateLanguages(t).includes(lang)) continue
    if (status !== 'all' && t.status !== status) continue
    if (favoritesOnly && !favorites?.has(t.id)) continue
    let score = 0
    if (words.length) {
      const name = lower(`${t.title.kk} ${t.title.ru}`).split(/[^\p{L}\p{N}]+/u)
      const all = HAY.get(t.id)
      // A word matches by its beginning; a long word also without its ending («помещения» → «помещен…»).
      const stem = (w) => (w.length >= 7 ? w.slice(0, -2) : w.length >= 5 ? w.slice(0, -1) : w)
      const prefix = (list, w) => list.some((word) => word.startsWith(stem(w)))
      const matched = words.filter((w) => prefix(all, w)).length
      // Most of the words must be found (a situation is described in several words).
      if (matched < Math.ceil(words.length / 2)) continue
      score = matched * 2 + words.filter((w) => prefix(name, w)).length
    }
    scored.push({ t, score })
  }
  const byName = (a, b) => a.t.title[uiLang].localeCompare(b.t.title[uiLang], uiLang === 'kk' ? 'kk' : 'ru')
  const catIndex = (t) => CATEGORIES.findIndex((c) => c.key === t.categories[0])
  const order = {
    category: (a, b) => catIndex(a.t) - catIndex(b.t),
    name: byName,
    favorites: (a, b) => Number(Boolean(favorites?.has(b.t.id))) - Number(Boolean(favorites?.has(a.t.id))) || byName(a, b),
  }[sort] ?? (() => 0)
  return scored.sort((a, b) => b.score - a.score || order(a, b)).map((x) => x.t)
}
