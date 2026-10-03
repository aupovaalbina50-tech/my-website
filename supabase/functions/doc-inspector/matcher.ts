// Deterministic glossary matcher — no AI involved.
//
// Finds every occurrence of every glossary term (kk and ru forms) in the
// document text, allowing grammatical endings, and classifies it:
//   'ok'  — written exactly as in the glossary (up to case and word endings)
//   'fix' — same words, but the hyphen/space between them differs from the
//           official spelling («аварийно спасательные работы» vs
//           «аварийно-спасательные работы»). The replacement keeps the
//           document's own words and endings and only fixes the separators,
//           so it can never change the meaning.
//   'variant' — an unofficial wording listed in term_variants («пожарник»
//           for «огнеборец»); the official term is suggested instead.
//   'foreign' — a base term in another language than its sentence: an
//           English term in Russian / Kazakh text, or a Russian term in a
//           Kazakh sentence whose Kazakh base entry is different
//           («огнетушитель» where the base has «өрт сөндіргіш»).
//
// The same matcher validates every AI suggestion (see analyze.ts): a
// suggestion is only auto-applicable when it is, word for word, a glossary
// term in the official spelling.
//
// Pure TypeScript (no Deno APIs), so it can also be unit-tested with Node.

import type { GlossaryTerm } from './glossary.ts'

export type SepKind = 'space' | 'hyphen' | 'dash' | 'none'

export type Lang = 'kk' | 'ru' | 'en'

export interface TermForm {
  term: GlossaryTerm
  termIndex: number
  lang: Lang
  /** Official spelling of this form, e.g. «аварийно-спасательные работы». */
  text: string
  seps: SepKind[]
  regex: RegExp
  anchored: RegExp
  probe: string
  /** An unofficial wording from term_variants, not the official term. */
  unofficial: boolean
}

export interface TermMatch {
  start: number
  end: number
  text: string
  form: TermForm
  /** 'variant': an unofficial wording of the term (form.unofficial); 'foreign': see above. */
  status: 'ok' | 'fix' | 'variant' | 'foreign'
  /** Language of the sentence the match is in. */
  sentenceLang: Lang
  /** For 'fix': the document's words joined with the official separators. */
  replacement?: string
}

// Russian inflectional endings. A word's own ending is stripped from the
// glossary form and any ending from this list is accepted in the document,
// so «эвакуация» matches «эвакуации» / «эвакуацией» but «пожар» does not
// match «пожарный».
const RU_ENDINGS = [
  'иями', 'ями', 'ами', 'иях', 'ией', 'ием', 'иям', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими',
  'ия', 'ии', 'ию', 'ой', 'ей', 'ом', 'ем', 'ам', 'ям', 'ах', 'ях', 'ов', 'ев', 'ий', 'ый',
  'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ую', 'юю', 'ым', 'им', 'ых', 'их', 'ью',
  'а', 'я', 'ы', 'и', 'у', 'ю', 'е', 'о', 'ь', 'й',
]
const RU_ENDING_RE = `(?:${RU_ENDINGS.join('|')})?`
// Kazakh is agglutinative: the stem stays, suffixes pile up. Final к/қ/п
// voice to г/ғ/б before a vowel suffix (көмек -> көмегі).
const KK_SUFFIX_RE = '\\p{L}{0,12}'
const KK_LETTERS = /[әғқңөұүһі]/i
// English: the base's en column. Plural / possessive endings only.
const EN_SUFFIX_RE = "(?:s|es|'s)?"

const HYPHENS = '\\-\\u2010\\u2011\\u2012\\u2013\\u2014\\u2015'
const SEP_RE = `([\\s\\u00A0]*(?:[${HYPHENS}][\\s\\u00A0]*)?)`

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** ё -> е, length-preserving, so offsets in the normalised text stay valid. */
export function foldYo(text: string): string {
  return text.replace(/ё/g, 'е').replace(/Ё/g, 'Е')
}

export function sepKind(sep: string): SepKind {
  if (sep === '') return 'none'
  if (sep === '-' || sep === '‐' || sep === '‑') return 'hyphen'
  if (new RegExp(`[${HYPHENS}]`).test(sep)) return 'dash'
  return 'space'
}

function isAbbreviation(word: string): boolean {
  return word.length >= 2 && word.length <= 8 && word === word.toUpperCase() && /\p{Lu}/u.test(word)
}

function wordPattern(word: string, lang: Lang, beforeHyphen: boolean): string {
  const lower = foldYo(word.toLowerCase())
  // The first part of a hyphenated compound («аварийно-») never inflects.
  if (beforeHyphen ||!/^\p{L}+$/u.test(lower) || lower.length < 3) return escapeRe(lower)
  if (lang === 'en') return `${escapeRe(lower)}${EN_SUFFIX_RE}`
  if (lang === 'kk') {
    const last = lower.at(-1)!
    if (lower.length >= 4 && 'кқп'.includes(last)) {
      const voiced = { к: 'кг', қ: 'қғ', п: 'пб' }[last as 'к' | 'қ' | 'п']
      return `${escapeRe(lower.slice(0, -1))}[${voiced}]${KK_SUFFIX_RE}`
    }
    return `${escapeRe(lower)}${KK_SUFFIX_RE}`
  }
  let stem = lower
  let stripped = ''
  for (const ending of RU_ENDINGS) {
    if (lower.endsWith(ending) && lower.length - ending.length >= 3) {
      stem = lower.slice(0, -ending.length)
      stripped = ending
      break
    }
  }
  // Nouns in -ие / -ия / -ье / -ья never appear without an ending, while the
  // bare stem is often another word: «обозначен(ие)» vs «обозначен».
  if (['ие', 'ия', 'ье', 'ья'].includes(stripped)) return `${escapeRe(stem)}(?:${RU_ENDINGS.join('|')})`
  return `${escapeRe(stem)}${RU_ENDING_RE}`
}

/**
 * Splits one glossary cell into its variants: «А, Б; В (уточнение)». A
 * leading abbreviation with its expansion («ЭОП Электронно-оптический
 * преобразователь») gives both the abbreviation and the expansion.
 */
function variants(cell: string): string[] {
  const out: string[] = []
  for (const raw of cell.replace(/\([^)]*\)/g, ' ').split(/[;,/]/)) {
    const v = raw.replace(/[«»"“”]/g, '').replace(/\s+/g, ' ').trim()
    const lead = /^(\S+)\s+(.+)$/.exec(v)
    if (lead && isAbbreviation(lead[1]) && !isAbbreviation(lead[2].split(' ')[0])) out.push(lead[1], lead[2])
    else out.push(v)
  }
  return out.filter((v) => v.length >= 2)
}

const RU_ADJECTIVE = /(?:ый|ий|ой|ая|яя|ое|ее|ые|ие)$/
const RU_NOT_ADJECTIVE = /(?:ый|ий|ой|ая|яя|ое|ее|ые|ие|ого|его)$/

/**
 * Dictionary-style entries put the noun first («рукав пожарный», «ствол
 * воздушно-пенный»); running text says «пожарный рукав». For such ru
 * entries the natural word order is accepted too.
 */
function naturalOrder(variant: string): string | null {
  const words = variant.split(' ')
  if (words.length < 2 || RU_NOT_ADJECTIVE.test(words[0].toLowerCase())) return null
  if (!RU_ADJECTIVE.test(words[1].toLowerCase())) return null
  return [...words.slice(1), words[0]].join(' ')
}

/** The term's main official spelling in `lang` (first variant of the cell). */
export function primaryText(term: GlossaryTerm, lang: Lang): string {
  const cell = term[lang] || term.ru || term.kk || ''
  return variants(cell)[0] ?? cell
}

function buildForm(term: GlossaryTerm, termIndex: number, lang: Lang, text: string, unofficial = false): TermForm | null {
  const parts = text.split(/(\s*[-‐‑]\s*|\s+)/)
  const words: string[] = []
  const seps: SepKind[] = []
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      if (parts[i]) words.push(parts[i])
    } else {
      seps.push(/[-‐‑]/.test(parts[i]) ? 'hyphen' : 'space')
    }
  }
  if (words.length === 0 || seps.length !== words.length - 1) return null

  const abbr = words.length === 1 && isAbbreviation(words[0])
  let source: string
  let flags = 'gu'
  if (abbr) {
    source = `(${escapeRe(words[0])})`
  } else {
    source = words.map((w, i) => `(${wordPattern(w, lang, seps[i] === 'hyphen')})`).join(SEP_RE)
    flags = 'giu'
  }
  const bounded = `(?<![\\p{L}\\p{N}])${source}(?![\\p{L}\\p{N}])`
  return {
    term,
    termIndex,
    lang,
    text,
    seps,
    regex: new RegExp(bounded, flags),
    anchored: new RegExp(`^${source}$`, flags.replace('g', '')),
    probe: foldYo(words[0].toLowerCase()).slice(0, Math.max(2, Math.min(4, words[0].length - 1))),
    unofficial,
  }
}

export function buildForms(terms: GlossaryTerm[]): TermForm[] {
  const forms: TermForm[] = []
  const seen = new Set<string>()
  terms.forEach((term, index) => {
    for (const lang of ['kk', 'ru', 'en'] as const) {
      const cell = term[lang]
      if (!cell) continue
      const all = variants(cell)
      if (lang === 'ru') all.push(...all.map(naturalOrder).filter((v): v is string => v !== null))
      for (const text of all) {
        // English entries are Latin only (a Cyrillic word there is a typo).
        if (lang === 'en' && (/\p{Script=Cyrillic}/u.test(text) || !/\p{Script=Latin}/u.test(text))) continue
        // A Kazakh-only spelling in the ru column (or vice versa) still works,
        // but the stemming rules follow the actual letters.
        const formLang: Lang = lang === 'en' ? 'en' : KK_LETTERS.test(text) ? 'kk' : lang
        const key = `${formLang}:${foldYo(text.toLowerCase())}`
        if (seen.has(key)) continue
        seen.add(key)
        const form = buildForm(term, index, formLang, text)
        if (form) forms.push(form)
      }
    }
    for (const v of term.variants ?? []) {
      const key = `u:${v.lang}:${foldYo(v.text.toLowerCase())}`
      if (seen.has(key)) continue
      seen.add(key)
      const form = buildForm(term, index, v.lang, v.text.trim(), true)
      if (form) forms.push(form)
    }
  })
  return forms
}

let cachedForms: { source: GlossaryTerm[]; forms: TermForm[] } | null = null

export function formsFor(terms: GlossaryTerm[]): TermForm[] {
  if (!cachedForms || cachedForms.source !== terms) cachedForms = { source: terms, forms: buildForms(terms) }
  return cachedForms.forms
}

/** Words and actual separators of a regex match (groups alternate word/sep). */
function splitMatch(groups: string[]): { words: string[]; seps: string[] } {
  const words: string[] = []
  const seps: string[] = []
  groups.forEach((g, i) => (i % 2 === 0 ? words : seps).push(g ?? ''))
  return { words, seps }
}

function classify(form: TermForm, groups: string[]): { status: 'ok' | 'fix'; replacement?: string } {
  const { words, seps } = splitMatch(groups)
  let mismatch = false
  let replacement = words[0]
  seps.forEach((sep, i) => {
    const official = form.seps[i]
    if (sepKind(sep) !== official) mismatch = true
    replacement += (official === 'hyphen' ? '-' : ' ') + words[i + 1]
  })
  return mismatch ? { status: 'fix', replacement } : { status: 'ok' }
}

const SENTENCE_LIMIT = 300

/**
 * Is the sentence containing [start, end) Kazakh (has Kazakh-specific
 * letters)? Sentence-level, so bilingual documents with Russian and Kazakh
 * paragraphs side by side are judged per sentence.
 */
function sentenceAt(lower: string, start: number, end: number): string {
  let from = start
  while (from > 0 && start - from < SENTENCE_LIMIT && !/[.!?\n]/.test(lower[from - 1])) from--
  let to = end
  while (to < lower.length && to - end < SENTENCE_LIMIT && !/[.!?\n]/.test(lower[to])) to++
  return lower.slice(from, to)
}

// Common Russian function words, absent from Kazakh text.
const RU_FUNCTION_WORDS = /(?<!\p{L})(?:и|в|во|на|с|со|по|не|что|для|при|от|из|к|за|или|как)(?!\p{L})/u

/**
 * Is this sentence Kazakh? Two Kazakh-only letters are enough; a single one
 * («Нысанда огнетушитель жоқ») counts when no Russian function word is
 * around — so «Әлихан прибыл на объект» stays Russian.
 */
function isKazakhSentence(sentence: string): boolean {
  const kkLetters = sentence.match(/[әғқңөұүһі]/gi)?.length ?? 0
  return kkLetters >= 2 || (kkLetters === 1 && !RU_FUNCTION_WORDS.test(sentence.toLowerCase()))
}

function isKazakhAround(lower: string, start: number, end: number): boolean {
  return isKazakhSentence(sentenceAt(lower, start, end))
}

/**
 * Language of a sentence: Kazakh if it has Kazakh-only letters, English if
 * it has (next to) no Cyrillic, otherwise Russian. Pass the sentence without
 * the term being judged, so English terms quoted in Russian text don't make
 * it look English.
 */
export function sentenceLanguage(sentence: string): Lang {
  if (isKazakhSentence(sentence)) return 'kk'
  const cyrillic = sentence.match(/\p{Script=Cyrillic}/gu)?.length ?? 0
  const latin = sentence.match(/\p{Script=Latin}/gu)?.length ?? 0
  return cyrillic < 5 && latin > 0 ? 'en' : 'ru'
}

/** Is a base term in `formLang` foreign to a sentence in `lang`? */
function isForeign(form: TermForm, lang: Lang): boolean {
  if (form.lang === lang) return false
  if (form.lang === 'en' || lang === 'en') return true
  // A Russian term in a Kazakh sentence is fine when the Kazakh entry is the
  // same word («эвакуация»), foreign when it differs («огнетушитель»).
  if (form.lang === 'ru' && lang === 'kk') {
    const kk = primaryText(form.term, 'kk').toLowerCase()
    return Boolean(form.term.kk) && foldYo(kk) !== foldYo(form.text.toLowerCase())
  }
  return false
}

/**
 * Every non-overlapping glossary term occurrence in `text`. Longer matches
 * win («чрезвычайная ситуация природного характера» over «чрезвычайная
 * ситуация»), so each fragment is counted once.
 */
export function findTerms(text: string, forms: TermForm[]): TermMatch[] {
  const folded = foldYo(text)
  const lower = folded.toLowerCase()
  const candidates: TermMatch[] = []
  for (const form of forms) {
    if (!lower.includes(form.probe)) continue
    form.regex.lastIndex = 0
    for (const m of folded.matchAll(form.regex)) {
      const start = m.index!
      const end = start + m[0].length
      // Kazakh forms count only in Kazakh text: kk «от» (огонь) must not
      // match the Russian preposition «от».
      if (form.lang === 'kk' && !isKazakhAround(lower, start, end)) continue
      // …and inside Kazakh text a Russian form counts only verbatim: the
      // stem of ru «пена» must not match the Kazakh conjunction «пен».
      if (form.lang === 'ru' && lower.slice(start, end) !== foldYo(form.text.toLowerCase()) && isKazakhAround(lower, start, end)) {
        continue
      }
      // Kazakh letters anywhere (the term's own included) make it Kazakh;
      // English vs Russian is judged without the term itself.
      const sentence = sentenceAt(lower, start, end)
      const sentenceLang = isKazakhAround(lower, start, end) ? 'kk' : sentenceLanguage(sentence.replace(lower.slice(start, end), ' '))
      if (form.unofficial) {
        candidates.push({ start, end, text: text.slice(start, end), form, status: 'variant', sentenceLang })
        continue
      }
      if (isForeign(form, sentenceLang)) {
        candidates.push({ start, end, text: text.slice(start, end), form, status: 'foreign', sentenceLang })
        continue
      }
      const { status, replacement } = classify(form, m.slice(1))
      candidates.push({ start, end, text: text.slice(start, end), form, status, replacement, sentenceLang })
    }
  }
  candidates.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start)
  const taken: TermMatch[] = []
  for (const c of candidates) {
    if (taken.some((t) => c.start < t.end && t.start < c.end)) continue
    taken.push(c)
  }
  return taken.sort((a, b) => a.start - b.start)
}

/**
 * Is `text` exactly one glossary term in its official spelling (endings may
 * differ)? Returns the form, or null. If `term` is given, only that term's
 * forms count.
 */
export function officialFormOf(text: string, forms: TermForm[], term?: GlossaryTerm): TermForm | null {
  const folded = foldYo(text.trim())
  for (const form of forms) {
    if (form.unofficial || (term && form.term.id !== term.id)) continue
    const m = form.anchored.exec(folded)
    if (m && classify(form, m.slice(1)).status === 'ok') return form
  }
  return null
}
