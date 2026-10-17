import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, CheckCircle2, ClipboardCopy, Crosshair, FileText, Loader2, Printer, Save, Sparkles, Wand2 } from 'lucide-react'
import DocumentPreview from '../../account/documents/DocumentPreview.jsx'
import { Modal } from '../../account/documents/Dialogs.jsx'
import { fieldOrigin, INLINE_TYPES, narrativeFields, protectedFields, questions, readFlow, STAGES, unconfirmed } from './flow.js'
import './wizard.css'

// Steps of the constructor inside the document editor. Each panel works on
// the same document as the form on the left; nothing here keeps its own copy.

/** 1 Тип · 2 Способ (done in the catalog) · 3–8 here; every step can be reopened. */
export function WizardSteps({ stage, onStage, w, templateTitle, method, onChangeType, counts }) {
  return (
    <nav className="wz-steps" aria-label={w.stepsAria}>
      <button type="button" className="wz-step is-done" onClick={onChangeType} title={w.changeType}>
        <span className="wz-step-n">1</span>
        <span className="wz-step-label">
          {w.stage.type}
          <small>{templateTitle}</small>
        </span>
      </button>
      <span className="wz-step is-done is-static">
        <span className="wz-step-n">2</span>
        <span className="wz-step-label">
          {w.stage.method}
          <small>{w.method[method]}</small>
        </span>
      </span>
      {STAGES.map((s, i) => (
        <button key={s} type="button" className={`wz-step${stage === s ? ' is-on' : ''}`} aria-current={stage === s ? 'step' : undefined} onClick={() => onStage(s)}>
          <span className="wz-step-n">{i + 3}</span>
          <span className="wz-step-label">
            {w.stage[s]}
            {counts[s] ? <small>{counts[s]}</small> : null}
          </span>
        </button>
      ))}
    </nav>
  )
}

/** 3. «Сведения»: the form on the left, or the user's own description here. */
export function InfoPanel({ template, values, w, readOnly, onMethod, onBrief, onExtract }) {
  const flow = readFlow(values)
  const fromText = unconfirmed(template, values)
  const required = questions(template, values)
  return (
    <div className="wz-panel">
      <div className="wz-method" role="group" aria-label={w.methodAria}>
        {['form', 'text'].map((m) => (
          <button key={m} type="button" className={flow.method === m ? 'is-on' : undefined} onClick={() => onMethod(m)} disabled={readOnly}>
            {w.method[m]}
          </button>
        ))}
      </div>
      {flow.method === 'form' ? (
        <p className="wz-note">{w.formHint}</p>
      ) : (
        <>
          <label className="wz-field">
            <span>{w.briefLabel}</span>
            <textarea className="doc-input" rows={9} value={flow.brief} onChange={(e) => onBrief(e.target.value)} placeholder={w.briefPlaceholder} maxLength={8000} readOnly={readOnly} />
          </label>
          <p className="wz-note">{w.briefKept}</p>
          <button type="button" className="doc-btn doc-btn--accent" onClick={onExtract} disabled={readOnly || flow.brief.trim().length < 10}>
            <Sparkles size={16} aria-hidden="true" /> {w.extract}
          </button>
        </>
      )}
      <p className="wz-progress">
        {required.length ? w.requiredLeft(required.length) : w.requiredDone}
        {fromText.length > 0 && ` · ${w.toConfirm(fromText.length)}`}
      </p>
    </div>
  )
}

function Answer({ field, lang, onAnswer }) {
  const [value, setValue] = useState('')
  const type = field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : field.type === 'number' ? 'number' : 'text'
  return (
    <form
      className="wz-answer"
      onSubmit={(e) => {
        e.preventDefault()
        if (value.trim()) onAnswer(field, value.trim())
      }}
    >
      {field.type === 'textarea' ? (
        <textarea className="doc-input" rows={2} value={value} onChange={(e) => setValue(e.target.value)} aria-label={field.label[lang]} />
      ) : (
        <input className="doc-input" type={type} value={value} onChange={(e) => setValue(e.target.value)} aria-label={field.label[lang]} />
      )}
      <button type="submit" className="doc-btn doc-btn--small" disabled={!value.trim()}>
        <Check size={14} aria-hidden="true" />
      </button>
    </form>
  )
}

/** 4. «Полнота»: questions for what is missing, values from the description to check. */
export function CompletePanel({ template, values, w, lang, readOnly, onAnswer, onGoTo, onConfirm }) {
  const ask = questions(template, values)
  const check = unconfirmed(template, values)
  const quotes = readFlow(values).fromText ?? {}
  const narrative = new Set(narrativeFields(template).map((f) => f.key))
  return (
    <div className="wz-panel">
      {!ask.length && !check.length && (
        <p className="wz-ok">
          <CheckCircle2 size={18} aria-hidden="true" /> {w.complete}
        </p>
      )}
      {ask.length > 0 && (
        <section className="wz-block">
          <h3>{w.questionsTitle}</h3>
          <p className="wz-note">{narrative.size ? w.questionsNoteDraft : w.questionsNote}</p>
          <ol className="wz-list">
            {ask.map((f) => (
              <li key={f.key} className="wz-question">
                <p className="wz-q">{w.question(f.label[lang])}</p>
                {f.hint?.[lang] && <p className="wz-hint">{f.hint[lang]}</p>}
                <div className="wz-row">
                  {!readOnly && INLINE_TYPES.has(f.type) && <Answer field={f} lang={lang} onAnswer={onAnswer} />}
                  <button type="button" className="doc-btn doc-btn--small" onClick={() => onGoTo(f.key)}>
                    <Crosshair size={14} aria-hidden="true" /> {w.goToField}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
      {check.length > 0 && (
        <section className="wz-block">
          <h3>{w.fromTextTitle}</h3>
          <p className="wz-note">{w.fromTextNote}</p>
          <ul className="wz-list">
            {check.map((f) => (
              <li key={f.key} className="wz-question">
                <p className="wz-q">{f.label[lang]}</p>
                <p className="wz-hint">
                  {w.quote}: «{quotes[f.key]}»
                </p>
                <div className="wz-row">
                  {!readOnly && (
                    <button type="button" className="doc-btn doc-btn--small doc-btn--primary" onClick={() => onConfirm(f.key)}>
                      <Check size={14} aria-hidden="true" /> {w.confirm}
                    </button>
                  )}
                  <button type="button" className="doc-btn doc-btn--small" onClick={() => onGoTo(f.key)}>
                    <Crosshair size={14} aria-hidden="true" /> {w.fix}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** 5. «Проект»: the AI writes the narrative fields; the user's own text is never replaced silently. */
export function DraftPanel({ template, values, w, lang, readOnly, busy, outcome, basisChanged, onCompose, onSaveVersion, onGoTo }) {
  const [confirm, setConfirm] = useState(null) // fields the user wrote or changed
  const fields = narrativeFields(template)
  const missing = questions(template, values)
  const flow = readFlow(values)
  const generatedBefore = Object.keys(flow.gen ?? {}).length > 0

  if (!fields.length) return <p className="wz-note">{w.noNarrative}</p>

  const start = () => {
    const keep = protectedFields(template, values)
    if (keep.length) setConfirm(keep)
    else onCompose({ replace: [] })
  }

  return (
    <div className="wz-panel">
      <p className="wz-note">{w.draftLead}</p>
      {missing.length > 0 && (
        <p className="wz-warn">
          <AlertTriangle size={15} aria-hidden="true" /> {w.draftMissing(missing.length)}
        </p>
      )}
      {basisChanged && generatedBefore && (
        <p className="wz-warn">
          <AlertTriangle size={15} aria-hidden="true" /> {w.basisChanged}
        </p>
      )}
      <ul className="wz-list">
        {fields.map((f) => {
          const origin = fieldOrigin(f.key, values)
          const out = outcome?.[f.key]
          return (
            <li key={f.key} className="wz-question">
              <p className="wz-q">
                {f.label[lang]} <span className={`wz-origin wz-origin--${origin}`}>{w.origin[origin]}</span>
              </p>
              {out && out.status !== 'ok' && (
                <p className="wz-warn">
                  {out.status === 'rejected' ? w.rejected(out.inventedNumbers.join(', ')) : out.status === 'kept' ? w.kept : w.insufficient}
                  {out.missing && ` ${w.missingInfo}: ${out.missing}`}
                </p>
              )}
              {out?.unknownNames?.length > 0 && <p className="wz-warn">{w.unknownNames(out.unknownNames.join(', '))}</p>}
              <button type="button" className="exp-link" onClick={() => onGoTo(f.key)}>
                {w.goToField}
              </button>
            </li>
          )
        })}
      </ul>
      {!readOnly && (
        <button type="button" className="doc-btn doc-btn--accent" onClick={start} disabled={busy}>
          {busy ? <Loader2 size={16} className="doc-spin" aria-hidden="true" /> : <Wand2 size={16} aria-hidden="true" />}
          {busy ? w.composing : generatedBefore ? w.recompose : w.compose}
        </button>
      )}
      <p className="wz-note">{w.draftRule}</p>

      {/* Rendered at the page root: the side panel scrolls and must not clip it. */}
      {confirm &&
        createPortal(
        <Modal title={w.conflictTitle} onClose={() => setConfirm(null)}>
          <p className="doc-modal-lead">{w.conflictLead}</p>
          <ul className="wz-conflicts">
            {confirm.map((f) => (
              <li key={f.key}>
                {f.label[lang]} — {w.origin[fieldOrigin(f.key, values)]}
              </li>
            ))}
          </ul>
          <footer className="doc-modal-actions wz-conflict-actions">
            <button type="button" className="doc-btn" onClick={() => setConfirm(null)}>
              {w.cancel}
            </button>
            <button
              type="button"
              className="doc-btn"
              onClick={() => {
                setConfirm(null)
                onCompose({ replace: [] })
              }}
            >
              {w.keepMine}
            </button>
            <button
              type="button"
              className="doc-btn doc-btn--primary"
              onClick={async () => {
                const keys = confirm.map((f) => f.key)
                setConfirm(null)
                if (await onSaveVersion()) onCompose({ replace: keys })
              }}
            >
              <Save size={15} aria-hidden="true" /> {w.saveAndReplace}
            </button>
          </footer>
        </Modal>,
          document.body,
        )}
    </div>
  )
}

/** 8. «Экспорт»: the current text — saved first, with what is still missing. */
export function ExportPanel({ template, values, rendered, docLang, w, lang, saving, onExport, onGoTo }) {
  const missing = questions(template, values)
  return (
    <div className="wz-panel">
      {missing.length > 0 ? (
        <div className="wz-warn wz-warn--block">
          <p>
            <AlertTriangle size={15} aria-hidden="true" /> {w.exportMissing(missing.length)}
          </p>
          <ul>
            {missing.map((f) => (
              <li key={f.key}>
                <button type="button" className="exp-link" onClick={() => onGoTo(f.key)}>
                  {f.label[lang]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="wz-ok">
          <CheckCircle2 size={18} aria-hidden="true" /> {w.exportReady}
        </p>
      )}
      <p className="wz-note">{w.exportNote}</p>
      <div className="wz-row">
        <button type="button" className="doc-btn doc-btn--primary" onClick={() => onExport('docx')} disabled={saving}>
          <FileText size={15} aria-hidden="true" /> DOCX
        </button>
        <button type="button" className="doc-btn" onClick={() => onExport('pdf')} disabled={saving}>
          <FileText size={15} aria-hidden="true" /> PDF
        </button>
        <button type="button" className="doc-btn" onClick={() => onExport('print')} disabled={saving}>
          <Printer size={15} aria-hidden="true" /> {w.print}
        </button>
        <button type="button" className="doc-btn" onClick={() => onExport('copy')} disabled={saving}>
          <ClipboardCopy size={15} aria-hidden="true" /> {w.copy}
        </button>
      </div>
      <p className="wz-note">{w.exportDisclaimer}</p>
      <div className="wz-preview">{rendered && <DocumentPreview doc={rendered} lang={docLang} />}</div>
    </div>
  )
}
