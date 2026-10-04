// Terms are stored starting with a small letter, with capitals only where
// grammar needs them (abbreviations like ВОЛС, Roman numerals, official
// names), so only the first letter is raised and the rest is kept as is.
export function toSentenceCase(text) {
  if (!text) return text
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}
