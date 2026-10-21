// Per-day series of the dashboard activity chart. Run: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bucketEvents, dayKey, emptyDays, firstPer, niceScale } from '../src/utils/activitySeries.js'

const today = new Date(2026, 9, 21, 15, 0)

test('the window is the last N local days, oldest first, ending today', () => {
  const days = emptyDays(7, today)
  assert.equal(days.length, 7)
  assert.equal(days[0].key, '2026-10-15')
  assert.equal(days[6].key, '2026-10-21')
  assert.equal(emptyDays(30, today)[0].key, '2026-09-22')
})

test('events fall on their local day: terms to «study», tests and missions to «practice»', () => {
  const days = bucketEvents(
    [
      { kind: 'term_study', at: new Date(2026, 9, 21, 9) },
      { kind: 'term_study', at: new Date(2026, 9, 21, 23, 59) },
      { kind: 'test', at: new Date(2026, 9, 20, 0, 1) },
      { kind: 'mission_test', at: new Date(2026, 9, 20, 12) },
      { kind: 'mission_complete', at: new Date(2026, 9, 20, 12, 5) },
      { kind: 'term_study', at: new Date(2026, 8, 1) },
    ],
    emptyDays(7, today),
  )
  const byKey = Object.fromEntries(days.map((d) => [d.key, d]))
  assert.deepEqual([byKey['2026-10-21'].study, byKey['2026-10-21'].practice], [2, 0])
  assert.deepEqual([byKey['2026-10-20'].study, byKey['2026-10-20'].practice], [0, 3])
  assert.equal(days.reduce((s, d) => s + d.study + d.practice, 0), 5, 'an event outside the window is not counted')
})

test('a term or mission counts once, on its earliest date', () => {
  const firsts = firstPer(
    [
      { k: 't1', at: '2026-10-20T10:00:00Z' },
      { k: 't1', at: '2026-10-18T10:00:00Z' },
      { k: 't2', at: '2026-10-21T10:00:00Z' },
    ],
    (r) => r.k,
    (r) => r.at,
  )
  assert.deepEqual(firsts.sort(), ['2026-10-18T10:00:00Z', '2026-10-21T10:00:00Z'])
})

test('the value axis has a round top and whole-number steps', () => {
  assert.deepEqual(niceScale(0), { top: 4, step: 1 })
  assert.deepEqual(niceScale(3), { top: 4, step: 1 })
  assert.deepEqual(niceScale(7), { top: 8, step: 2 })
  assert.deepEqual(niceScale(19), { top: 20, step: 5 })
  assert.deepEqual(niceScale(130), { top: 200, step: 50 })
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05')
})
