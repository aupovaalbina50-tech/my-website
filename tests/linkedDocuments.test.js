// «Связанные документы и контроль согласованности сведений»: the comparison
// and the transfer (src/pages/workspace/links/consistency.js).
// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { templateById } from '../src/pages/account/documents/catalog/index.js'
import {
  applyTransfer,
  compareDocuments,
  discrepancyId,
  factsInText,
  isOutdated,
  normalize,
  orderedPair,
  provenanceState,
  transferable,
} from '../src/pages/workspace/links/consistency.js'

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'
const fire = (values, id = A) => ({ id, template: templateById('fire_report'), values, lang: 'ru', title: 'Рапорт о пожаре' })
const cert = (values, id = B) => ({ id, template: templateById('incident_certificate'), values, lang: 'ru', title: 'Справка о происшествии' })
const note = (values, id = B) => ({ id, template: templateById('memo_report'), values, lang: 'ru', title: 'Докладная записка' })

const base = { incidentDate: '2026-10-01', incidentTime: '10:15', location: 'г. Алматы, ул. Абая, 12', evacuated: '14', injured: '0' }

test('the same facts written differently are not a discrepancy', () => {
  const r = compareDocuments(
    fire(base),
    cert({ incidentDate: '01.10.2026', incidentTime: '10.15', location: 'Г. Алматы, улица Абая 12', evacuated: '14 чел.', injured: '0' }),
  )
  assert.equal(r.discrepancies.length, 0, JSON.stringify(r.discrepancies))
  assert.ok(r.matches.length >= 5)
})

test('identical documents: no discrepancy, nothing invented', () => {
  const r = compareDocuments(fire(base), fire(base, B))
  assert.deepEqual(r.discrepancies, [])
})

test('the own date and number of each document are never compared', () => {
  const r = compareDocuments(fire({ ...base, date: '2026-10-01', number: '15' }), cert({ ...base, date: '2026-10-03', number: '77' }))
  assert.deepEqual(r.discrepancies, [])
})

test('different date, time, place and count: each discrepancy with both values', () => {
  const r = compareDocuments(fire(base), cert({ incidentDate: '2026-10-02', incidentTime: '10:45', location: 'ул. Абая, 21', evacuated: '12', injured: '0' }))
  const slots = r.discrepancies.map((d) => d.slot).sort()
  assert.deepEqual(slots, ['evacuated', 'incidentDate', 'incidentTime', 'location'])
  const ev = r.discrepancies.find((d) => d.slot === 'evacuated')
  assert.equal(ev.kind, 'number')
  assert.equal(ev.a.raw, '14')
  assert.equal(ev.b.raw, '12')
  assert.equal(ev.a.label, 'Эвакуированные')
  assert.ok(r.matches.some((m) => m.slot === 'injured'))
})

test('a fact stated in the text meets the field of the other document, with its fragment', () => {
  const r = compareDocuments(fire({ ...base, evacuated: '' }), note({ facts: 'Сообщаю, что в результате пожара эвакуировано 12 человек. Подразделение прибыло на место в 10:25.' }))
  const ev = r.discrepancies.find((d) => d.slot === 'evacuated')
  assert.equal(ev, undefined, 'the fire report has no evacuated value: nothing to compare')
  const r2 = compareDocuments(fire(base), note({ facts: 'Сообщаю, что в результате пожара эвакуировано 12 человек.' }))
  const d = r2.discrepancies.find((x) => x.slot === 'evacuated')
  assert.ok(d)
  assert.equal(d.b.origin, 'text')
  assert.equal(d.b.fragment, 'эвакуировано 12')
  assert.equal(d.b.label, 'Изложение фактов')
})

test('text without stated facts gives no facts (no bare numbers or times)', () => {
  assert.deepEqual(factsInText('Совещание началось в 10:00, рассмотрено 3 вопроса, приказ № 12.'), [])
})

test('the discrepancy id holds both values in the stored order', () => {
  assert.equal(discrepancyId('evacuated', A, '14', B, '12'), discrepancyId('evacuated', B, '12', A, '14'))
  assert.notEqual(discrepancyId('evacuated', A, '14', B, '12'), discrepancyId('evacuated', A, '14', B, '13'))
  assert.deepEqual(orderedPair(B, A), [A, B])
})

test('normalisation', () => {
  assert.equal(normalize('incidentDate', '01.10.2026'), '2026-10-01')
  assert.equal(normalize('incidentTime', '9.05'), '09:05')
  assert.equal(normalize('incidentTime', '25:00'), null)
  assert.equal(normalize('fireArea', '120,5 м²'), '120.5')
  assert.equal(normalize('location', '  '), null)
})

test('transfer: only shared fields filled in the source, nothing selected or applied by itself', () => {
  const source = fire(base)
  const target = cert({ incidentDate: '2026-10-01', location: '' })
  const items = transferable(source, target)
  const keys = items.map((i) => i.key).sort()
  assert.deepEqual(keys, ['evacuated', 'incidentDate', 'incidentTime', 'injured', 'location'])
  assert.equal(items.find((i) => i.key === 'incidentDate').same, true)
  assert.equal(items.find((i) => i.key === 'location').same, false)
  // transferable() never changes the target
  assert.equal(target.values.location, '')
})

test('transfer applies exactly the chosen values and records their origin', () => {
  const source = fire(base)
  const target = cert({ incidentDate: '2026-10-01', description: 'Текст пользователя' })
  const chosen = transferable(source, target).filter((i) => i.key === 'location' || i.key === 'evacuated')
  const next = applyTransfer(target.values, chosen, source, '2026-10-17T10:00:00Z')
  assert.equal(next.location, base.location)
  assert.equal(next.evacuated, '14')
  assert.equal(next.description, 'Текст пользователя')
  assert.equal(next.incidentTime, undefined, 'a value not chosen is not transferred')
  assert.deepEqual(next.__provenance.location, { documentId: A, title: 'Рапорт о пожаре', label: 'Место (адрес)', value: base.location, at: '2026-10-17T10:00:00Z' })
})

test('provenance: kept, edited after transfer, changed in the source', () => {
  const source = fire(base)
  const values = applyTransfer({}, transferable(source, cert({})).filter((i) => ['location', 'evacuated', 'injured'].includes(i.key)), source)
  values.evacuated = '15'
  const changedSource = { ...source, values: { ...base, injured: '2' } }
  const st = Object.fromEntries(provenanceState(values, new Map([[A, changedSource]])).map((p) => [p.key, p]))
  assert.equal(st.location.state, 'kept')
  assert.equal(st.evacuated.state, 'edited')
  assert.equal(st.injured.state, 'source_changed')
  assert.equal(st.injured.sourceValue, '2')
})

test('outdated: the other document changed after this side reviewed the link', () => {
  const link = { created_at: '2026-10-17T09:00:00Z', reviewed: { [A]: '2026-10-17T10:00:00Z' } }
  assert.equal(isOutdated(link, A, { updated_at: '2026-10-17T09:30:00Z' }), false)
  assert.equal(isOutdated(link, A, { updated_at: '2026-10-17T11:00:00Z' }), true)
  // never reviewed from B: the moment of linking counts
  assert.equal(isOutdated(link, B, { updated_at: '2026-10-17T08:00:00Z' }), false)
  assert.equal(isOutdated(link, B, { updated_at: '2026-10-17T09:10:00Z' }), true)
})
