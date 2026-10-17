// Autosave and recovery: what happens to a copy kept on this device, and when
// a refused save is a real conflict (src/pages/workspace/drafts/).
// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { contentKey, isOffline, isRealConflict, reconcile } from '../src/pages/workspace/drafts/reconcile.js'
import { readRecent, recordOpen } from '../src/pages/workspace/drafts/recent.js'

const server = { values: { subject: 'О выезде', body: 'Текст' }, title: 'Записка', lang: 'ru', status: 'filling', updated_at: '2026-10-17T10:00:00Z' }
const copyOf = (payload, base = server) => ({ payload, baseContent: contentKey(base), savedAt: '2026-10-17T10:05:00Z' })

test('no copy on this device: nothing to do', () => {
  assert.equal(reconcile(server, null), 'none')
})

test('the server already holds the copied text: the copy is dropped, nothing restored', () => {
  assert.equal(reconcile(server, copyOf({ values: server.values, title: 'Записка', lang: 'ru', status: 'draft' })), 'discard')
})

test('unsaved edits made on top of the current server text are restored', () => {
  assert.equal(reconcile(server, copyOf({ values: { ...server.values, body: 'Текст и дополнение' }, title: 'Записка', lang: 'ru' })), 'restore')
})

test('the server text changed since the copy (another device): conflict, never a silent overwrite', () => {
  const older = { ...server, values: { ...server.values, body: 'Старый текст' } }
  const copy = copyOf({ values: { ...older.values, body: 'Старый текст + мои правки' }, title: 'Записка', lang: 'ru' }, older)
  assert.equal(reconcile(server, copy), 'conflict')
})

test('status, check results and timestamps are not content', () => {
  assert.equal(contentKey({ ...server, status: 'checked', updated_at: 'x', issues: [1] }), contentKey(server))
  assert.notEqual(contentKey({ ...server, title: 'Другое' }), contentKey(server))
  assert.notEqual(contentKey({ ...server, lang: 'kk' }), contentKey(server))
})

test('a refused save is a conflict only if the content on the server changed', () => {
  const confirmed = contentKey(server)
  assert.equal(isRealConflict({ ...server, status: 'archive', current_version: 7 }, confirmed), false)
  assert.equal(isRealConflict({ ...server, values: { ...server.values, body: 'Изменено на другом устройстве' } }, confirmed), true)
})

test('no connection is told apart from a refusal of the server', () => {
  assert.equal(isOffline(new TypeError('Failed to fetch'), true), true)
  assert.equal(isOffline({ message: 'new row violates row-level security policy' }, true), false)
  assert.equal(isOffline({ message: 'anything' }, false), true)
})

test('recently opened: newest first, per user, no duplicates', () => {
  const store = new Map()
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) }
  recordOpen('u1', 'a', '2026-10-17T10:00:00Z')
  recordOpen('u1', 'b', '2026-10-17T10:01:00Z')
  recordOpen('u1', 'a', '2026-10-17T10:02:00Z')
  recordOpen('u2', 'c', '2026-10-17T10:03:00Z')
  assert.deepEqual(readRecent('u1').map((r) => r.id), ['a', 'b'])
  assert.deepEqual(readRecent('u2').map((r) => r.id), ['c'])
  delete globalThis.localStorage
})

test('a copy whose only change is the editor state (wizard step) holds no edit: discarded, never a conflict', () => {
  const older = { ...server, values: { ...server.values, body: 'Старый текст' } }
  const copy = copyOf({ values: { ...older.values, __flow: { stage: 'check' } }, title: 'Записка', lang: 'ru' }, older)
  assert.equal(reconcile(server, copy), 'discard')
  assert.equal(contentKey({ ...server, values: { ...server.values, __flow: { stage: 'export' } } }), contentKey(server))
})
