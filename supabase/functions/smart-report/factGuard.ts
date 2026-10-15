// Guard for generated document text: the model may re-word, never add facts.
// Pure TypeScript (no Deno APIs), so it is unit-tested with Node.
//
// A generated fragment is checked against everything the user gave (the
// field values and the free description):
//   numbers — every number in the output (dates, times, counts, document
//             numbers, article numbers) must occur in the sources; one that
//             does not is an invented fact and the fragment is rejected;
//   names   — capitalised words that do not start a sentence (surnames,
//             subdivision and organisation names, places) must occur in the
//             sources as a word stem; others are listed for the user to
//             check (inflection makes an exact rule impossible, so this one
//             warns instead of rejecting).

const NUMBER_RE = /\d+(?:[.,:]\d+)*/g

/** Numbers as written, with the separators of times and dates normalised. */
function numbersIn(text: string): string[] {
  return (text.match(NUMBER_RE) ?? []).map((n) => n.replace(',', '.'))
}

/**
 * A number of the output is known when the sources contain it as written.
 * A date may be re-written («01.10.2026» → «1 октября 2026»): its parts count
 * for single numbers. Parts of times do not — «15» must not pass because of «10:15».
 */
function knownNumber(n: string, sourceNumbers: Set<string>, dateParts: Set<string>): boolean {
  if (sourceNumbers.has(n)) return true
  const parts = n.split(/[.:]/).map((p) => String(Number(p)))
  if (parts.length === 1) return dateParts.has(parts[0])
  // A date written with other separators or leading zeros.
  return n.split(/[.:]/).length === 3 && parts.every((p) => dateParts.has(p))
}

const lower = (w: string) => w.toLowerCase().replace(/ё/g, 'е')

/** Same word in another case: a long common beginning (Сейтов / Сейтовым, Алматы / Алматинского is NOT enough). */
function sameStem(a: string, b: string): boolean {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i >= Math.max(4, Math.min(a.length, b.length) - 2)
}

/** Capitalised words not at the start of a sentence, a line or a quotation. */
function namesIn(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/\p{Lu}[\p{Ll}\p{Lu}-]{2,}/gu)) {
    const before = text.slice(0, m.index).replace(/[ \t]+$/, '')
    const prev = before.at(-1)
    if (prev === undefined || /[.!?…\n«"(:;]/.test(prev)) continue // capital by grammar
    out.push(m[0])
  }
  return out
}

export interface GuardResult {
  ok: boolean
  inventedNumbers: string[]
  unknownNames: string[]
}

export function guardFacts(output: string, sources: string[]): GuardResult {
  const source = sources.join('\n')
  const sourceNumbers = new Set(numbersIn(source))
  const dateParts = new Set([...sourceNumbers].filter((n) => n.split('.').length === 3).flatMap((n) => n.split('.').map((p) => String(Number(p)))))
  const inventedNumbers = [...new Set(numbersIn(output).filter((n) => !knownNumber(n, sourceNumbers, dateParts)))]

  const sourceWords = [...new Set((source.match(/\p{L}[\p{L}-]*/gu) ?? []).map(lower))]
  const unknownNames = [...new Set(namesIn(output).filter((w) => !sourceWords.some((s) => sameStem(lower(w), s))))]

  return { ok: inventedNumbers.length === 0, inventedNumbers, unknownNames }
}
