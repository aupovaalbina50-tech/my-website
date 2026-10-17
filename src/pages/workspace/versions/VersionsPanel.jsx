import { useEffect, useMemo, useState } from 'react'
import { Download, Eye, GitCompare, RotateCcw } from 'lucide-react'
import { Modal } from '../../account/documents/Dialogs.jsx'
import { loadDocVersions } from '../../account/documents/useDocuments.js'
import { documentText, flatValues, renderDocument } from '../../account/documents/render.js'
import { diffStats, diffText } from './diff.js'
import './versions.css'

// «История версий»: the saved editions of a document, why each was saved,
// a word-level comparison of any two and the full text of each. Restoring
// and exporting are done by the editor (it keeps the current text first).

export function Diff({ parts }) {
  return (
    <p className="ver-diff-text">
      {parts.map((p, i) =>
        p.op === 'equal' ? (
          <span key={i}>{p.text}</span>
        ) : p.op === 'insert' ? (
          <ins key={i}>{p.text}</ins>
        ) : p.op === 'delete' ? (
          <del key={i}>{p.text}</del>
        ) : (
          <span key={i} className="ver-change">
            <del>{p.was}</del>
            <ins>{p.now}</ins>
          </span>
        ),
      )}
    </p>
  )
}

export function VersionsPanel({ doc, template, values, docLang, lang, v, onRestore, onExport, onClose }) {
  const [versions, setVersions] = useState(null)
  const [error, setError] = useState(false)
  const [pair, setPair] = useState(null) // [olderId, newerId]
  const [reading, setReading] = useState(null)

  useEffect(() => {
    loadDocVersions(doc.id)
      .then(setVersions)
      .catch(() => setError(true))
  }, [doc.id])

  const current = useMemo(() => ({ id: 'current', version: null, kind: 'current', values, created_at: null }), [values])
  const all = versions ? [current, ...versions] : []
  const byId = (id) => all.find((x) => x.id === id)
  const name = (item) => (item.id === 'current' ? v.current : v.numbered(item.version, v.kinds[item.kind] ?? item.kind))
  const fmt = (d) => new Date(d).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { dateStyle: 'medium', timeStyle: 'short' })

  const comparison = useMemo(() => {
    if (!pair) return null
    const [a, b] = pair.map(byId)
    if (!a || !b) return null
    const fa = flatValues(template, a.values ?? {}, docLang)
    const fb = flatValues(template, b.values ?? {}, docLang)
    const fields = fa
      .map((row, i) => ({ label: row.label, parts: diffText(row.text, fb[i]?.text ?? '') }))
      .filter((f) => f.parts.some((p) => p.op !== 'equal'))
    const stats = fields.reduce((acc, f) => {
      const s = diffStats(f.parts)
      return { added: acc.added + s.added, removed: acc.removed + s.removed, changed: acc.changed + s.changed }
    }, { added: 0, removed: 0, changed: 0 })
    return { a, b, fields, stats }
    // byId reads `all`, rebuilt from versions and values
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, versions, values, template, docLang])

  const fullText = (item) => documentText(renderDocument(template, item.values ?? {}, docLang), docLang)

  return (
    <Modal title={v.title} onClose={onClose} wide>
      {error && <p className="doc-error">{v.loadFailed}</p>}
      {versions && versions.length === 0 && <p className="doc-modal-note">{v.empty}</p>}
      {versions && versions.length > 0 && (
        <ol className="ver-list">
          {all.map((item) => (
            <li key={item.id} className={`ver-item${pair?.includes(item.id) ? ' is-picked' : ''}`}>
              <div className="ver-head">
                <strong>{name(item)}</strong>
                {item.created_at && <span className="ver-date">{fmt(item.created_at)}</span>}
              </div>
              {item.id !== 'current' && <p className="ver-reason">{item.note || v.reasonOf[item.kind] || ''}</p>}
              <div className="ver-actions">
                {item.id !== 'current' && (
                  <button type="button" className="doc-btn doc-btn--small" onClick={() => setPair([item.id, 'current'])}>
                    <GitCompare size={14} aria-hidden="true" /> {v.compareWithCurrent}
                  </button>
                )}
                {item.id !== 'current' && versions.length > 0 && (
                  <select
                    className="doc-input ver-select"
                    aria-label={v.compareWith}
                    value=""
                    onChange={(e) => e.target.value && setPair([item.id, e.target.value])}
                  >
                    <option value="">{v.compareWith}…</option>
                    {all
                      .filter((o) => o.id !== item.id)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {name(o)}
                        </option>
                      ))}
                  </select>
                )}
                <button type="button" className="doc-btn doc-btn--small" onClick={() => setReading(reading === item.id ? null : item.id)}>
                  <Eye size={14} aria-hidden="true" /> {v.fullText}
                </button>
                <button type="button" className="doc-btn doc-btn--small" onClick={() => onExport(item)}>
                  <Download size={14} aria-hidden="true" /> {v.exportDocx}
                </button>
                {item.id !== 'current' && (
                  <button type="button" className="doc-btn doc-btn--small" onClick={() => onRestore(item)}>
                    <RotateCcw size={14} aria-hidden="true" /> {v.restore}
                  </button>
                )}
              </div>
              {reading === item.id && <pre className="ver-full">{fullText(item)}</pre>}
            </li>
          ))}
        </ol>
      )}

      {comparison && (
        <section className="ver-compare" aria-live="polite">
          <h3 className="doc-modal-subtitle">
            {v.compare}: {name(comparison.a)} → {name(comparison.b)}
          </h3>
          <p className="doc-modal-note">{v.compareNote}</p>
          {comparison.fields.length === 0 ? (
            <p className="doc-modal-note">{v.noDiff}</p>
          ) : (
            <>
              <p className="ver-stats">{v.stats(comparison.stats)}</p>
              <p className="ver-legend">
                <ins>{v.added}</ins> <del>{v.removed}</del>
              </p>
              {comparison.fields.map((f) => (
                <div key={f.label} className="ver-field">
                  <h4>{f.label}</h4>
                  <Diff parts={f.parts} />
                </div>
              ))}
            </>
          )}
        </section>
      )}

      <footer className="doc-modal-actions">
        <button type="button" className="doc-btn" onClick={onClose}>
          {v.close}
        </button>
      </footer>
    </Modal>
  )
}
