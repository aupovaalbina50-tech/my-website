// Copies of documents on this device while they are not confirmed by the
// server (IndexedDB of the site's origin: private to this browser profile,
// never sent anywhere). One copy per user and document; it is removed only
// after the server confirmed exactly the copied text. Without IndexedDB
// (some private modes) copies live in memory for the open page only.

import { contentKey } from './reconcile.js'

const DB = 'mchs-documents'
const STORE = 'drafts'
const memory = new Map()
let dbPromise = null

function open() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB, 1)
        req.onupgradeneeded = () => {
          const store = req.result.createObjectStore(STORE, { keyPath: 'key' })
          store.createIndex('userId', 'userId')
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
        req.onblocked = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }
  return dbPromise
}

function tx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const result = fn(t.objectStore(STORE))
    // A request (get / getAll) resolves to its result — undefined when nothing is stored.
    t.oncomplete = () => resolve(result instanceof IDBRequest ? result.result : result)
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

const keyOf = (userId, docId) => `${userId}:${docId}`

// The page is being left (closed tab, reload, another address): IndexedDB may
// not finish in time, so the last text is also put synchronously into this
// origin's localStorage and merged back by getDraft. Removed with the copy.
const EMERGENCY = (key) => `draft_emergency_v1:${key}`

function readEmergency(key) {
  try {
    const row = JSON.parse(localStorage.getItem(EMERGENCY(key)) ?? 'null')
    return row && row.key === key ? row : null
  } catch {
    return null
  }
}

function dropEmergency(key, content) {
  try {
    const row = readEmergency(key)
    if (row && (content == null || row.content === content)) localStorage.removeItem(EMERGENCY(key))
  } catch {
    // storage unavailable
  }
}

/** Synchronous copy for the moment the page is left. */
export function saveEmergency(userId, docId, { payload, baseContent, templateId }) {
  const key = keyOf(userId, docId)
  try {
    localStorage.setItem(EMERGENCY(key), JSON.stringify({ key, userId, docId, templateId, payload, baseContent, content: contentKey(payload), savedAt: new Date().toISOString() }))
  } catch {
    // storage full or unavailable: the IndexedDB copy is all there is
  }
}

/** Keeps the copy of a document: { payload, baseContent, templateId }. */
export async function putDraft(userId, docId, { payload, baseContent, templateId }) {
  const row = { key: keyOf(userId, docId), userId, docId, templateId, payload, baseContent, content: contentKey(payload), savedAt: new Date().toISOString() }
  const db = await open()
  if (!db) return void memory.set(row.key, row)
  await tx(db, 'readwrite', (s) => s.put(row))
}

/** The newest copy of a document on this device (IndexedDB or the emergency copy), or null. */
export async function getDraft(userId, docId) {
  const key = keyOf(userId, docId)
  const db = await open()
  const stored = db ? ((await tx(db, 'readonly', (s) => s.get(key))) ?? null) : (memory.get(key) ?? null)
  const emergency = readEmergency(key)
  if (!emergency) return stored
  if (!stored) return emergency
  return new Date(emergency.savedAt) > new Date(stored.savedAt) ? emergency : stored
}

/** Removes the copy only if it still holds `content` (a newer copy written meanwhile stays). */
export async function deleteDraftIf(userId, docId, content) {
  const key = keyOf(userId, docId)
  dropEmergency(key, content)
  const db = await open()
  if (!db) {
    if (content == null || memory.get(key)?.content === content) memory.delete(key)
    return
  }
  await tx(db, 'readwrite', (s) => {
    const req = s.get(key)
    req.onsuccess = () => {
      if (req.result && (content == null || req.result.content === content)) s.delete(key)
    }
  })
}

/** Every copy of the user on this device: [{ docId, savedAt, … }]. */
export async function listDrafts(userId) {
  const db = await open()
  if (!db) return [...memory.values()].filter((r) => r.userId === userId)
  return (await tx(db, 'readonly', (s) => s.index('userId').getAll(userId))) ?? []
}
