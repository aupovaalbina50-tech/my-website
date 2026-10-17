// Quality control of documents: category and priority of every remark, and
// the marks of remarks in the text (src/pages/workspace/expertise/model.js).
// Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { byPriority, classify, counts, marksOf } from '../src/pages/workspace/expertise/model.js'

const item = (extra) => ({ id: Math.random().toString(36).slice(2), status: 'open', target: 'body', start: null, end: null, fragment: null, suggestion: null, ...extra })

test('critical only when a rule of the platform confirms it', () => {
  assert.deepEqual(classify(item({ group: 'structure', severity: 'error', confirmation: 'rule', basis: { kind: 'rule', rule: 'missing' } })), { category: 'critical', priority: 'high' })
  assert.deepEqual(classify(item({ group: 'consistency', severity: 'error', confirmation: 'rule', basis: { kind: 'rule', rule: 'numbers' } })), { category: 'critical', priority: 'high' })
  // the AI calling something critical does not make it critical — but it is not hidden either
  const ai = classify(item({ group: 'consistency', severity: 'error', confirmation: 'ai', aiCategory: 'critical' }))
  assert.equal(ai.category, 'factual')
  assert.equal(ai.priority, 'high')
})

test('normative: outdated act / wrong number high, unconfirmed reference medium', () => {
  assert.deepEqual(classify(item({ group: 'references', severity: 'error', confirmation: 'rule' })), { category: 'normative', priority: 'high' })
  assert.deepEqual(classify(item({ group: 'references', severity: 'remark', confirmation: 'unconfirmed' })), { category: 'normative', priority: 'medium' })
})

test('terminology: confirmed by the term base is high, without the base it is a question', () => {
  assert.deepEqual(classify(item({ category: 'terminology', group: 'terminology', severity: 'error', confirmation: 'base' })), { category: 'terminology', priority: 'high' })
  assert.deepEqual(classify(item({ category: 'terminology', group: 'terminology', severity: 'remark', confirmation: 'source' })), { category: 'terminology', priority: 'medium' })
  assert.deepEqual(classify(item({ category: 'terminology', group: 'terminology', severity: 'remark', confirmation: 'unconfirmed' })), { category: 'clarify', priority: 'medium' })
})

test('a style recommendation is never high; without a fragment it is information', () => {
  assert.deepEqual(classify(item({ group: 'style', severity: 'error', confirmation: 'ai', fragment: 'Довожу до Вашего сведения' })), { category: 'style', priority: 'low' })
  assert.deepEqual(classify(item({ group: 'style', severity: 'recommendation', confirmation: 'ai' })), { category: 'style', priority: 'info' })
})

test('language and structure from the AI', () => {
  assert.deepEqual(classify(item({ category: 'language', group: 'grammar', severity: 'remark', confirmation: 'ai' })), { category: 'language', priority: 'medium' })
  assert.deepEqual(classify(item({ category: 'language', group: 'grammar', severity: 'recommendation', confirmation: 'ai' })), { category: 'language', priority: 'low' })
  assert.deepEqual(classify(item({ group: 'doctype', severity: 'remark', confirmation: 'ai' })), { category: 'structure', priority: 'medium' })
  assert.deepEqual(classify(item({ group: 'logic', severity: 'error', confirmation: 'ai' })), { category: 'structure', priority: 'medium' })
})

test('older checks without group still get a category', () => {
  assert.equal(classify(item({ category: 'language', severity: 'remark', confirmation: 'ai' })).category, 'language')
  assert.equal(classify(item({ category: 'structure', severity: 'error', confirmation: 'rule', basis: { rule: 'missing' } })).category, 'critical')
})

test('sorted by priority; counts by category and priority', () => {
  const list = [
    item({ group: 'style', severity: 'recommendation', confirmation: 'ai' }),
    item({ group: 'structure', severity: 'error', confirmation: 'rule', basis: { rule: 'missing' } }),
    item({ category: 'language', group: 'grammar', severity: 'remark', confirmation: 'ai' }),
  ]
  assert.deepEqual([...list].sort(byPriority).map((i) => classify(i).priority), ['high', 'medium', 'info'])
  const c = counts({ items: list, snapshots: {} }, {})
  assert.equal(c.categories.critical, 1)
  assert.equal(c.priorities.info, 1)
})

test('marks: only open remarks whose fragment is still exactly in the text', () => {
  const values = { body: 'Прибыла пожарная машина в 10:15.' }
  const check = {
    snapshots: { body: values.body },
    items: [
      item({ id: 'a', category: 'terminology', group: 'terminology', severity: 'error', confirmation: 'base', start: 8, end: 23, fragment: 'пожарная машина' }),
      item({ id: 'b', status: 'rejected', start: 0, end: 7, fragment: 'Прибыла' }),
      item({ id: 'c', target: '', start: null }),
    ],
  }
  const m = marksOf(check, values)
  assert.deepEqual(m.get('body').map((x) => [x.id, x.priority, x.fragment]), [['a', 'high', 'пожарная машина']])
  // the text changed after the check: the remark may be outdated — no mark
  assert.equal(marksOf(check, { body: 'Прибыл пожарный автомобиль в 10:15.' }).size, 0)
})
