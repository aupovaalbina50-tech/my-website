export function toSentenceCase(text) {
  if (!text) return text
  const trimmed = text.trim()
  if (!trimmed) return trimmed
  const lower = trimmed.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
