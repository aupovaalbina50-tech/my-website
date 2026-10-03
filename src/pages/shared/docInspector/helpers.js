// Plain helpers shared by the inspector UI (no components here, so Fast
// Refresh keeps working for the component files).

import { paragraphNumber } from './pipeline.js'

export const CATEGORY_ICON = { misuse: '🔴', mismatch: '🟠', uncertain: '🟡', ambiguous: '🔵', ok: '🟢' }

/** «Страница 2» / «Абзац 4» — where a finding is. A reopened check keeps its saved labels. */
export function locationLabel(inspection, result, ti) {
  if (inspection.locations?.[result.id]) return inspection.locations[result.id]
  const { doc } = inspection
  if (doc.kind === 'docx' && !doc.pagesKnown) {
    const n = paragraphNumber(doc, result)
    return n ? ti.paragraphLabel(n) : ti.pageLabel(1)
  }
  return ti.pageLabel(result.page)
}

// Common Russian function words, absent from Kazakh text (as in the Edge Function).
const RU_FUNCTION_WORDS = /(?<!\p{L})(?:и|в|во|на|с|со|по|не|что|для|при|от|из|к|за|или|как)(?!\p{L})/u

/**
 * Language of the sentence a finding is in. Judged by the whole sentence:
 * «Нысанда» alone has no Kazakh-only letters, the sentence around it does;
 * English only when the sentence (without the phrase) is all but Latin.
 */
export function sentenceLang(result) {
  const sentence = result.context || result.text
  const kkLetters = sentence.match(/[әғқңөұүһі]/gi)?.length ?? 0
  if (kkLetters >= 2 || (kkLetters === 1 && !RU_FUNCTION_WORDS.test(sentence.toLowerCase()))) return 'kk'
  const rest = sentence.replace(result.text, ' ')
  const cyrillic = rest.match(/\p{Script=Cyrillic}/gu)?.length ?? 0
  return cyrillic < 5 && /\p{Script=Latin}/u.test(rest) ? 'en' : 'ru'
}

/** A base entry in the language the document fragment is written in. */
export function entryText(term, result, fallback) {
  if (!term) return fallback
  return term[sentenceLang(result)] || fallback
}

export function same(a, b) {
  return a.toLowerCase().replace(/ё/g, 'е').trim() === b.toLowerCase().replace(/ё/g, 'е').trim()
}

/** «Рапорт», «Акт»… — the AI's document type in the interface language. */
export function documentTypeLabel(type, ti) {
  if (!type) return null
  return ti.documentTypes[type] ?? type
}
