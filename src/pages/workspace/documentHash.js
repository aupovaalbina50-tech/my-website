// Pure (no network): used by the editor, the passport, the route and the tests.

/**
 * Fingerprint of a document's text: its field values without the
 * constructor's own bookkeeping (keys starting with «__»). Stored as
 * content_hash with every save and as checked_hash by an expertise.
 */
export function contentHash(values) {
  const keys = Object.keys(values ?? {})
    .filter((k) => !k.startsWith('__'))
    .sort()
  const text = keys.map((k) => `${k}\u0001${JSON.stringify(values[k])}`).join('\u0002')
  let h1 = 0x811c9dc5
  let h2 = 0
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = (Math.imul(31, h2) + c) | 0
  }
  return `${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}:${text.length}`
}
