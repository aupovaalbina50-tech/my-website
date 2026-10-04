import { fieldsOf } from './catalog/index.js'

// From a template and the user's values to the finished document — one model
// used by the preview, DOCX, PDF, print, «Копировать текст» and the check.
// Nothing is added that the user did not enter: an empty required field shows
// as «[не указано]» so it cannot be overlooked, an empty optional one is left out.
//
// Values: text-like fields — string; multiselect — string[]; checkbox —
// boolean; table — [{ column: string }]; repeating — [{ sub: string }];
// file — [{ name, size }]. Dates are stored as the inputs give them
// (YYYY-MM-DD, YYYY-MM-DDTHH:MM) and shown as ДД.ММ.ГГГГ.

export const PLACEHOLDER = { kk: '[көрсетілмеген]', ru: '[не указано]' }

const SHORT_TYPES = new Set(['text', 'person', 'position', 'rank', 'organization', 'department', 'location', 'number', 'date', 'time', 'datetime', 'select', 'radio', 'signature'])
// Sections whose title is not a heading in the document: their fields are requisites.
const SILENT_SECTIONS = new Set(['requisites', 'head', 'approval', 'signature', 'attachments', 'content', 'items', 'rows'])

const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/
const isoDateTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

/** «2026-10-04» → «04.10.2026», «2026-10-04T14:30» → «04.10.2026 14:30». Anything else as is. */
export function formatValue(field, value) {
  const s = String(value ?? '').trim()
  if (field.type === 'date') {
    const m = isoDate.exec(s)
    return m ? `${m[3]}.${m[2]}.${m[1]}` : s
  }
  if (field.type === 'datetime') {
    const m = isoDateTime.exec(s)
    return m ? `${m[3]}.${m[2]}.${m[1]} ${m[4]}:${m[5]}` : s
  }
  return s
}

/** «04.10.2026» → «2026-10-04» for a date input; '' if not a date. */
export function toIsoDate(text) {
  const m = /(\d{1,2})[./-](\d{1,2})[./-](\d{4})/.exec(String(text ?? ''))
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''
}

export function isEmptyValue(field, value) {
  if (value === undefined || value === null) return true
  if (field.type === 'checkbox') return value !== true
  if (Array.isArray(value)) {
    if (field.type === 'table' || field.type === 'repeating') return !value.some((row) => Object.values(row ?? {}).some((v) => String(v ?? '').trim()))
    return value.length === 0
  }
  return !String(value).trim()
}

/** Required fields that are still empty (keys). */
export function missingRequired(template, values) {
  return fieldsOf(template)
    .filter((f) => f.required && isEmptyValue(f, values?.[f.key]))
    .map((f) => f.key)
}

const lines = (text) =>
  String(text ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

const paragraphs = (text) =>
  String(text ?? '')
    .split(/\n\s*\n|\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)

function shortText(field, value, lang) {
  if (field.type === 'checkbox') return value === true ? (lang === 'kk' ? 'иә' : 'да') : ''
  if (Array.isArray(value)) return value.join(', ')
  return formatValue(field, value)
}

/** The document as blocks. `missing` marks placeholders so the preview can colour them. */
export function renderDocument(template, values, lang) {
  const v = values ?? {}
  const label = (field) => field.label[lang]
  const placeholder = PLACEHOLDER[lang]
  const valueOr = (field) => {
    const empty = isEmptyValue(field, v[field.key])
    if (empty) return field.required ? { text: placeholder, missing: true } : null
    return { text: shortText(field, v[field.key], lang), missing: false }
  }

  const doc = {
    org: '',
    approve: [],
    to: [],
    from: [],
    title: template.docTitle[lang],
    subject: null,
    meta: [],
    blocks: [],
    signature: { lines: [], name: null },
    attachments: [],
  }

  for (const section of template.sections) {
    const body = []
    for (const field of section.fields) {
      const role = field.role ?? 'body'
      const value = v[field.key]
      if (field.key === 'org') {
        const r = valueOr(field)
        if (r) doc.org = r.text
        continue
      }
      if (role === 'to' || role === 'from') {
        const r = valueOr(field)
        if (r) doc[role] = r.missing ? [{ key: field.key, text: r.text, missing: true }] : lines(r.text).map((text) => ({ key: field.key, text }))
        continue
      }
      if (role === 'approve') {
        const r = valueOr(field)
        if (r) doc.approve.push({ key: field.key, type: field.type, text: r.text, missing: r.missing })
        continue
      }
      if (role === 'subject') {
        const r = valueOr(field)
        if (r) doc.subject = { key: field.key, text: r.text, missing: r.missing }
        continue
      }
      if (role === 'meta') {
        const r = valueOr(field)
        if (r) doc.meta.push({ key: field.key, type: field.type, text: r.text, missing: r.missing })
        continue
      }
      if (role === 'signature') {
        const r = valueOr(field)
        if (!r) continue
        if (field.type === 'signature') doc.signature.name = { key: field.key, text: r.text, missing: r.missing }
        else doc.signature.lines.push({ key: field.key, text: r.text, missing: r.missing })
        continue
      }
      if (role === 'attachments' || field.type === 'file') {
        if (Array.isArray(value)) doc.attachments.push(...value.map((a) => a.name).filter(Boolean))
        continue
      }
      if (field.type === 'table') {
        const rows = (Array.isArray(value) ? value : []).filter((row) => Object.values(row ?? {}).some((c) => String(c ?? '').trim()))
        if (rows.length) {
          body.push({ key: field.key, kind: 'table', label: label(field), columns: field.columns.map((c) => ({ key: c.key, label: c.label[lang] })), rows })
        } else if (field.required) body.push({ key: field.key, kind: 'para', label: label(field), text: placeholder, missing: true })
        continue
      }
      if (field.type === 'repeating') {
        const items = (Array.isArray(value) ? value : []).filter((row) => Object.values(row ?? {}).some((c) => String(c ?? '').trim()))
        if (!items.length) {
          if (field.required) body.push({ key: field.key, kind: 'para', label: label(field), text: placeholder, missing: true })
          continue
        }
        const subs = field.fields
        if (subs.every((s) => SHORT_TYPES.has(s.type))) {
          body.push({
            key: field.key,
            kind: 'list',
            label: label(field),
            items: items.map((row, i) => ({ key: `${field.key}.${i}`, text: subs.map((s) => String(row[s.key] ?? '').trim()).filter(Boolean).join(', ') })),
          })
        } else {
          items.forEach((row, i) => {
            const [first, ...rest] = subs
            if (String(row[first.key] ?? '').trim()) body.push({ key: `${field.key}.${i}.${first.key}`, kind: 'heading', text: `${i + 1}. ${String(row[first.key]).trim()}` })
            for (const s of rest) {
              const t = String(row[s.key] ?? '').trim()
              if (!t) continue
              paragraphs(t).forEach((p, j) =>
                body.push({ key: `${field.key}.${i}.${s.key}`, kind: 'para', label: j === 0 && s.key !== 'body' ? s.label[lang] : null, text: p }),
              )
            }
          })
        }
        continue
      }
      // body text
      const r = valueOr(field)
      if (!r) continue
      const inline = field.inline || SHORT_TYPES.has(field.type) || field.type === 'multiselect' || field.type === 'checkbox'
      if (inline) {
        body.push({ key: field.key, kind: 'para', label: label(field), text: r.text, missing: r.missing, inline: true })
      } else {
        paragraphs(r.text).forEach((p, j) => body.push({ key: field.key, kind: 'para', label: j === 0 ? label(field) : null, text: p, missing: r.missing }))
      }
    }
    if (!body.length) continue
    // A run-in label only helps when a section holds several texts.
    const texts = body.filter((b) => b.kind === 'para' && !b.inline)
    const distinct = new Set(texts.map((b) => b.key))
    if (distinct.size <= 1) for (const b of texts) b.label = null
    if (!SILENT_SECTIONS.has(section.key)) doc.blocks.push({ key: `section.${section.key}`, kind: 'section', text: section.title[lang] })
    doc.blocks.push(...body)
  }
  return doc
}

/** The approval block: «БЕКІТЕМІН / УТВЕРЖДАЮ», position, «______ И. О. Фамилия», date. */
export function approveLines(doc, lang) {
  if (!doc.approve.length) return []
  const position = doc.approve.find((a) => a.key === 'approvePosition')
  const name = doc.approve.find((a) => a.key === 'approveName')
  const date = doc.approve.find((a) => a.key === 'approveDate')
  return [
    { text: lang === 'kk' ? 'БЕКІТЕМІН' : 'УТВЕРЖДАЮ', bold: true },
    ...(position ? [{ key: position.key, text: position.text, missing: position.missing }] : []),
    { key: name?.key, text: `__________ ${name?.text ?? ''}`.trim(), missing: name?.missing },
    { key: date?.key, text: date?.text ?? (lang === 'kk' ? '«___» __________ 20__ ж.' : '«___» __________ 20__ г.'), missing: date?.missing },
  ]
}

/** «№ 12 · 04.10.2026 · г. Астана». */
export function metaLine(doc) {
  return doc.meta.map((m) => (m.key === 'number' && !m.missing ? `№ ${m.text.replace(/^№\s*/, '')}` : m.text)).join('    ')
}

const blockText = (b) => (b.label ? (b.inline ? `${b.label}: ${b.text}` : `${b.label}. ${b.text}`) : b.text)

/** Plain text of the document («Копировать текст»). */
export function documentText(doc, lang) {
  const out = []
  if (doc.org) out.push(doc.org, '')
  const approve = approveLines(doc, lang)
  if (approve.length) out.push(...approve.map((l) => l.text), '')
  if (doc.to.length) out.push(...doc.to.map((l) => l.text))
  if (doc.from.length) out.push(...doc.from.map((l) => l.text))
  if (doc.to.length || doc.from.length) out.push('')
  out.push(doc.title)
  if (doc.subject) out.push(doc.subject.text)
  const meta = metaLine(doc)
  if (meta) out.push(meta)
  out.push('')
  for (const b of doc.blocks) {
    if (b.kind === 'section' || b.kind === 'heading') out.push('', b.text)
    else if (b.kind === 'list') out.push(`${b.label}:`, ...b.items.map((it, i) => `${i + 1}. ${it.text}`))
    else if (b.kind === 'table') {
      out.push(`${b.label}:`, b.columns.map((c) => c.label).join(' | '))
      for (const row of b.rows) out.push(b.columns.map((c) => row[c.key] ?? '').join(' | '))
    } else out.push(blockText(b))
  }
  if (doc.attachments.length) out.push('', `${lang === 'kk' ? 'Қосымша' : 'Приложение'}: ${doc.attachments.join('; ')}`)
  out.push('', ...doc.signature.lines.map((l) => l.text))
  if (doc.signature.name) out.push(`__________ ${doc.signature.name.text}`)
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ---- check and fixes ------------------------------------------------------------

/** Texts the AI check reads: one block per filled field, cell or item (key = value path). */
export function checkBlocks(template, values, lang) {
  const blocks = []
  for (const field of fieldsOf(template)) {
    const value = values?.[field.key]
    if (isEmptyValue(field, value) || field.type === 'file' || field.type === 'checkbox') continue
    if (field.type === 'table' || field.type === 'repeating') {
      const subs = field.type === 'table' ? field.columns : field.fields
      value.forEach((row, i) =>
        subs.forEach((s) => {
          const t = String(row?.[s.key] ?? '').trim()
          if (t) blocks.push({ key: `${field.key}.${i}.${s.key}`, label: `${field.label[lang]} ${i + 1}: ${s.label[lang]}`, text: t })
        }),
      )
    } else {
      blocks.push({ key: field.key, label: field.label[lang], text: shortText(field, value, lang) })
    }
  }
  return blocks.slice(0, 120)
}

/** The string at «key» or «key.row.column». */
export function valueAt(values, path) {
  const [key, row, sub] = String(path).split('.')
  if (row === undefined) return values?.[key]
  return values?.[key]?.[Number(row)]?.[sub]
}

/** Values with the string at `path` replaced. */
export function setValueAt(values, path, next) {
  const [key, row, sub] = String(path).split('.')
  if (row === undefined) return { ...values, [key]: next }
  const list = Array.isArray(values?.[key]) ? [...values[key]] : []
  list[Number(row)] = { ...(list[Number(row)] ?? {}), [sub]: next }
  return { ...values, [key]: list }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Replaces the first occurrence of `was` (spaces matched loosely); null if it is no longer there. */
export function replaceFragment(text, was, now) {
  const s = String(text ?? '')
  if (!was) return null
  const i = s.indexOf(was)
  if (i >= 0) return s.slice(0, i) + now + s.slice(i + was.length)
  const re = new RegExp(was.split(/\s+/).filter(Boolean).map(escapeRe).join('\\s+'))
  return re.test(s) ? s.replace(re, now) : null
}

/** Field values as one flat list (for «Сравнить версии»). */
export function flatValues(template, values, lang) {
  return fieldsOf(template).map((field) => {
    const value = values?.[field.key]
    let text = ''
    if (!isEmptyValue(field, value)) {
      if (field.type === 'table' || field.type === 'repeating') {
        const subs = field.type === 'table' ? field.columns : field.fields
        text = value.map((row) => subs.map((s) => row?.[s.key] ?? '').join(' | ')).join('\n')
      } else if (field.type === 'file') text = value.map((a) => a.name).join('; ')
      else text = shortText(field, value, lang)
    }
    return { key: field.key, label: field.label[lang], text }
  })
}
