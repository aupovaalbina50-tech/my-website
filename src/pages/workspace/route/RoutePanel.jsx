import { useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Download, FileText, Loader2, Printer, Route } from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { Modal } from '../../account/documents/Dialogs.jsx'
import './route.css'

// «Маршрут подготовки документа» in the editor: the nine stages with their
// real state, the next step, and for the chosen stage what it means and the
// action that leads to the tool. Nothing here is a decoration: every status
// comes from routeOf() (route/routeModel.js).

const fmt = (iso, lang) => (iso ? new Date(iso).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null)

function StageDetail({ stage, r, x, lang, onAction, saveState }) {
  const lines = []
  if (stage.at) lines.push(r.lastRun(fmt(stage.at, lang)))
  if (stage.count) lines.push(r.count(stage.count))
  if (stage.key === 'define') {
    if (stage.missing.length) lines.push(r.defineMissing(stage.missing.map((k) => r.fieldNames[k] ?? k).join(', ')))
    if (stage.optionalEmpty.length) lines.push(r.defineOptional(stage.optionalEmpty.map((k) => r.fieldNames[k] ?? k).join(', ')))
  }
  if (stage.key === 'draft') {
    if (stage.upload) {
      lines.push(r.fromFile(stage.upload.fileName))
      lines.push(stage.upload.unreadable == null ? r.ocrUnknown : stage.upload.unreadable || stage.upload.illegible ? r.ocrProblems(stage.upload.unreadable, stage.upload.illegible) : stage.upload.ocrPages ? r.ocrOk(stage.upload.ocrPages) : r.noOcr)
    }
    if (stage.aiUnconfirmed) lines.push(r.aiUnconfirmed(stage.aiUnconfirmed))
  }
  if (stage.key === 'structure') {
    lines.push(r.present(stage.present, stage.total))
    if (stage.missing.length) lines.push(r.missingRequired(stage.missing.length))
    if (stage.contradictions) lines.push(r.contradictions(stage.contradictions))
    lines.push(r.structureNote)
  }
  if (stage.key === 'language' && stage.status !== 'not_started') {
    lines.push(r.mandatory(stage.mandatory ?? 0, stage.recommendations ?? 0))
    if (stage.logic) lines.push(r.reportLogic)
  }
  if (stage.key === 'terminology') lines.push(r.termNote)
  if (stage.key === 'facts') {
    if (!stage.needed) lines.push(r.factsNotNeeded)
    else if (stage.references) lines.push(r.references(stage.references))
    if (stage.lookupFailed) lines.push(r.lookupFailed)
    lines.push(r.noArticles)
  }
  if (stage.key === 'remarks') {
    if (stage.clarifyMarked) lines.push(r.clarifyMarked(stage.clarifyMarked))
    if (stage.stale) lines.push(r.staleRemarks(stage.stale))
  }
  if (stage.key === 'final' && stage.version) lines.push(r.finalVersion(stage.version))
  if (stage.key === 'export' && stage.format) lines.push(r.exportedAs(stage.format))
  if (stage.status === 'recheck') lines.push(stage.reason && stage.reason !== 'changed' && stage.reason !== 'partial' ? r.recheckReason(x.errorCode(stage.reason)) : r.recheckChanged)
  if (stage.status === 'unavailable') lines.push(r.unavailableReason(x.errorCode(stage.reason)))
  const action = r.actions[stage.key]?.[stage.status] ?? r.actions[stage.key]?.default
  return (
    <div className={`rt-detail rt-detail--${stage.status}`}>
      <p className="rt-detail-title">
        <strong>{r.stages[stage.key].title}</strong> — <span className={`rt-badge rt-badge--${stage.status}`}>{r.status[stage.status]}</span>
      </p>
      <p className="rt-detail-text">{r.stages[stage.key].text}</p>
      {lines.length > 0 && (
        <ul className="rt-detail-lines">
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
      {action && stage.status !== 'running' && stage.status !== 'unavailable' && (
        <button type="button" className="doc-btn doc-btn--primary doc-btn--small" onClick={() => onAction(stage)}>
          {action} <ArrowRight size={14} aria-hidden="true" />
        </button>
      )}
      <p className="rt-saved">{saveState === 'saved' ? r.progressSaved : r.progressNotSaved}</p>
    </div>
  )
}

export function RoutePanel({ route, saveState, onAction }) {
  const { lang: uiLang, t } = useLanguage()
  const lang = uiLang === 'kk' ? 'kk' : 'ru'
  const r = t.workspace.route
  const x = t.workspace.expertise
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState(null)
  const visible = route.stages
  const current = visible.find((s) => s.key === chosen) ?? route.next ?? visible.at(-1)
  return (
    <section className="rt" aria-label={r.title}>
      <div className="rt-head">
        <p className="rt-title">
          <Route size={17} aria-hidden="true" /> {r.title}
        </p>
        <p className={`rt-summary${route.complete ? ' is-complete' : ''}`}>
          {route.complete ? (
            <>
              <CheckCircle2 size={15} aria-hidden="true" /> {r.complete}
            </>
          ) : route.next ? (
            <>
              {r.next}: <strong>{r.stages[route.next.key].title}</strong> — {r.status[route.next.status]}
            </>
          ) : null}
        </p>
        <button type="button" className="exp-link" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />} {open ? r.hide : r.show}
        </button>
      </div>
      <ol className="rt-steps">
        {visible.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              className={`rt-step rt-step--${s.status}${current?.key === s.key ? ' is-on' : ''}${s.key === 'facts' && !s.needed ? ' is-optional' : ''}`}
              onClick={() => {
                setChosen(s.key)
                setOpen(true)
              }}
              title={`${r.stages[s.key].title}: ${r.status[s.status]}`}
            >
              <span className="rt-step-n">{s.status === 'running' ? <Loader2 size={12} className="doc-spin" aria-hidden="true" /> : i + 1}</span>
              <span className="rt-step-label">{r.stages[s.key].short}</span>
              {s.count > 0 && <span className="rt-step-count">{s.count}</span>}
            </button>
          </li>
        ))}
      </ol>
      {open && current && <StageDetail stage={current} r={r} x={x} lang={lang} onAction={onAction} saveState={saveState} />}
      {route.complete && route.limits.length > 0 && open && (
        <ul className="rt-limits">
          {route.limits.map((l, i) => (
            <li key={i}>{r.limits[l.reason] ?? r.limits.default(r.stages[l.stage].title, x.errorCode(l.reason))}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Before the export: what was checked, what is left, what is out of date. Never blocks for a style remark. */
export function ExportSummaryDialog({ summary, route, format, onExport, onClose }) {
  const { t } = useLanguage()
  const r = t.workspace.route
  const x = t.workspace.expertise
  const names = (keys) => keys.map((k) => r.stages[k].title).join(', ')
  return (
    <Modal title={r.exportTitle} onClose={onClose}>
      <div className="rt-export">
        <p className={summary.ready ? 'rt-ok' : 'rt-warn'}>
          {summary.ready ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />} {summary.ready ? r.readyYes : r.readyNo}
        </p>
        <dl className="rt-export-list">
          <dt>{r.sumDone}</dt>
          <dd>{summary.done.length ? names(summary.done) : r.none}</dd>
          <dt>{r.sumNotStarted}</dt>
          <dd>{summary.notStarted.length ? names(summary.notStarted) : r.none}</dd>
          <dt>{r.sumOutdated}</dt>
          <dd>{summary.outdated.length ? names(summary.outdated) : r.none}</dd>
          <dt>{r.sumUnavailable}</dt>
          <dd>{summary.unavailable.length ? names(summary.unavailable) : r.none}</dd>
          <dt>{r.sumRemaining}</dt>
          <dd>{['high', 'medium', 'low', 'info'].map((p) => `${x.qc.priorities[p]}: ${summary.remaining[p]}`).join(' · ')}</dd>
          <dt>{r.sumClarify}</dt>
          <dd>{summary.clarify}</dd>
        </dl>
        {route.limits.length > 0 && (
          <ul className="rt-limits">
            {route.limits.map((l, i) => (
              <li key={i}>{r.limits[l.reason] ?? r.limits.default(r.stages[l.stage].title, x.errorCode(l.reason))}</li>
            ))}
          </ul>
        )}
        <p className="rt-note">{r.exportNote}</p>
        <div className="doc-modal-actions">
          <button type="button" className="doc-btn" onClick={onClose}>
            {r.cancel}
          </button>
          {(format ? [format] : ['docx', 'pdf', 'print']).map((f) => (
            <button key={f} type="button" className="doc-btn doc-btn--primary" onClick={() => onExport(f)}>
              {f === 'print' ? <Printer size={15} aria-hidden="true" /> : f === 'copy' ? <FileText size={15} aria-hidden="true" /> : <Download size={15} aria-hidden="true" />} {r.exportAs[f]}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}
