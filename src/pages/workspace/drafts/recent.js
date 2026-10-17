// «Недавно открытые документы»: ids of the documents the user opened in
// the editor on this device, newest first (titles, types and statuses come
// from the database when the list is shown). Ids only, per user.

const KEY = (userId) => `recent_documents_v1:${userId}`
const LIMIT = 8

export function recordOpen(userId, docId, at = new Date().toISOString()) {
  if (!userId || !docId) return
  try {
    const list = readRecent(userId).filter((r) => r.id !== docId)
    localStorage.setItem(KEY(userId), JSON.stringify([{ id: docId, at }, ...list].slice(0, LIMIT)))
  } catch {
    // storage unavailable: the list is just not kept
  }
}

export function readRecent(userId) {
  try {
    const list = JSON.parse(localStorage.getItem(KEY(userId)) ?? '[]')
    return Array.isArray(list) ? list.filter((r) => r && typeof r.id === 'string') : []
  } catch {
    return []
  }
}
