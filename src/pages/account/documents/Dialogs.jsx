import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Camera, Check, Loader2, Sparkles, X } from 'lucide-react'
import { fieldsOf } from './catalog/index.js'
import { flatValues, formatValue, isEmptyValue, toIsoDate } from './render.js'
import { fillFromText, loadDocVersions, readDocumentPhoto } from './useDocuments.js'
import { errorText } from './strings.js'

// Dialogs of the document editor. None of them changes the document by
// itself: each one shows what would change and waits for the user's «yes».

export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="doc-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`doc-modal${wide ? ' doc-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <header className="doc-modal-head">
          <h2>{title}</h2>
          <button type="button" className="doc-icon-btn" onClick={onClose} aria-label="×">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="doc-modal-body">{children}</div>
      </div>
    </div>
  )
}

// ---- «Заполнить данными профиля» ---------------------------------------------------

const initials = (first) => (first ? `${first.trim()[0]}.` : '')

/** Profile values → the template's profile keys (fromLine, shortName, position…). */
function profileValues(data) {
  const shortName = data.shortName.trim()
  const fromLine = [data.position, data.rank, data.fullName].map((x) => x.trim()).filter(Boolean).join(' ')
  return {
    fromLine,
    shortName,
    position: data.position.trim(),
    rank: data.rank.trim(),
    department: data.department.trim(),
    organization: data.organization.trim(),
  }
}

export function ProfileFillDialog({ template, values, profile, lang, s, onApply, onClose }) {
  const p = s.profile
  const [data, setData] = useState(() => ({
    fullName: [profile?.last_name, profile?.first_name].filter(Boolean).join(' '),
    shortName: [initials(profile?.first_name), profile?.last_name].filter(Boolean).join(' '),
    position: profile?.position ?? '',
    rank: profile?.rank ?? '',
    department: profile?.department ?? '',
    organization: profile?.organization ?? '',
  }))
  const [save, setSave] = useState(false)
  const mapped = profileValues(data)
  // Only empty fields are filled — nothing the user typed is overwritten.
  const targets = fieldsOf(template).filter((f) => f.profile && isEmptyValue(f, values[f.key]) && mapped[f.profile])
  const set = (key) => (e) => setData((d) => ({ ...d, [key]: e.target.value }))
  return (
    <Modal title={p.title} onClose={onClose}>
      <p className="doc-modal-lead">{p.lead}</p>
      <div className="doc-modal-grid">
        {['fullName', 'shortName', 'position', 'rank', 'department', 'organization'].map((key) => (
          <label key={key} className="doc-sub">
            <span className="doc-sub-label">{p[key]}</span>
            <input className="doc-input" value={data[key]} onChange={set(key)} />
          </label>
        ))}
      </div>
      <label className="doc-choice">
        <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} />
        {p.saveToProfile}
      </label>
      {targets.length ? (
        <div className="doc-modal-note">
          <strong>{p.willFill}</strong> {targets.map((f) => f.label[lang]).join(', ')}
          {targets.some((f) => f.profile === 'fromLine') && <p>{p.fromLineNote}</p>}
        </div>
      ) : (
        <p className="doc-modal-note">{p.nothingToFill}</p>
      )}
      <footer className="doc-modal-actions">
        <button type="button" className="doc-btn" onClick={onClose}>
          {p.cancel}
        </button>
        <button
          type="button"
          className="doc-btn doc-btn--primary"
          disabled={!targets.length && !save}
          onClick={() =>
            onApply(
              Object.fromEntries(targets.map((f) => [f.key, mapped[f.profile]])),
              save ? { position: data.position.trim(), rank: data.rank.trim(), department: data.department.trim(), organization: data.organization.trim() } : null,
            )
          }
        >
          <Check size={16} aria-hidden="true" />
          {p.apply}
        </button>
      </footer>
    </Modal>
  )
}

// ---- «Помочь заполнить» ---------------------------------------------------------------

const FILLABLE = new Set(['text', 'textarea', 'date', 'time', 'datetime', 'number', 'select', 'radio', 'multiselect', 'checkbox', 'person', 'position', 'rank', 'organization', 'department', 'location', 'signature', 'table', 'repeating'])

/** The AI's string → the value shape of the field. */
function toFieldValue(field, value, lang) {
  const v = String(value ?? '').trim()
  if (field.type === 'date') return toIsoDate(v) || v
  if (field.type === 'datetime') {
    const date = toIsoDate(v)
    const time = /(\d{1,2}):(\d{2})/.exec(v)
    return date && time ? `${date}T${time[1].padStart(2, '0')}:${time[2]}` : v
  }
  if (field.type === 'time') {
    const m = /(\d{1,2})[:.](\d{2})/.exec(v)
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : v
  }
  if (field.type === 'number') return v.replace(/[^\d]/g, '')
  if (field.type === 'checkbox') return /^(да|иә|yes|true)$/i.test(v)
  if (field.type === 'multiselect') {
    const options = field.options?.[lang] ?? []
    return v.split(/\s*;\s*/).filter((o) => options.includes(o))
  }
  if (field.type === 'table' || field.type === 'repeating') {
    const subs = field.type === 'table' ? field.columns : field.fields
    return v
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((line) => {
        const cells = line.split(/\s*\|\s*/)
        return Object.fromEntries(subs.map((sub, i) => [sub.key, cells[i] ?? '']))
      })
  }
  return v
}

/** Short text of a converted value for the confirmation list. */
function shownValue(field, value) {
  if (Array.isArray(value)) {
    if (field.type === 'multiselect') return value.join(', ')
    return value.map((row) => Object.values(row).filter(Boolean).join(' | ')).join('\n')
  }
  if (value === true) return '✓'
  return formatValue(field, value)
}

/** `lang` — the document language (what the AI reads and writes), `uiLang` — the labels shown. */
export function AssistDialog({ template, values, lang, uiLang = lang, s, initialText = '', onApply, onClose }) {
  const a = s.assist
  const fields = useMemo(() => fieldsOf(template).filter((f) => FILLABLE.has(f.type)), [template])
  const [text, setText] = useState(initialText)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null) // { items: [{ field, value, quote, on }], missing: [field] }

  const analyze = async () => {
    setBusy(true)
    setError(null)
    try {
      const out = await fillFromText({
        text,
        lang,
        documentTitle: template.title[lang],
        today: new Date().toLocaleDateString('ru-RU'),
        fields: fields.map((f) => ({
          key: f.key,
          label: f.label[lang],
          type: f.type,
          hint: f.hint?.[lang] ?? '',
          options: f.options?.[lang] ?? (f.type === 'table' ? f.columns.map((c) => c.label[lang]) : f.type === 'repeating' ? f.fields.map((x) => x.label[lang]) : []),
        })),
      })
      const byKey = new Map(fields.map((f) => [f.key, f]))
      const items = out.values
        .map((v) => {
          const field = byKey.get(v.key)
          const value = field && toFieldValue(field, v.value, lang)
          return field && !isEmptyValue(field, value) ? { field, value, quote: v.quote, on: true, edit: shownValue(field, value) } : null
        })
        .filter(Boolean)
      // «Не указано пользователем»: neither in the text nor already in the form.
      setResult({ items, missing: fields.filter((f) => !items.some((it) => it.field.key === f.key) && isEmptyValue(f, values[f.key])) })
    } catch (e) {
      setError(errorText(s, e))
    } finally {
      setBusy(false)
    }
  }

  const chosen = result?.items.filter((it) => it.on) ?? []
  const update = (i, patch) => setResult((r) => ({ ...r, items: r.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }))

  return (
    <Modal title={a.title} onClose={onClose} wide>
      {!result ? (
        <>
          <p className="doc-modal-lead">{a.lead}</p>
          <p className="doc-modal-rule">
            <AlertTriangle size={15} aria-hidden="true" />
            {a.rule}
          </p>
          <textarea className="doc-input" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={a.placeholder} maxLength={8000} />
          {error && <p className="doc-error">{error}</p>}
          <footer className="doc-modal-actions">
            <button type="button" className="doc-btn" onClick={onClose}>
              {a.cancel}
            </button>
            <button type="button" className="doc-btn doc-btn--primary" onClick={analyze} disabled={busy || text.trim().length < 10}>
              {busy ? <Loader2 size={16} className="doc-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
              {busy ? a.analyzing : a.analyze}
            </button>
          </footer>
        </>
      ) : (
        <>
          <h3 className="doc-modal-subtitle">{a.recognized}</h3>
          {result.items.length === 0 && <p className="doc-modal-note">{a.nothingRecognized}</p>}
          <ul className="doc-assist-list">
            {result.items.map((it, i) => {
              const simple = !['table', 'repeating', 'multiselect', 'checkbox'].includes(it.field.type)
              return (
                <li key={it.field.key} className={`doc-assist-item${it.on ? '' : ' is-off'}`}>
                  <label className="doc-choice doc-assist-check">
                    <input type="checkbox" checked={it.on} onChange={(e) => update(i, { on: e.target.checked })} />
                    <strong>{it.field.label[uiLang]}</strong>
                  </label>
                  {simple ? (
                    <textarea
                      className="doc-input"
                      rows={it.field.type === 'textarea' ? 3 : 1}
                      value={it.edit}
                      onChange={(e) => update(i, { edit: e.target.value, value: toFieldValue(it.field, e.target.value, lang) })}
                    />
                  ) : (
                    <p className="doc-assist-value">{shownValue(it.field, it.value)}</p>
                  )}
                  <p className="doc-assist-quote">
                    {a.quote}: «{it.quote}»
                  </p>
                  {!isEmptyValue(it.field, values[it.field.key]) && <p className="doc-assist-warn">{a.replaceWarning}</p>}
                </li>
              )
            })}
          </ul>
          {result.missing.length > 0 && (
            <div className="doc-assist-missing">
              <h3 className="doc-modal-subtitle">{a.missing}</h3>
              <p>
                {result.missing.map((f) => (
                  <span key={f.key} className={`doc-chip${f.required ? ' doc-chip--required' : ''}`}>
                    {f.label[uiLang]}
                  </span>
                ))}
              </p>
            </div>
          )}
          <footer className="doc-modal-actions">
            <button type="button" className="doc-btn" onClick={() => setResult(null)}>
              {a.back}
            </button>
            <button
              type="button"
              className="doc-btn doc-btn--primary"
              disabled={!chosen.length}
              onClick={() => onApply(Object.fromEntries(chosen.map((it) => [it.field.key, it.value])))}
            >
              <Check size={16} aria-hidden="true" />
              {a.confirm(chosen.length)}
            </button>
          </footer>
        </>
      )}
    </Modal>
  )
}

// ---- «Загрузить фото» ---------------------------------------------------------------------

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTO = 5 * 1024 * 1024

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export function PhotoDialog({ s, onUseText, onClose }) {
  const ph = s.photo
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [lines, setLines] = useState(null)
  const [preview, setPreview] = useState(null)

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const pick = async (file) => {
    if (!file) return
    setError(null)
    setLines(null)
    if (!PHOTO_TYPES.includes(file.type)) return setError(ph.badType)
    if (file.size > MAX_PHOTO) return setError(ph.tooLarge)
    setPreview(URL.createObjectURL(file))
    setBusy(true)
    try {
      const out = await readDocumentPhoto({ mediaType: file.type, data: await toBase64(file) })
      setLines(out.lines)
    } catch (e) {
      setError(errorText(s, e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={ph.title} onClose={onClose} wide>
      <p className="doc-modal-lead">{ph.lead}</p>
      <label className="doc-btn doc-btn--primary doc-photo-pick">
        <Camera size={16} aria-hidden="true" />
        {ph.choose}
        <input type="file" accept={PHOTO_TYPES.join(',')} hidden onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {error && <p className="doc-error">{error}</p>}
      <div className="doc-photo-grid">
        {preview && <img src={preview} alt="" className="doc-photo-img" />}
        <div>
          {busy && (
            <p className="doc-modal-note">
              <Loader2 size={16} className="doc-spin" aria-hidden="true" /> {ph.reading}
            </p>
          )}
          {lines && lines.length === 0 && <p className="doc-modal-note">{ph.noText}</p>}
          {lines?.some((l) => !l.sure) && <p className="doc-modal-rule">{ph.unsureNotPassed}</p>}
          {lines && lines.length > 0 && (
            <div className="doc-photo-text">
              {lines.map((l, i) => (
                <p key={i} className={l.sure ? undefined : 'doc-photo-unsure'}>
                  {l.text}
                  {!l.sure && (
                    <span className="doc-photo-flag">
                      <AlertTriangle size={13} aria-hidden="true" /> {ph.unsure}
                    </span>
                  )}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
      <footer className="doc-modal-actions">
        <button type="button" className="doc-btn" onClick={onClose}>
          {ph.cancel}
        </button>
        <button type="button" className="doc-btn doc-btn--primary" disabled={!lines?.some((l) => l.sure)} onClick={() => onUseText(lines.filter((l) => l.sure).map((l) => l.text).join('\n'))}>
          <Sparkles size={16} aria-hidden="true" />
          {ph.useForAssist}
        </button>
      </footer>
    </Modal>
  )
}

// ---- «Версии» / «Сравнить версии» ------------------------------------------------------

export function VersionsDialog({ doc, template, values, lang, s, onRestore, onClose }) {
  const v = s.versions
  const [versions, setVersions] = useState(null)
  const [error, setError] = useState(false)
  const [picked, setPicked] = useState([])

  useEffect(() => {
    loadDocVersions(doc.id)
      .then(setVersions)
      .catch(() => setError(true))
  }, [doc.id])

  const current = { id: 'current', version: null, kind: null, values, created_at: null }
  const all = versions ? [current, ...versions] : []
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p.slice(-1), id]))
  const name = (item) => (item.id === 'current' ? v.current : `${item.version}. ${v.kinds[item.kind] ?? ''}`)
  const pair = picked.length === 2 ? picked.map((id) => all.find((x) => x.id === id)) : null
  const diff = pair
    ? (() => {
        const [a, b] = pair.map((item) => flatValues(template, item.values, lang))
        return a.map((row, i) => ({ label: row.label, a: row.text, b: b[i].text })).filter((r) => r.a !== r.b)
      })()
    : null
  const fmt = (d) => new Date(d).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <Modal title={v.title} onClose={onClose} wide>
      {error && <p className="doc-error">{v.loadFailed}</p>}
      {versions && versions.length === 0 && <p className="doc-modal-note">{v.empty}</p>}
      {versions && versions.length > 0 && (
        <>
          <p className="doc-modal-lead">{v.pickTwo}</p>
          <ul className="doc-version-list">
            {all.map((item) => (
              <li key={item.id} className={picked.includes(item.id) ? 'is-picked' : undefined}>
                <label className="doc-choice">
                  <input type="checkbox" checked={picked.includes(item.id)} onChange={() => toggle(item.id)} />
                  <strong>{name(item)}</strong>
                </label>
                {item.created_at && <span className="doc-version-date">{fmt(item.created_at)}</span>}
                {item.id !== 'current' && (
                  <button type="button" className="doc-btn doc-btn--small" onClick={() => onRestore(item)}>
                    {v.restore}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {diff && (
            <div className="doc-diff">
              <h3 className="doc-modal-subtitle">{v.compare}</h3>
              {diff.length === 0 ? (
                <p className="doc-modal-note">{v.noDiff}</p>
              ) : (
                <table className="doc-diff-table">
                  <thead>
                    <tr>
                      <th>{v.field}</th>
                      <th>{name(pair[0])}</th>
                      <th>{name(pair[1])}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.map((r, i) => (
                      <tr key={i}>
                        <th scope="row">{r.label}</th>
                        <td className="doc-diff-old">{r.a || '—'}</td>
                        <td className="doc-diff-new">{r.b || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
      <footer className="doc-modal-actions">
        <button type="button" className="doc-btn" onClick={onClose}>
          {v.close}
        </button>
      </footer>
    </Modal>
  )
}
