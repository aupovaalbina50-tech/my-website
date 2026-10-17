import { cloneElement, useRef, useState } from 'react'
import { Building2, Info, MapPin, Paperclip, Plus, Shield, Trash2, User, Users, BadgeCheck } from 'lucide-react'

// One field of the dynamic form. The template's `type` decides the control;
// value shapes are described in render.js. person / position / rank /
// organization / department / location are text inputs with their own icon
// and profile mapping; table and repeating are lists of rows.

const ICONS = { person: User, position: BadgeCheck, rank: Shield, organization: Building2, department: Users, location: MapPin }

function Hint({ text, s }) {
  const [open, setOpen] = useState(false)
  if (!text) return null
  return (
    <>
      <button type="button" className="doc-hint-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Info size={14} aria-hidden="true" />
        {s.editor.hint}
      </button>
      {open && <p className="doc-hint">{text}</p>}
    </>
  )
}

function Rows({ field, value, onChange, readOnly, s, lang, table }) {
  const subs = table ? field.columns : field.fields
  const rows = Array.isArray(value) && value.length ? value : [{}]
  const setCell = (i, key, v) => onChange(rows.map((row, j) => (j === i ? { ...row, [key]: v } : row)))
  const addRow = () => onChange([...rows, {}])
  const removeRow = (i) => onChange(rows.filter((_, j) => j !== i))
  return (
    <div className={table ? 'doc-table-input' : 'doc-repeat-input'}>
      {rows.map((row, i) => (
        <div key={i} className={table ? 'doc-table-row' : 'doc-repeat-item'} style={table ? { '--cols': subs.length } : undefined}>
          {!table && <span className="doc-repeat-num">{i + 1}</span>}
          {subs.map((sub) => {
            const id = `f-${field.key}-${i}-${sub.key}`
            const multiline = sub.type === 'textarea'
            const Control = multiline ? 'textarea' : 'input'
            return (
              <label key={sub.key} className="doc-sub" htmlFor={id}>
                <span className={table && i > 0 ? 'doc-sub-label doc-sub-label--repeat' : 'doc-sub-label'}>{sub.label[lang]}</span>
                <Control
                  id={id}
                  data-path={`${field.key}.${i}.${sub.key}`}
                  className="doc-input"
                  rows={multiline ? 3 : undefined}
                  value={row?.[sub.key] ?? ''}
                  onChange={(e) => setCell(i, sub.key, e.target.value)}
                  readOnly={readOnly}
                />
              </label>
            )
          })}
          {!readOnly && rows.length > 1 && (
            <button type="button" className="doc-row-remove" onClick={() => removeRow(i)} aria-label={s.editor.removeRow} title={s.editor.removeRow}>
              <Trash2 size={15} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
      {!readOnly && (
        <button type="button" className="doc-row-add" onClick={addRow}>
          <Plus size={15} aria-hidden="true" />
          {table ? s.editor.addRow : s.editor.addItem}
        </button>
      )}
    </div>
  )
}

/**
 * Remarks of the expertise marked in the text of a field. A layer with the
 * same text and font lies under the (transparent) input; the user types as
 * usual. A click inside a marked fragment opens its remark.
 */
function Marked({ value, marks, activeMark, onMark, multiline, children }) {
  const back = useRef(null)
  const text = String(value ?? '')
  const parts = []
  let at = 0
  for (const m of marks) {
    if (m.start < at || m.end > text.length) continue
    if (m.start > at) parts.push(text.slice(at, m.start))
    parts.push(
      <mark key={m.id} className={`hl-${m.priority}${m.id === activeMark ? ' is-active' : ''}`} data-remark={m.id}>
        {text.slice(m.start, m.end)}
      </mark>,
    )
    at = m.end
  }
  parts.push(text.slice(at) + (multiline ? '\n ' : ' '))
  const sync = (e) => {
    if (!back.current) return
    back.current.scrollTop = e.currentTarget.scrollTop
    back.current.scrollLeft = e.currentTarget.scrollLeft
  }
  const pick = (e) => {
    const el = e.currentTarget
    if (el.selectionStart !== el.selectionEnd) return
    const hit = marks.find((m) => el.selectionStart >= m.start && el.selectionStart <= m.end)
    if (hit) onMark?.(hit.id)
  }
  return (
    <div className="doc-hl">
      <div ref={back} className={`doc-input doc-hl-back${multiline ? '' : ' doc-hl-back--line'}`} aria-hidden="true">
        {parts}
      </div>
      {cloneElement(children, { onScroll: sync, onClick: pick, onKeyUp: sync })}
    </div>
  )
}

function Control({ field, value, onChange, readOnly, s, lang, id, invalid, marks, activeMark, onMark }) {
  const common = {
    id,
    'data-path': field.key,
    className: 'doc-input',
    readOnly,
    'aria-invalid': invalid || undefined,
    'aria-required': field.required || undefined,
  }
  const options = field.options?.[lang] ?? []
  switch (field.type) {
    case 'textarea': {
      const el = <textarea {...common} rows={4} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      return marks?.length ? (
        <Marked value={value} marks={marks} activeMark={activeMark} onMark={onMark} multiline>
          {el}
        </Marked>
      ) : (
        el
      )
    }
    case 'date':
      return <input {...common} type="date" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    case 'time':
      return <input {...common} type="time" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    case 'datetime':
      return <input {...common} type="datetime-local" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    case 'number':
      return <input {...common} type="number" min="0" inputMode="numeric" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    case 'select':
      return (
        <select {...common} value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={readOnly}>
          <option value="">{s.editor.selectPlaceholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    case 'radio':
      return (
        <div className="doc-choices" role="radiogroup" id={id} data-path={field.key}>
          {options.map((o) => (
            <label key={o} className="doc-choice">
              <input type="radio" name={id} checked={value === o} onChange={() => onChange(o)} disabled={readOnly} />
              {o}
            </label>
          ))}
        </div>
      )
    case 'multiselect': {
      const list = Array.isArray(value) ? value : []
      return (
        <div className="doc-choices" id={id} data-path={field.key}>
          {options.map((o) => (
            <label key={o} className="doc-choice">
              <input
                type="checkbox"
                checked={list.includes(o)}
                onChange={(e) => onChange(e.target.checked ? [...list, o] : list.filter((x) => x !== o))}
                disabled={readOnly}
              />
              {o}
            </label>
          ))}
        </div>
      )
    }
    case 'checkbox':
      return (
        <label className="doc-choice">
          <input id={id} data-path={field.key} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} disabled={readOnly} />
          {s.editor.yes}
        </label>
      )
    case 'file': {
      const list = Array.isArray(value) ? value : []
      return (
        <div className="doc-files" data-path={field.key}>
          {list.map((a, i) => (
            <span key={`${a.name}-${i}`} className="doc-file">
              <Paperclip size={14} aria-hidden="true" />
              {a.name}
              {a.size ? <small>{Math.max(1, Math.round(a.size / 1024))} KB</small> : null}
              {!readOnly && (
                <button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label={s.editor.removeRow}>
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              )}
            </span>
          ))}
          {!readOnly && (
            <label className="doc-row-add doc-file-pick">
              <Paperclip size={15} aria-hidden="true" />
              {s.editor.chooseFile}
              <input
                id={id}
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  const picked = [...(e.target.files ?? [])].map((file) => ({ name: file.name, size: file.size }))
                  onChange([...list, ...picked])
                  e.target.value = ''
                }}
              />
            </label>
          )}
          <p className="doc-field-note">{s.editor.fileNote}</p>
        </div>
      )
    }
    case 'table':
      return <Rows field={field} value={value} onChange={onChange} readOnly={readOnly} s={s} lang={lang} table />
    case 'repeating':
      return <Rows field={field} value={value} onChange={onChange} readOnly={readOnly} s={s} lang={lang} />
    case 'signature':
      return (
        <div className="doc-signature-input">
          <span className="doc-signature-line" aria-hidden="true">
            __________
          </span>
          <input {...common} type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      )
    default: {
      const Icon = ICONS[field.type]
      const raw = <input {...common} type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      const el = marks?.length ? (
        <Marked value={value} marks={marks} activeMark={activeMark} onMark={onMark}>
          {raw}
        </Marked>
      ) : (
        raw
      )
      return Icon ? (
        <div className="doc-input-icon">
          <Icon size={16} aria-hidden="true" />
          {el}
        </div>
      ) : (
        el
      )
    }
  }
}

export default function FieldInput({ field, value, onChange, readOnly, s, lang, invalid, flash, marks = null, activeMark = null, onMark = null }) {
  const id = `f-${field.key}`
  const grouped = ['radio', 'multiselect', 'table', 'repeating', 'file'].includes(field.type)
  const wide = ['textarea', 'table', 'repeating', 'file', 'multiselect', 'radio'].includes(field.type)
  const Label = grouped ? 'span' : 'label'
  return (
    <div
      className={`doc-field${wide ? ' doc-field--wide' : ''}${invalid ? ' doc-field--invalid' : ''}${flash ? ' doc-field--flash' : ''}`}
      data-field={field.key}
    >
      <div className="doc-field-head">
        <Label className="doc-field-label" {...(grouped ? {} : { htmlFor: id })}>
          {field.label[lang]}
          {field.required && <span className="doc-required" aria-hidden="true">*</span>}
        </Label>
        <Hint text={field.hint?.[lang]} s={s} />
      </div>
      <Control field={field} value={value} onChange={onChange} readOnly={readOnly} s={s} lang={lang} id={id} invalid={invalid} marks={marks} activeMark={activeMark} onMark={onMark} />
      {field.type === 'signature' && <p className="doc-field-note">{s.editor.signatureNote}</p>}
      {invalid && <p className="doc-field-error">{s.editor.missingField}</p>}
    </div>
  )
}
