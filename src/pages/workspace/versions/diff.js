// Word-level comparison of two texts (longest common subsequence). It shows
// what was added, removed or changed between two editions — nothing more: it
// says nothing about whether either text is correct.

const TOKEN_RE = /\s+|[^\s]+/g
// Above this the table would be too large for the browser: compare by lines.
const MAX_CELLS = 4_000_000

const tokens = (text) => String(text ?? '').match(TOKEN_RE) ?? []

function lcsOps(a, b) {
  const n = a.length
  const m = b.length
  const table = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1])
  }
  const ops = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ op: 'equal', text: a[i] })
      i++
      j++
    } else if (table[i + 1][j] >= table[i][j + 1]) ops.push({ op: 'delete', text: a[i++] })
    else ops.push({ op: 'insert', text: b[j++] })
  }
  while (i < n) ops.push({ op: 'delete', text: a[i++] })
  while (j < m) ops.push({ op: 'insert', text: b[j++] })
  return ops
}

/** Joins neighbours of the same kind; a deletion right before an insertion is a change. */
function group(ops) {
  const out = []
  for (const o of ops) {
    const last = out.at(-1)
    if (last && last.op === o.op) last.text += o.text
    else out.push({ ...o })
  }
  const result = []
  for (let k = 0; k < out.length; k++) {
    const cur = out[k]
    const next = out[k + 1]
    if (cur.op === 'delete' && next?.op === 'insert') {
      result.push({ op: 'change', was: cur.text, now: next.text })
      k++
    } else result.push(cur)
  }
  return result
}

/**
 * @returns [{ op: 'equal' | 'insert' | 'delete', text } | { op: 'change', was, now }]
 */
export function diffText(before, after) {
  const a = tokens(before)
  const b = tokens(after)
  if ((a.length + 1) * (b.length + 1) > MAX_CELLS) {
    const lines = (t) => String(t ?? '').split(/(?<=\n)/)
    return group(lcsOps(lines(before), lines(after)))
  }
  return group(lcsOps(a, b))
}

/** How many words were added, removed and changed. */
export function diffStats(parts) {
  const words = (t) => (String(t).match(/\S+/g) ?? []).length
  return parts.reduce(
    (acc, p) => {
      if (p.op === 'insert') acc.added += words(p.text)
      else if (p.op === 'delete') acc.removed += words(p.text)
      else if (p.op === 'change') acc.changed += 1
      return acc
    },
    { added: 0, removed: 0, changed: 0 },
  )
}
