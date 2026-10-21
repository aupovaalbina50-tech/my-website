// «Маршрут подготовки документа»: every status from real data, no false
// readiness (src/pages/workspace/route/routeModel.js). Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { templateById } from '../src/pages/account/documents/catalog/index.js'
import { contentHash } from '../src/pages/workspace/documentHash.js'
import { changedSinceCheck, exportSummary, mergeCheck, routeOf, withRoute } from '../src/pages/workspace/route/routeModel.js'

const raport = templateById('memo_report')
const st = (route, key) => route.stages.find((s) => s.key === key)
const filled = { to: 'Начальнику ДЧС', from: 'Начальника караула', subject: 'О выезде', facts: 'Прибыл пожарный автомобиль.', date: '2026-10-01', signPosition: 'Начальник караула', signRank: 'капитан', signName: 'А. Иванов' }
const okCheck = (values, extra = {}) => ({
  v: 2,
  at: '2026-10-17T10:00:00Z',
  version: 3,
  docLang: 'ru',
  parts: { structure: 'ok', terminology: 'ok', language: 'ok', references: 'ok', lookup: 'skipped' },
  errors: {},
  snapshots: Object.fromEntries(['to', 'from', 'subject', 'facts'].filter((k) => values[k]).map((k) => [k, values[k]])),
  items: [],
  changes: [],
  references: [],
  ...extra,
})

test('a new document: nothing claimed done that was not done', () => {
  const r = routeOf({ template: raport, values: {}, issues: [] })
  assert.equal(st(r, 'draft').status, 'not_started')
  assert.equal(st(r, 'structure').status, 'issues', 'required fields of the template are empty')
  assert.equal(st(r, 'terminology').status, 'not_started')
  assert.equal(st(r, 'final').status, 'not_started')
  assert.equal(r.complete, false)
  assert.equal(r.next.key, 'define')
})

test('all checks done for exactly this text: «Проверки завершены», limits still listed', () => {
  const values = withRoute(filled, { final: { at: '2026-10-17T10:00:00Z', version: 3, hash: contentHash(filled), failedParts: [] } })
  const r = routeOf({ template: raport, values, issues: okCheck(filled), contentHash: contentHash(values) })
  for (const k of ['define', 'draft', 'structure', 'terminology', 'language', 'remarks', 'final']) assert.equal(st(r, k).status, 'done', k)
  assert.equal(st(r, 'facts').needed, false, 'no acts, no contradictions: grounds not required')
  assert.equal(r.complete, true)
  assert.ok(r.limits.some((l) => l.reason === 'no_articles'))
})

test('a failed part never counts as done', () => {
  const values = withRoute(filled, { final: { at: 'x', version: 3, hash: contentHash(filled), failedParts: ['language'] } })
  const check = okCheck(filled, { parts: { structure: 'ok', terminology: 'ok', language: 'failed', references: 'ok', lookup: 'skipped' }, errors: { language: 'timeout' } })
  const r = routeOf({ template: raport, values, issues: check, contentHash: contentHash(values) })
  assert.equal(st(r, 'language').status, 'recheck')
  assert.equal(st(r, 'final').status, 'recheck')
  assert.equal(r.complete, false)
})

test('a missing module is «Недоступен», not done', () => {
  const check = okCheck(filled, { parts: { structure: 'ok', terminology: 'failed', language: 'ok', references: 'ok' }, errors: { terminology: 'service_unavailable' } })
  const r = routeOf({ template: raport, values: filled, issues: check })
  assert.equal(st(r, 'terminology').status, 'unavailable')
  assert.equal(r.complete, false)
  assert.ok(r.limits.some((l) => l.stage === 'terminology'))
})

test('the text changed after the checks: results «Требует повторной проверки», which fields', () => {
  const values = withRoute(filled, { final: { at: 'x', version: 3, hash: contentHash(filled), failedParts: [] } })
  const edited = { ...values, facts: 'Прибыл пожарный автомобиль. Пожар ликвидирован.' }
  const r = routeOf({ template: raport, values: edited, issues: okCheck(filled), contentHash: contentHash(edited) })
  for (const k of ['terminology', 'language', 'remarks', 'final']) assert.equal(st(r, k).status, 'recheck', k)
  assert.deepEqual([...changedSinceCheck(okCheck(filled), edited, raport)], ['facts'])
  assert.equal(r.complete, false)
})

test('remarks: important ones open → issues; questions → clarify; style only → done', () => {
  const term = { id: 't', status: 'open', target: 'facts', group: 'terminology', category: 'terminology', severity: 'error', confirmation: 'base' }
  const q = { id: 'q', status: 'clarify', target: 'facts', group: 'terminology', category: 'terminology', severity: 'remark', confirmation: 'unconfirmed' }
  const style = { id: 's', status: 'open', target: 'facts', group: 'style', severity: 'recommendation', confirmation: 'ai' }
  assert.equal(st(routeOf({ template: raport, values: filled, issues: okCheck(filled, { items: [term] }) }), 'terminology').status, 'issues')
  assert.equal(st(routeOf({ template: raport, values: filled, issues: okCheck(filled, { items: [q] }) }), 'remarks').status, 'clarify')
  const r = routeOf({ template: raport, values: filled, issues: okCheck(filled, { items: [style] }) })
  assert.equal(st(r, 'language').status, 'done', 'a style recommendation does not block')
  assert.equal(st(r, 'language').recommendations, 1)
})

test('export summary: not ready without the final check; never blocked by style', () => {
  const r = routeOf({ template: raport, values: filled, issues: okCheck(filled) })
  const sum = exportSummary(r, okCheck(filled), filled)
  assert.equal(sum.ready, false)
  assert.ok(sum.notStarted.includes('final'))
  const values = withRoute(filled, { final: { at: 'x', version: 3, hash: contentHash(filled), failedParts: [] } })
  const style = { id: 's', status: 'open', target: 'facts', group: 'style', severity: 'recommendation', confirmation: 'ai' }
  const r2 = routeOf({ template: raport, values, issues: okCheck(filled, { items: [style] }), contentHash: contentHash(values) })
  const sum2 = exportSummary(r2, okCheck(filled, { items: [style] }), values)
  assert.equal(sum2.ready, true)
  assert.equal(sum2.remaining.info + sum2.remaining.low, 1)
})

test('re-check of changed fields keeps the remarks of the others', () => {
  const a = { id: 'a', status: 'open', target: 'subject', fragment: 'О', group: 'style', confirmation: 'ai' }
  const b = { id: 'b', status: 'open', target: 'facts', fragment: 'старое', group: 'grammar', confirmation: 'ai' }
  const rule = { id: 'm', status: 'open', target: 'to', basis: { kind: 'rule', rule: 'missing' } }
  const prev = okCheck(filled, { items: [a, b, rule] })
  const partial = okCheck(filled, { at: '2026-10-17T11:00:00Z', items: [{ id: 'c', status: 'open', target: 'facts', fragment: 'новое', group: 'grammar', confirmation: 'ai' }], snapshots: { facts: 'новый текст' } })
  const merged = mergeCheck(prev, partial, new Set(['facts']))
  assert.deepEqual(merged.items.map((i) => i.id).sort(), ['a', 'c'])
  assert.equal(merged.snapshots.facts, 'новый текст')
  assert.equal(merged.snapshots.subject, filled.subject)
  assert.deepEqual(merged.partialOf, ['facts'])
})

test('an uploaded file: recognition problems are shown, not hidden', () => {
  const free = templateById('free_text')
  const values = { body: 'Текст', __source: { origin: 'upload', fileName: 'akt.pdf', ocrPages: 3, unreadablePages: 1, illegiblePages: 0 } }
  const d = st(routeOf({ template: free, values, issues: [] }), 'draft')
  assert.equal(d.status, 'clarify')
  assert.equal(d.upload.unreadable, 1)
})
