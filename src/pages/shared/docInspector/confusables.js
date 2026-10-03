// «Не путать» pairs (src/data/confusableTerms.js) for the inspector.
//
// Each pair holds two terms with their official definitions from RK legal
// acts. The inspector (1) sends the pairs that occur in a chunk to the AI,
// so it can judge which of the two the context really needs, and (2) shows
// a «⚠️ Не путать» block on any finding that involves one of the pairs.
// Pairs are never invented: only those on the site's «Не путать» page.

import { CONFUSABLE_TERMS } from '../../../data/confusableTerms.js'

/** «Төтенше жағдай («Азаматтық қорғау туралы» Заң)» -> «Төтенше жағдай». */
export function plainName(name) {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[«»]/g, '').replace(/\s+/g, ' ').trim()
}

function escapeRe(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Russian case endings (as in the Edge Function's matcher): «пожар» matches
// «пожара», «пожаром», but not «пожарник».
const RU_ENDINGS = [
  'иями', 'ями', 'ами', 'иях', 'ией', 'ием', 'иям', 'ого', 'его', 'ому', 'ему', 'ыми', 'ими',
  'ия', 'ии', 'ию', 'ой', 'ей', 'ом', 'ем', 'ам', 'ям', 'ах', 'ях', 'ов', 'ев', 'ий', 'ый',
  'ая', 'яя', 'ое', 'ее', 'ые', 'ие', 'ую', 'юю', 'ым', 'им', 'ых', 'их', 'ью',
  'а', 'я', 'ы', 'и', 'у', 'ю', 'е', 'о', 'ь', 'й',
]
const RU_ENDING_RE = `(?:${RU_ENDINGS.join('|')})?`
const KK_LETTERS = /[әғқңөұүһі]/i

function wordPattern(word, kazakh) {
  if (!/^\p{L}+$/u.test(word) || word.length < 3) return escapeRe(word)
  // Kazakh is agglutinative: the stem stays, suffixes pile up.
  if (kazakh) return `${escapeRe(word)}\\p{L}{0,12}`
  const ending = RU_ENDINGS.find((e) => word.endsWith(e) && word.length - e.length >= 3)
  return `${escapeRe(ending ? word.slice(0, -ending.length) : word)}${RU_ENDING_RE}`
}

/** Matches a term name with grammatical endings («эвакуация» ~ «эвакуации»). */
function nameRegex(name) {
  const plain = plainName(name).toLowerCase().replace(/ё/g, 'е')
  const words = plain.split(/[\s-]+/).filter(Boolean)
  if (words.length === 0) return null
  const kazakh = KK_LETTERS.test(plain)
  const parts = words.map((w) => wordPattern(w, kazakh))
  return new RegExp(`(?<![\\p{L}])${parts.join('[\\s-]+')}(?![\\p{L}])`, 'iu')
}

const PAIRS = CONFUSABLE_TERMS.map((pair) => {
  const side = (term) => ({
    name: { ru: plainName(term.name.ru), kk: plainName(term.name.kk) },
    definition: term.definition,
    regexes: [nameRegex(term.name.ru), nameRegex(term.name.kk)].filter(Boolean),
  })
  return { ...pair, a: side(pair.termA), b: side(pair.termB) }
})

const mentions = (side, text) => side.regexes.some((re) => re.test(text.replace(/ё/g, 'е')))

/** Pairs at least one of whose terms occurs in `text`. */
export function pairsInText(text) {
  return PAIRS.filter((p) => mentions(p.a, text) || mentions(p.b, text))
}

/**
 * Compact form of the pairs for the analyze request: the AI refers to the
 * terms as «N<i>.A» / «N<i>.B», with i = the pair's position in this list.
 */
export function pairsPayload(pairs) {
  return pairs.map((p) => ({
    id: p.id,
    a: { ru: p.a.name.ru, kk: p.a.name.kk, definition: p.a.definition.ru },
    b: { ru: p.b.name.ru, kk: p.b.name.kk, definition: p.b.definition.ru },
    difference: p.difference.ru,
  }))
}

/**
 * The «Не путать» pair a finding involves: its suggestion comes from a pair,
 * or the document phrase / base term is one of a pair's terms.
 */
export function pairForResult(result) {
  for (const c of result.candidates ?? []) {
    const m = /^confusable:(.+):[AB]$/.exec(c.term?.id ?? '')
    if (m) {
      const pair = PAIRS.find((p) => p.id === m[1])
      if (pair) return pair
    }
  }
  const texts = [result.text, result.official, result.term?.ru, result.term?.kk].filter(Boolean)
  return PAIRS.find((p) => texts.some((t) => [p.a, p.b].some((side) => side.regexes.some((re) => re.test(t) && re.exec(t)[0].length >= t.length * 0.6))))
}

/** Is this candidate a term from a «Не путать» pair (not from the base)? */
export function isPairTerm(term) {
  return typeof term?.id === 'string' && term.id.startsWith('confusable:')
}

export function adiletUrl(docId, lang) {
  return `https://adilet.zan.kz/${lang === 'kk' ? 'kaz' : 'rus'}/docs/${docId}`
}
