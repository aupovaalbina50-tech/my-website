// Roman numerals (Latin I/V/X or Kazakh Cyrillic І), e.g. «I и II группы».
const ROMAN_NUMERAL = /^[IVXІ]+$/

export function toSentenceCase(text) {
  if (!text) return text
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  const lower = trimmed
    .split(/(\s+)/)
    .map((word) => (ROMAN_NUMERAL.test(word) ? word : word.toLowerCase()))
    .join('')
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
