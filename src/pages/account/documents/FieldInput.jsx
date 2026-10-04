import { useState } from 'react'
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

function Control({ field, value, onChange, readOnly, s, lang, id, invalid }) {
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
    case 'textarea':
      return <textarea {...common} rows={4} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
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
      return Icon ? (
        <div className="doc-input-icon">
          <Icon size={16} aria-hidden="true" />
          <input {...common} type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      ) : (
        <input {...common} type="text" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )
    }
  }
}

export default function FieldInput({ field, value, onChange, readOnly, s, lang, invalid, flash }) {
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
      <Control field={field} value={value} onChange={onChange} readOnly={readOnly} s={s} lang={lang} id={id} invalid={invalid} />
      {field.type === 'signature' && <p className="doc-field-note">{s.editor.signatureNote}</p>}
      {invalid && <p className="doc-field-error">{s.editor.missingField}</p>}
    </div>
  )
}
