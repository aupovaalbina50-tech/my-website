// Per-day series of the dashboard chart «Динамика активности».

/** Local calendar day of a date, as YYYY-MM-DD. */
export function dayKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The last `count` local days, oldest first, with zero counters. */
export function emptyDays(count, today = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - i))
    return { key: dayKey(date), date, study: 0, practice: 0 }
  })
}

/**
 * Counts events per day. `events` are { kind, at }: term_study goes to the
 * «study» line; test, mission_test and mission_complete to «practice».
 */
export function bucketEvents(events, days) {
  const byKey = new Map(days.map((d) => [d.key, { ...d }]))
  events.forEach(({ kind, at }) => {
    const day = byKey.get(dayKey(at))
    if (!day) return
    if (kind === 'term_study') day.study += 1
    else day.practice += 1
  })
  return days.map((d) => byKey.get(d.key))
}

/** Earliest date per key: a term or a mission counts once, on its first day. */
export function firstPer(rows, keyOf, atOf) {
  const first = new Map()
  rows.forEach((row) => {
    const k = keyOf(row)
    const at = atOf(row)
    if (!at) return
    if (!first.has(k) || new Date(at) < new Date(first.get(k))) first.set(k, at)
  })
  return [...first.values()]
}

/** A round upper bound for the value axis and its whole-number tick step (4 steps). */
export function niceScale(max) {
  const raw = Math.max(max, 1) / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = Math.max(1, Math.ceil([1, 2, 5, 10].map((m) => m * pow).find((c) => c >= raw)))
  return { top: step * 4, step }
}
