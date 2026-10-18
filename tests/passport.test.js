// «Паспорт документа»: only stored facts, nothing invented
// (src/pages/workspace/passport/passportModel.js). Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { templateById } from '../src/pages/account/documents/catalog/index.js'
import { basicInfo, changedFields, checkRuns, compactItems, fieldOrigins, preparationStage, remarkDiff, requisiteChanges, sourcesOfCheck, timeline } from '../src/pages/workspace/passport/passportModel.js'

const note = templateById('service_note')
const fire = templateById('fire_report')
const doc = { id: 'd1', template_id: 'service_note', title: 'Записка', lang: 'ru', status: 'filling', current_version: 2, created_at: '2026-10-10T09:00:00Z', updated_at: '2026-10-17T12:00:00Z' }
const check = (items, extra = {}) => ({ v: 2, at: '2026-10-17T10:00:00Z', version: 2, parts: { structure: 'ok', terminology: 'ok', language: 'ok', references: 'ok', lookup: 'skipped' }, errors: {}, snapshots: { body: 'Текст' }, items, changes: [], termsFound: 3, glossarySize: 930, ...extra })

test('basic facts: stored values only; no number is ever generated', () => {
  const info = basicInfo({ doc, template: note, values: { subject: 'О выезде' } })
  assert.equal(info.number, null)
  assert.equal(info.hasNumberField, true)
  assert.equal(info.author, null)
  assert.equal(info.organization, null)
  assert.equal(info.createdAt, doc.created_at)
  assert.equal(info.updatedAt, doc.updated_at)
  const withNumber = basicInfo({ doc, template: note, values: { number: '15-04/123', date: '2026-10-11' }, authorName: 'Аупова Альбина' })
  assert.equal(withNumber.number, '15-04/123')
  assert.equal(withNumber.documentDate, '2026-10-11')
  assert.equal(withNumber.author, 'Аупова Альбина')
})

test('the date of the event is told apart from the dates of the document', () => {
  const info = basicInfo({ doc: { ...doc, template_id: 'fire_report' }, template: fire, values: { date: '2026-10-02', incidentDate: '2026-10-01' } })
  assert.deepEqual(info.eventDate, { key: 'incidentDate', value: '2026-10-01' })
  assert.equal(info.documentDate, '2026-10-02')
})

test('stage from the real state; never «approved»', () => {
  const values = { body: 'Текст' }
  assert.equal(preparationStage({ status: 'filling', issues: [], values }).stage, 'draft')
  assert.equal(preparationStage({ status: 'review', issues: [], values }).stage, 'review')
  const high = { id: 'a', status: 'open', group: 'terminology', category: 'terminology', severity: 'error', confirmation: 'base', target: 'body' }
  assert.equal(preparationStage({ status: 'issues', issues: check([high]), values, contentHash: 'h', checkedHash: 'h' }).stage, 'issues')
  const question = { id: 'b', status: 'open', group: 'terminology', category: 'terminology', severity: 'remark', confirmation: 'unconfirmed', target: 'body' }
  assert.equal(preparationStage({ status: 'issues', issues: check([question]), values, contentHash: 'h', checkedHash: 'h' }).stage, 'clarify')
  assert.equal(preparationStage({ status: 'checked', issues: check([]), values, contentHash: 'h', checkedHash: 'h' }).stage, 'checked')
  assert.equal(preparationStage({ status: 'ready', issues: check([]), values }).stage, 'export_ready')
  const all = new Set(['draft', 'review', 'issues', 'clarify', 'checked', 'export_ready', 'archive'])
  assert.ok(all.has(preparationStage({ status: 'archive', issues: [], values }).stage))
})

test('text changed after the check: results marked as of an earlier text', () => {
  const st = preparationStage({ status: 'checked', issues: check([]), values: { body: 'Текст изменён' }, contentHash: 'h2', checkedHash: 'h1' })
  assert.equal(st.outdated, true)
  assert.equal(st.stage, 'draft')
})

test('check log: complete / partial / failed; old rows keep their gaps', () => {
  const runs = checkRuns({
    history: [
      { id: 'r1', created_at: '2026-10-15T10:00:00Z', issue_count: 2, snapshot: { kind: 'editor', documentId: 'd1', at: '2026-10-15T10:00:00Z', parts: { terminology: 'ok', language: 'ok' }, counts: { all: 2 } } },
      { id: 'r2', created_at: '2026-10-16T10:00:00Z', issue_count: 1, snapshot: { kind: 'editor', documentId: 'd1', at: '2026-10-16T10:00:00Z', parts: { terminology: 'partial' }, errors: { lookup: 'timeout' }, version: 3, hash: 'h3', counts: { categories: { language: 1 } }, sources: [] } },
    ],
    events: [{ id: 'e1', kind: 'check_failed', created_at: '2026-10-17T10:00:00Z', details: { errors: [{ part: 'language', code: 'network' }] } }],
    currentHash: 'h4',
  })
  assert.deepEqual(runs.map((r) => r.outcome), ['failed', 'partial', 'complete'])
  assert.equal(runs[1].version, 3)
  assert.equal(runs[1].outdated, true)
  assert.deepEqual(runs[1].errors, [{ part: 'lookup', code: 'timeout' }])
  assert.equal(runs[2].version, null, 'an old run has no version — not invented')
  assert.equal(runs[2].categories, null)
  assert.equal(runs[2].sources, null)
  assert.equal(runs[2].outdated, null)
})

test('sources: only those the check used', () => {
  assert.deepEqual(sourcesOfCheck(null, note), { normative: [], state: [], termBase: null, internal: [], other: [] })
  const noTerms = sourcesOfCheck(check([], { parts: { terminology: 'failed' } }), note)
  assert.equal(noTerms.termBase, null, 'the term base is not listed when that part did not run')
  const c = check(
    [
      { id: 't', status: 'open', category: 'terminology', group: 'terminology', severity: 'error', confirmation: 'base', fragment: 'пожарная машина', basis: { kind: 'base', term: { ru: 'пожарный автомобиль', kk: 'өрт сөндіру автомобилі' } } },
      { id: 'o', status: 'open', category: 'terminology', group: 'terminology', severity: 'remark', confirmation: 'source', fragment: 'противодымная завеса', basis: { kind: 'official', source: { title: 'Тестовый источник', url: 'https://adilet.zan.kz/rus/docs/X', retrievedAt: '2026-10-17T10:01:00Z' } } },
      { id: 'r', status: 'open', group: 'references', category: 'structure', severity: 'remark', confirmation: 'unconfirmed', fragment: 'приказом № 999', basis: { kind: 'unverified_reference' } },
      { id: 'm', status: 'open', category: 'structure', group: 'structure', severity: 'error', confirmation: 'rule', basis: { kind: 'rule', rule: 'missing' } },
    ],
    { references: [{ fragment: 'приказом № 999', parsed: { number: '999' }, source: null, actuality: 'unknown' }] },
  )
  const s = sourcesOfCheck(c, note)
  assert.equal(s.normative.length, 1)
  assert.equal(s.normative[0].inRegistry, false)
  assert.equal(s.normative[0].title, null, 'no invented act name')
  assert.equal(s.normative[0].url, null)
  assert.equal(s.normative[0].remarks[0].id, 'r')
  assert.equal(s.state.length, 1)
  assert.equal(s.state[0].url, 'https://adilet.zan.kz/rus/docs/X')
  assert.equal(s.termBase.terms.length, 1)
  assert.equal(s.internal.length, 1)
  assert.equal(s.other.length, 0)
})

test('origin of data: recorded or «не сохранён», AI marked unconfirmed', () => {
  const values = {
    subject: 'О выезде',
    body: 'Текст ИИ',
    to: 'Начальнику',
    from: 'От Иванова',
    __flow: { gen: { body: { text: 'Текст ИИ' } }, fromText: { to: 'начальнику' } },
    __origin: { from: { by: 'profile', at: '2026-10-17T10:00:00Z' } },
  }
  const o = Object.fromEntries(fieldOrigins({ template: note, values, issues: [] }).map((x) => [x.key, x]))
  assert.equal(o.subject.kind, 'unknown')
  assert.equal(o.body.kind, 'ai_generated')
  assert.equal(o.body.unconfirmed, true)
  assert.equal(o.to.kind, 'ai_description_unconfirmed')
  assert.equal(o.from.kind, 'profile')
})

test('changes: text vs requisites; remarks appeared / resolved / remained', () => {
  const ch = changedFields(note, { subject: 'A', body: 'x', to: 'Кому 1' }, { subject: 'A', body: 'y', to: 'Кому 2' })
  assert.deepEqual(ch, { text: ['body'], requisites: ['to'] })
  assert.deepEqual(requisiteChanges(note, { to: 'Кому 1', body: 'x' }, { to: 'Кому 2', body: 'y' }).map((r) => [r.key, r.was, r.now]), [['to', 'Кому 1', 'Кому 2']])
  const a = compactItems(check([{ id: '1', target: 'body', fragment: 'машина', title: 'Термин', status: 'open', group: 'terminology', category: 'terminology', confirmation: 'base', severity: 'error' }, { id: '2', target: 'body', fragment: 'прибыли', title: 'Согласование', status: 'open', group: 'grammar', category: 'language', confirmation: 'ai', severity: 'remark' }]))
  const b = compactItems(check([{ id: '3', target: 'body', fragment: 'прибыли', title: 'Согласование', status: 'open', group: 'grammar', category: 'language', confirmation: 'ai', severity: 'remark' }, { id: '4', target: 'subject', fragment: 'О', title: 'Стиль', status: 'open', group: 'style', confirmation: 'ai', severity: 'recommendation' }]))
  const d = remarkDiff(a, b)
  assert.deepEqual([d.appeared.length, d.resolved.length, d.remained.length], [1, 1, 1])
  assert.equal(d.resolved[0].fragment, 'машина')
})

test('timeline: one feed; an old document without a log shows the creation from the row', () => {
  const t = timeline({ doc, versions: [{ version: 1, kind: 'original', created_at: '2026-10-11T09:00:00Z' }], runs: [], events: [] })
  assert.deepEqual(t.feed.map((e) => e.kind), ['version', 'created'])
  assert.equal(t.feed[1].source, 'document')
  assert.equal(t.logSince, null)
  const t2 = timeline({ doc, versions: [], runs: [], events: [{ kind: 'created', created_at: '2026-10-10T09:00:00Z', details: {} }, { kind: 'exported', created_at: '2026-10-12T09:00:00Z', details: { format: 'pdf' } }] })
  assert.deepEqual(t2.feed.map((e) => e.kind), ['exported', 'created'])
  assert.equal(t2.logSince, '2026-10-10T09:00:00Z')
})
