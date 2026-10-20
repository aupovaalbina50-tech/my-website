import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Loader2, Upload } from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { loadDocument } from '../../account/documents/useDocuments.js'
import { createUploadedDocument, documentPlainText, markDocumentChecked } from '../../workspace/documentModel.js'
import { useFavoriteTerms } from '../../account/useFavoriteTerms.js'
import { InspectorError } from './inspectorClient.js'
import { detectKind } from './extract.js'
import { categoryOf, chosenFix, decisionRecord, runInspection } from './pipeline.js'
import { buildCorrectedFiles, buildReportDocx, downloadBlob, textToDocxFile } from './writers.js'
import DocPreview from './DocPreview.jsx'
import { ChangesCompare, FixDialog } from './FixDialog.jsx'
import { CheckNotes, FilterBar, FinalConclusion, FindingCard, HistoryList, OkRow, StageNav, StatList } from './ExpertiseView.jsx'
import { fixableResults, summarize } from './expertise.js'
import { CATEGORY_ICON, documentTypeLabel, locationLabel } from './helpers.js'
import { fromSnapshot, useInspectionHistory } from './useInspectionHistory.js'
import './inspector.css'

// «Цифровой инспектор терминологии»: a real terminology check of a PDF / DOCX
// / photo / pasted text against the site's base of official terms, in three
// stages:
//   1 upload  — choose a file (checked by its content), see it, go on;
//   2 expertise — extraction, OCR, base + AI analysis with real progress;
//   3 correction and conclusion — document and findings side by side,
//     confirmed fixes, corrected file, final conclusion, downloads.
// Going back to an earlier stage keeps the file and the results; only
// replacing or removing the file clears what belonged to it.
// Checks of a signed-in user are kept in «История экспертиз».

const ACCEPT = '.pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png'
// A pasted text is for a quick check; longer texts belong in a file.
const MAX_PASTE_CHARS = 20000

const STAGE_OF_SCREEN = { upload: 1, processing: 2, analyzed: 2, error: 2, review: 3, done: 3 }

function formatLabel(kind, file) {
  if (kind === 'pdf') return 'PDF'
  if (kind === 'docx') return 'DOCX'
  const sub = (file.type.split('/')[1] || 'image').toUpperCase()
  return sub === 'JPEG' ? 'JPG' : sub
}

function formatSize(bytes) {
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} КБ`
  return `${(kb / 1024).toFixed(1).replace('.', ',')} МБ`
}

/** «Сфотографировать» is offered only where a camera capture input makes sense. */
const canCapture = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches

function errorMessage(error, ti, tw) {
  if (error.code === 'document_not_found') return tw.documentNotFound
  if (error.code === 'document_empty') return tw.documentEmpty
  return ti.errors[error.code] || ti.errors.internal_error
}

// ---- Stage 1: upload -------------------------------------------------------------

function FileCard({ source, inspection, onReplace, onRemove, ti }) {
  const status = inspection ? ti.fileChecked : ti.fileReady
  const format = source.kind === 'history' ? ti.fileFromHistory : source.kind === 'document' ? ti.fileFromDocument : source.format
  return (
    <div className="insp-file">
      <FileText className="insp-file-icon" size={24} strokeWidth={1.6} aria-hidden="true" />
      <div className="insp-file-main">
        <p className="insp-file-name">{source.name}</p>
        <dl className="insp-file-meta">
          {format && (
            <div>
              <dt>{ti.fileFormat}</dt>
              <dd>{format}</dd>
            </div>
          )}
          {source.size != null && (
            <div>
              <dt>{ti.fileSize}</dt>
              <dd>{formatSize(source.size)}</dd>
            </div>
          )}
          {inspection?.doc.totalPages ? (
            <div>
              <dt>{ti.filePages}</dt>
              <dd>{inspection.doc.totalPages}</dd>
            </div>
          ) : null}
          <div>
            <dt>{ti.fileStatus}</dt>
            <dd className={inspection ? 'insp-ok-text' : undefined}>{status}</dd>
          </div>
        </dl>
      </div>
      <div className="insp-file-actions">
        {onReplace && (
          <button type="button" className="insp-text-btn" onClick={onReplace}>
            {ti.replaceFile}
          </button>
        )}
        <button type="button" className="insp-text-btn insp-text-btn--muted" onClick={onRemove}>
          {ti.removeFile}
        </button>
      </div>
    </div>
  )
}

function UploadStage({ source, inspection, pickError, onPick, onPaste, onRemove, onStart, onOpenResults, onRecheck, history, onOpenHistory, ti, tw, lang }) {
  const [dragging, setDragging] = useState(false)
  const [pasted, setPasted] = useState('')
  const fileInputRef = useRef(null)
  const photoInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const [capture] = useState(canCapture)

  const pick = (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again later
    if (file) onPick(file)
  }

  return (
    <div className="insp-stage-area">
      <section className="insp-card" aria-labelledby="insp-upload-title">
        <h3 className="insp-card-title" id="insp-upload-title">
          {ti.uploadTitle}
        </h3>
        <p className="insp-card-lead">{ti.uploadLead}</p>

        <div className="insp-how">
          <p className="insp-section-label">{ti.howShort}</p>
          <ol>
            {ti.howSteps.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong> — {step.text}
              </li>
            ))}
          </ol>
          <p className="insp-how-note">
            <strong>{ti.importantLabel}</strong> {ti.importantText}
          </p>
        </div>

        <div
          className={`insp-dropzone${dragging ? ' is-dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const file = event.dataTransfer.files?.[0]
            if (file) onPick(file)
          }}
        >
          <FileText className="insp-dropzone-icon" size={40} strokeWidth={1.3} aria-hidden="true" />
          <p className="insp-dropzone-title">{ti.dropTitle}</p>
          <p className="insp-dropzone-sub">{ti.dropSub}</p>
          <div className="insp-dropzone-buttons">
            <button type="button" className="insp-btn insp-btn--primary" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} aria-hidden="true" />
              {ti.chooseFileBtn}
            </button>
            <button type="button" className="insp-btn" onClick={() => photoInputRef.current?.click()}>
              {ti.uploadPhoto}
            </button>
            {/* capture="environment" opens the rear camera on phones. */}
            {capture && (
              <button type="button" className="insp-btn" onClick={() => cameraInputRef.current?.click()}>
                {ti.takePhoto}
              </button>
            )}
          </div>
          <p className="insp-dropzone-limits">{ti.facts.map((fact) => `${fact.label}: ${fact.value}`).join(' · ')}</p>
          <input ref={fileInputRef} type="file" accept={ACCEPT} hidden onChange={pick} />
          <input ref={photoInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={pick} />
          <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png" capture="environment" hidden onChange={pick} />
        </div>
        <p className="insp-muted insp-small">{ti.photoHint}</p>

        {pickError && (
          <p className="insp-alert" role="alert">
            {errorMessage({ code: pickError }, ti, tw)}
          </p>
        )}

        {source && (
          <FileCard
            source={source}
            inspection={inspection}
            onReplace={source.kind === 'document' ? null : () => fileInputRef.current?.click()}
            onRemove={onRemove}
            ti={ti}
          />
        )}

        <div className="insp-card-footer">
          {inspection ? (
            <>
              <button type="button" className="insp-btn insp-btn--primary" onClick={onOpenResults}>
                {ti.openResults}
              </button>
              {onRecheck && (
                <button type="button" className="insp-btn" onClick={onRecheck}>
                  {ti.recheck}
                </button>
              )}
            </>
          ) : (
            <button type="button" className="insp-btn insp-btn--primary" onClick={onStart} disabled={!source?.file}>
              {ti.goToExpertise}
            </button>
          )}
        </div>
      </section>

      <section className="insp-card insp-card--quiet" aria-labelledby="insp-paste-title">
        <h3 className="insp-card-title" id="insp-paste-title">
          {ti.pasteHeading}
        </h3>
        <textarea
          aria-labelledby="insp-paste-title"
          className="insp-paste"
          value={pasted}
          onChange={(event) => setPasted(event.target.value.slice(0, MAX_PASTE_CHARS))}
          placeholder={ti.pastePlaceholder}
          rows={5}
        />
        <div className="insp-paste-footer">
          <span className="insp-muted insp-small">
            {pasted.length.toLocaleString()} / {MAX_PASTE_CHARS.toLocaleString()}
          </span>
          <button type="button" className="insp-btn" onClick={() => onPaste(pasted.trim())} disabled={!pasted.trim()}>
            {ti.pasteCheck}
          </button>
        </div>
      </section>

      <HistoryList history={history} onOpen={onOpenHistory} ti={ti} lang={lang} />
    </div>
  )
}

// ---- Stage 2: expertise ------------------------------------------------------------

const STAGE_ORDER = ['read', 'ocr', 'analyze', 'lookup']

/** Real progress: each step is done / running / waiting as it happens. */
function ProcessingView({ progress, sawOcr, onCancel, ti }) {
  const current = STAGE_ORDER.indexOf(progress.stage)
  const steps = [
    { stage: 'read', label: ti.stepRead },
    ...(sawOcr ? [{ stage: 'ocr', label: ti.stepOcr, detail: progress.stage === 'ocr' && ti.stepOcrProgress(progress.current, progress.total) }] : []),
    { stage: 'analyze', label: ti.stepAnalyze, detail: progress.stage === 'analyze' && ti.stepAnalyzeProgress(progress.current, progress.total) },
    // Only shown once it actually runs (phrases with no match in the base).
    ...(progress.stage === 'lookup' ? [{ stage: 'lookup', label: ti.stepLookup, detail: ti.stepAnalyzeProgress(progress.current, progress.total) }] : []),
  ]
  const running = steps.find((step) => step.stage === progress.stage) ?? steps[0]
  return (
    <div className="insp-processing" role="status" aria-live="polite">
      <p className="insp-current">
        <Loader2 size={20} className="insp-spin" aria-hidden="true" />
        <span>
          <span className="insp-current-label">{ti.currentAction}: </span>
          {running.label}
          {running.detail && ` — ${running.detail}`}
        </span>
      </p>
      <ol className="insp-progress">
        {steps.map((step) => {
          const index = STAGE_ORDER.indexOf(step.stage)
          const state = index < current ? 'done' : index === current ? 'active' : 'waiting'
          return (
            <li key={step.stage} className={`is-${state}`}>
              {step.label}
            </li>
          )
        })}
      </ol>
      <p className="insp-muted insp-small">{ti.processingNote}</p>
      <div className="insp-card-footer">
        <button type="button" className="insp-btn" onClick={onCancel}>
          <ArrowLeft size={15} aria-hidden="true" />
          {ti.cancelAndBack}
        </button>
      </div>
    </div>
  )
}

function AnalysisStage({ screen, name, progress, sawOcr, inspection, error, onCancel, onBack, onResults, onRetry, ti, tw }) {
  const summary = useMemo(() => (inspection ? summarize(inspection.results) : null), [inspection])
  const status = { processing: ti.statusProcessing, analyzed: ti.statusDone, error: ti.statusFailed }[screen]
  return (
    <section className="insp-card" aria-labelledby="insp-analysis-title">
      <div className="insp-card-head">
        <div>
          <p className="insp-eyebrow">{ti.analysisTitle}</p>
          <h3 className="insp-card-title" id="insp-analysis-title">
            {name}
          </h3>
          {inspection?.doc.totalPages ? (
            <p className="insp-card-meta">
              {ti.metaPages}: {inspection.doc.totalPages}
            </p>
          ) : null}
        </div>
        <span className={`insp-run-status insp-run-status--${screen}`}>{status}</span>
      </div>

      {screen === 'processing' && <ProcessingView progress={progress} sawOcr={sawOcr} onCancel={onCancel} ti={ti} />}

      {screen === 'analyzed' && inspection && (
        <>
          <p className="insp-state insp-state--ok">{ti.analysisDoneTitle}</p>
          <p className="insp-card-lead">{ti.analysisDoneLead}</p>
          <StatList summary={summary} ti={ti} />
          <CheckNotes inspection={inspection} ti={ti} />
          <div className="insp-card-footer">
            <button type="button" className="insp-btn insp-btn--primary" onClick={onResults}>
              {ti.goToResults}
            </button>
            <button type="button" className="insp-btn" onClick={onBack}>
              <ArrowLeft size={15} aria-hidden="true" />
              {ti.backToUpload}
            </button>
          </div>
        </>
      )}

      {screen === 'error' && error && (
        <div role="alert">
          <p className="insp-state insp-state--error">{ti.analysisFailedTitle}</p>
          <p className="insp-error-text">{errorMessage(error, ti, tw)}</p>
          {error.code === 'rate_limited' && <p className="insp-muted">{ti.rateLimitHint}</p>}
          <div className="insp-card-footer">
            {onRetry && (
              <button type="button" className="insp-btn insp-btn--primary" onClick={onRetry}>
                {ti.retry}
              </button>
            )}
            {inspection ? (
              <button type="button" className="insp-btn" onClick={onResults}>
                {ti.backToResults}
              </button>
            ) : null}
            <button type="button" className="insp-btn" onClick={onBack}>
              <ArrowLeft size={15} aria-hidden="true" />
              {ti.backToUpload}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

// ---- Stage 3: correction and conclusion ---------------------------------------------

/**
 * The document of «Работа с документами» a check belongs to: back to its
 * editor, or check its current text again. Shown only when there is one.
 */
function DocumentBar({ inspection, notice, onRecheck, tw }) {
  if (!inspection.documentId && !notice) return null
  return (
    <div className="inspector-document-bar">
      {notice && <p className={`inspector-document-note${notice === 'notSavedAsDocument' ? ' is-warning' : ''}`}>{tw[notice]}</p>}
      {inspection.documentId && (
        <div className="inspector-document-actions">
          <Link to={`/account/documents/${inspection.documentId}`} className="insp-btn insp-btn--primary">
            {tw.continueEditing}
          </Link>
          <button type="button" className="insp-btn" onClick={() => onRecheck(inspection.documentId)}>
            {tw.recheck}
          </button>
        </div>
      )}
    </div>
  )
}

function appliedCount(output) {
  if (!output) return null
  return [...output.status.values()].filter((s) => s === 'applied' || s === 'text_only').length
}

function ReviewScreen({ inspection, output, decisions, setDecisions, choices, setChoices, onOpenFixes, onOpenFixed, onReport, onRecords, onReset, ti, lang }) {
  const { favoriteIds, toggleFavorite } = useFavoriteTerms()
  const { results, doc } = inspection
  const summary = useMemo(() => summarize(results), [results])
  const [filter, setFilter] = useState(summary.issues ? 'all' : 'ok')
  const [selectedId, setSelectedId] = useState(null)
  const [expanded, setExpanded] = useState(() => new Set())
  const [pageNumber, setPageNumber] = useState(doc.pages[0].number)
  const previewRef = useRef(null)
  const locate = useCallback((r) => locationLabel(inspection, r, ti), [inspection, ti])

  const selected = results.find((r) => r.id === selectedId) ?? null
  // The filter applies to the list and to the highlights in the document.
  const visible = useMemo(() => (filter === 'all' ? results : results.filter((r) => categoryOf(r) === filter)), [results, filter])
  const issues = visible.filter((r) => r.status !== 'ok')
  const okRows = visible.filter((r) => r.status === 'ok')
  // Findings are numbered in document order, the same in every filter.
  const numbers = useMemo(() => new Map(results.filter((r) => r.status !== 'ok').map((r, i) => [r.id, i + 1])), [results])
  const fixable = fixableResults(results).length
  const type = documentTypeLabel(inspection.documentType, ti)
  const date = inspection.checkedAt ? new Date(inspection.checkedAt).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU') : null
  const meta = [
    type && `${ti.metaType}: ${type}`,
    date,
    doc.totalPages ? `${ti.metaPages}: ${doc.totalPages}` : null,
    `${ti.metaTerms}: ${summary.total}`,
  ].filter(Boolean)

  const show = (result) => {
    setSelectedId(result.id)
    setPageNumber(result.page)
    // On narrow screens the preview is above the list — bring it into view.
    if (window.matchMedia('(max-width: 960px)').matches) previewRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  const details = (result) => {
    if (filter !== 'all' && categoryOf(result) !== filter) setFilter('all')
    setSelectedId(result.id)
    setExpanded((prev) => new Set(prev).add(result.id))
    // The card renders expanded first; then scroll the list to it.
    requestAnimationFrame(() => document.getElementById(`finding-${result.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  }
  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const decide = (id, value) => setDecisions((prev) => ({ ...prev, [id]: value }))
  const choose = (id, index) => {
    setChoices((prev) => ({ ...prev, [id]: index }))
    if (index !== null) decide(id, null) // choosing a variant undoes «Отклонить»
  }

  return (
    <div className="insp-stage-area">
      <section className="insp-card" aria-labelledby="insp-results-title">
        <div className="insp-card-head">
          <div>
            <p className="insp-eyebrow">{ti.resultsTitle}</p>
            <h3 className="insp-card-title" id="insp-results-title">
              {inspection.fileName}
            </h3>
            <p className="insp-card-meta">{meta.join(' · ')}</p>
          </div>
        </div>

        <div className="insp-actions">
          {fixable > 0 ? (
            <button type="button" className="insp-btn insp-btn--primary" onClick={onOpenFixes}>
              {ti.fixConfirmed} ({fixable})
            </button>
          ) : (
            <p className={`insp-state ${summary.toFix ? 'insp-state--note' : 'insp-state--ok'}`}>{summary.toFix ? ti.manualOnly : ti.noErrorsState}</p>
          )}
          <span className="insp-actions-secondary">
            <button type="button" className="insp-btn insp-btn--small" onClick={onReport}>
              <Download size={14} aria-hidden="true" />
              {ti.downloadReport}
            </button>
            <button type="button" className="insp-btn insp-btn--small" onClick={onRecords}>
              <Download size={14} aria-hidden="true" />
              {ti.downloadRecords}
            </button>
            <button type="button" className="insp-btn insp-btn--small" onClick={onReset}>
              {ti.checkAnother}
            </button>
          </span>
        </div>
        {fixable > 0 && <p className="insp-muted insp-small">{ti.fixAllHint}</p>}
        {output && (
          <p className="insp-banner">
            {ti.fixedBanner(appliedCount(output))}{' '}
            <button type="button" className="insp-text-btn" onClick={onOpenFixed}>
              {ti.openFixed}
            </button>
          </p>
        )}
        <CheckNotes inspection={inspection} ti={ti} />
      </section>

      <FilterBar filter={filter} onChange={setFilter} summary={summary} ti={ti} />

      <div className="insp-split">
        <div className="insp-split-doc" ref={previewRef}>
          <DocPreview
            doc={doc}
            pageNumber={pageNumber}
            onPageChange={setPageNumber}
            results={visible}
            selected={selected}
            onSelect={(r) => setSelectedId(r.id)}
            onDetails={details}
            ti={ti}
          />
        </div>

        <div className="insp-split-results">
          <p className="insp-results-count">
            {filter === 'all' ? ti.issuesTitle(summary.issues) : `${ti.filterLabels[filter]} — ${visible.length}`}
          </p>
          {visible.length === 0 ? (
            <p className="insp-empty">{filter === 'all' ? ti.categoryEmpty.ok : ti.categoryEmpty[filter]}</p>
          ) : (
            <ol className="insp-findings">
              {issues.map((result) => (
                <FindingCard
                  key={result.id}
                  result={result}
                  number={numbers.get(result.id)}
                  location={locate(result)}
                  decision={decisions[result.id] ?? null}
                  choice={choices[result.id]}
                  onChoose={choose}
                  onDecision={decide}
                  onShow={show}
                  selected={result.id === selectedId}
                  expanded={expanded.has(result.id)}
                  onToggle={toggle}
                  favoriteIds={favoriteIds}
                  onAddToDictionary={(term) => !favoriteIds.has(term.id) && toggleFavorite(term)}
                  ti={ti}
                  lang={lang}
                />
              ))}
              {okRows.length > 0 && filter === 'all' && <li className="insp-findings-divider">{ti.okDivider(okRows.length)}</li>}
              {okRows.map((result) => (
                <OkRow key={result.id} result={result} location={locate(result)} selected={result.id === selectedId} onShow={show} ti={ti} />
              ))}
            </ol>
          )}
        </div>
      </div>

      <FinalConclusion inspection={inspection} summary={summary} fixed={appliedCount(output)} ti={ti} lang={lang} />
    </div>
  )
}

function FixedScreen({ inspection, output, decisions, choices, onReport, onRecords, onBack, onReset, locate, ti }) {
  const values = [...output.status.values()]
  const textOnly = values.filter((s) => s === 'text_only').length
  const failed = values.filter((s) => s === 'failed').length
  const kind = inspection.doc.kind
  const primary = output.files.find((f) => f.key !== 'text') ?? output.files[0]
  const textVersion = output.files.find((f) => f.key === 'text' && f !== primary)
  const formattingNote = { docx: ti.formattingNoteDocx, pdf: ti.formattingNotePdf, image: ti.formattingNoteImage, saved: ti.formattingNoteSaved }[kind]

  return (
    <div className="insp-stage-area">
      <section className="insp-card" aria-labelledby="insp-fixed-title">
        <div className="insp-card-head">
          <div>
            <p className="insp-eyebrow">{ti.fixedDocTitle}</p>
            <h3 className="insp-card-title" id="insp-fixed-title">
              {inspection.fileName}
            </h3>
          </div>
        </div>
        <p className="insp-state insp-state--ok">
          {ti.fixedCount}: {appliedCount(output)}
        </p>
        <p className="insp-muted">{formattingNote}</p>
        {textOnly > 0 && kind === 'pdf' && <p className="insp-card-note insp-card-note--warning">{ti.textOnlyNote(textOnly)}</p>}
        {failed > 0 && <p className="insp-card-note insp-card-note--warning">{ti.failedNote(failed)}</p>}

        <div className="insp-actions">
          <button type="button" className="insp-btn insp-btn--primary" onClick={() => downloadBlob(primary.blob, primary.fileName)}>
            <Download size={16} aria-hidden="true" />
            {kind === 'image' || kind === 'saved' ? ti.downloadFixedText : ti.downloadFixed}
          </button>
          <span className="insp-actions-secondary">
            {textVersion && (
              <button type="button" className="insp-btn insp-btn--small" onClick={() => downloadBlob(textVersion.blob, textVersion.fileName)}>
                <Download size={14} aria-hidden="true" />
                {ti.downloadFixedText}
              </button>
            )}
            <button type="button" className="insp-btn insp-btn--small" onClick={onReport}>
              <Download size={14} aria-hidden="true" />
              {ti.downloadReport}
            </button>
            <button type="button" className="insp-btn insp-btn--small" onClick={onRecords}>
              <Download size={14} aria-hidden="true" />
              {ti.downloadRecords}
            </button>
          </span>
        </div>

        <ChangesCompare inspection={inspection} decisions={decisions} choices={choices} locate={locate} ti={ti} />

        <div className="insp-card-footer">
          <button type="button" className="insp-btn" onClick={onBack}>
            <ArrowLeft size={15} aria-hidden="true" />
            {ti.backToResults}
          </button>
          <button type="button" className="insp-btn" onClick={onReset}>
            {ti.checkAnother}
          </button>
        </div>
      </section>
    </div>
  )
}

// ---- The inspector -------------------------------------------------------------------

// In «Работа с документами» (personal account) the inspector works on the
// user's documents: `documentId` checks a saved document without a new upload,
// `historyId` reopens a saved check, and with `linkDocuments` an uploaded file
// is kept as a document whose extracted text can be edited and checked again.
function DocInspector({ documentId = null, historyId: openHistoryId = null, linkDocuments = false }) {
  const { t, lang } = useLanguage()
  const ti = t.inspector
  const tw = t.workspace.inspector
  const { user } = useAuth()
  const navigate = useNavigate()
  const history = useInspectionHistory()
  const [notice, setNotice] = useState(null) // 'savedAsDocument' | 'notSavedAsDocument'

  const [screen, setScreen] = useState('upload') // upload | processing | analyzed | error | review | done
  // What is being checked: { kind: 'file'|'pasted'|'document'|'history', file, name, size, format }
  const [source, setSource] = useState(null)
  const [pickError, setPickError] = useState(null)
  const [progress, setProgress] = useState({ stage: 'read' })
  const [sawOcr, setSawOcr] = useState(false)
  const [inspection, setInspection] = useState(null)
  const [decisions, setDecisions] = useState({})
  const [choices, setChoices] = useState({}) // result id -> chosen / confirmed candidate index
  const [output, setOutput] = useState(null)
  const [building, setBuilding] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [historyId, setHistoryId] = useState(null)
  const [error, setError] = useState(null)
  const panelRef = useRef(null)
  // Each run gets a number; a run that was stopped or replaced is ignored when it finishes.
  const runRef = useRef(0)

  const stage = STAGE_OF_SCREEN[screen]
  const locate = useCallback((r) => locationLabel(inspection, r, ti), [inspection, ti])
  const closeDialog = useCallback(() => setDialogOpen(false), [])

  // Free the photo preview URL when the inspection is replaced.
  useEffect(() => () => inspection?.doc.pages.forEach((p) => p.imageUrl && URL.revokeObjectURL(p.imageUrl)), [inspection])
  // Each stage starts at the top of the panel.
  const firstStage = useRef(true)
  useEffect(() => {
    if (firstStage.current) {
      firstStage.current = false
      return
    }
    panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [stage, screen])

  /** A new or removed document: everything that belonged to the old one goes. */
  const replaceSource = (next) => {
    runRef.current++
    setSource(next)
    setPickError(null)
    setNotice(null)
    setInspection(null)
    setOutput(null)
    setDecisions({})
    setChoices({})
    setHistoryId(null)
    setError(null)
    setScreen('upload')
  }

  /** Stage 1: a chosen file is checked by its content before it can be sent to the expertise. */
  const pickFile = async (file) => {
    try {
      const kind = await detectKind(file)
      replaceSource({ kind: 'file', file, name: file.name, size: file.size, format: formatLabel(kind, file) })
    } catch (err) {
      setPickError(err instanceof InspectorError ? err.code : 'unsupported_file')
    }
  }

  const start = async (file, { fromDocument = null, fromValues = null } = {}) => {
    const run = ++runRef.current
    setNotice(null)
    setError(null)
    setInspection(null)
    setOutput(null)
    setDecisions({})
    setChoices({})
    setHistoryId(null)
    setSawOcr(false)
    setProgress({ stage: 'read' })
    setScreen('processing')
    try {
      const result = await runInspection(file, lang, (p) => {
        if (run !== runRef.current) return
        if (p.stage === 'ocr') setSawOcr(true)
        setProgress(p)
      })
      if (run !== runRef.current) return
      if (fromDocument) {
        result.documentId = fromDocument
        await markDocumentChecked(fromDocument, result, fromValues).catch((err) => console.error('Document status was not updated:', err))
      } else if (linkDocuments && user) {
        // Only a finished check becomes a document; a failed one leaves nothing behind.
        try {
          const row = await createUploadedDocument(user.id, result, lang)
          result.documentId = row.id
          setNotice('savedAsDocument')
        } catch (err) {
          console.error('Uploaded document was not saved:', err)
          setNotice('notSavedAsDocument')
        }
      }
      if (run !== runRef.current) return
      setInspection(result)
      setScreen('analyzed')
      // Saved for a signed-in user; the check itself never depends on it.
      history.save(result, {}, {}, (r) => locationLabel(result, r, ti)).then(setHistoryId)
    } catch (err) {
      if (run !== runRef.current) return
      console.error('Inspection failed:', err)
      setError(err instanceof InspectorError ? err : new InspectorError('internal_error'))
      setScreen('error')
    }
  }

  /** Checks the current text of a saved document — no new upload. */
  const checkDocument = useCallback(
    async (id) => {
      const run = ++runRef.current
      setNotice(null)
      setError(null)
      setInspection(null)
      setOutput(null)
      setScreen('processing')
      setSource({ kind: 'document', file: null, name: tw.loadingDocument, size: null, format: null })
      setProgress({ stage: 'read' })
      let row = null
      try {
        row = await loadDocument(id)
      } catch (err) {
        console.error('Document could not be loaded:', err)
      }
      if (run !== runRef.current) return
      if (!row) {
        setError(new InspectorError('document_not_found'))
        setScreen('error')
        return
      }
      const text = documentPlainText(row)
      if (!text) {
        setError(new InspectorError('document_empty'))
        setScreen('error')
        return
      }
      const name = `${(row.title || 'document').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'document'}.docx`
      const file = await textToDocxFile(text, name)
      setSource({ kind: 'document', file, name, size: file.size, format: 'DOCX', documentId: row.id })
      startRef.current(file, { fromDocument: row.id, fromValues: row.values })
    },
    [tw],
  )
  const startRef = useRef(start)
  startRef.current = start

  const checkPasted = async (text) => {
    if (!text) return
    const file = await textToDocxFile(text, ti.pastedFileName)
    replaceSource({ kind: 'pasted', file, name: ti.pastedFileName, size: file.size, format: ti.pastedFormat })
    start(file)
  }

  const openFromHistory = async (id) => {
    const snapshot = await history.load(id)
    if (!snapshot) {
      setError(new InspectorError('history_unavailable'))
      setScreen('error')
      return
    }
    // An expertise run in the editor: its remarks are with the document.
    if (snapshot.kind === 'editor') {
      if (snapshot.documentId) navigate(`/account/documents/${snapshot.documentId}`)
      return
    }
    const restored = fromSnapshot(snapshot)
    runRef.current++
    setSource({ kind: 'history', file: null, name: restored.fileName, size: null, format: null })
    setPickError(null)
    setError(null)
    setInspection(restored)
    setDecisions(snapshot.decisions ?? {})
    setChoices(snapshot.choices ?? {})
    setOutput(null)
    setHistoryId(id)
    setScreen('review')
  }
  const openFromHistoryRef = useRef(openFromHistory)
  openFromHistoryRef.current = openFromHistory

  // Opened from the editor (?document=) or from the history (?history=).
  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoStarted.current) return
    if (documentId) {
      autoStarted.current = true
      checkDocument(documentId)
    } else if (openHistoryId && user) {
      autoStarted.current = true
      openFromHistoryRef.current(openHistoryId)
    }
  }, [documentId, openHistoryId, user, checkDocument])

  /** Runs the expertise again on the same document (a saved document: its current text). */
  const recheck = source?.kind === 'document' && source.documentId ? () => checkDocument(source.documentId) : source?.file ? () => start(source.file) : null

  /** Stage navigation: earlier stages keep the file and the results. */
  const goToStage = (n) => {
    if (n === 1) setScreen('upload')
    else if (n === 2) setScreen(inspection ? 'analyzed' : error ? 'error' : screen)
    else if (n === 3 && inspection) setScreen('review')
  }
  const reachable = (n) => {
    if (screen === 'processing') return false
    if (n === 1) return true
    if (n === 2) return Boolean(inspection || error)
    return Boolean(inspection)
  }
  const done = (n) => {
    if (n === 1) return Boolean(source) && (stage > 1 || Boolean(inspection))
    if (n === 2) return Boolean(inspection)
    return Boolean(output)
  }

  /** Builds the corrected document from the decisions confirmed in the dialog. */
  const applyFixes = async (nextDecisions, nextChoices) => {
    setDecisions(nextDecisions)
    setChoices(nextChoices)
    const fixes = inspection.results
      .map((r) => ({ r, fix: chosenFix(r, nextDecisions[r.id], nextChoices[r.id]) }))
      .filter(({ fix }) => fix)
      .map(({ r, fix }) => ({ ...r, suggestion: fix.suggestion }))
    setBuilding(true)
    try {
      setOutput(await buildCorrectedFiles(inspection, fixes, ti))
      setDialogOpen(false)
      setScreen('done')
      history.markFixed(historyId, inspection, nextDecisions, nextChoices, locate)
    } catch (err) {
      console.error('Building the corrected document failed:', err)
      setDialogOpen(false)
      setError(new InspectorError('build_failed'))
      setScreen('error')
    } finally {
      setBuilding(false)
    }
  }

  /** Status of one finding for the report, after the user's decisions. */
  const reportStatus = (r) => {
    if (decisions[r.id] === 'rejected') return 'rejected'
    const fix = chosenFix(r, decisions[r.id], choices[r.id])
    if (fix) return output?.status.get(r.id) ?? 'pending'
    return r.candidates.length ? 'review' : r.external ? 'external' : 'no_match'
  }

  const downloadReport = async () => {
    const { results, doc, fileName: name } = inspection
    const summary = summarize(results)
    const rows = results
      .filter((r) => r.status !== 'ok')
      .map((r, i) => {
        const status = reportStatus(r)
        const fix = chosenFix(r, decisions[r.id], choices[r.id])
        const official = r.candidates.length ? r.candidates.map((cand) => cand.official).join(' / ') : r.external ? r.external.officialTerm : '—'
        return [
          String(i + 1),
          locate(r),
          r.text,
          fix && status !== 'rejected' ? fix.suggestion : `(${official})`,
          [ti.categories[categoryOf(r)], r.errorType ? ti.errorTypes[r.errorType] : null].filter(Boolean).join(' — '),
          `${r.matchType === 'semantic' ? ti.matchSemantic : ti.matchExact}, ${Math.round(r.confidence * 100)}%`,
          r.candidates.length ? ti.sourceBaseShort : r.external ? `${r.external.sourceTitle} — ${r.external.sourceUrl}` : ti.noOfficial,
          ti.reportStatus[status],
        ]
      })
    const type = documentTypeLabel(inspection.documentType, ti)
    const blob = await buildReportDocx({
      title: ti.reportTitle,
      meta: [
        `${ti.reportFile}: ${name}`,
        ...(type ? [`${ti.metaType}: ${type} ${ti.metaTypeByAi}`] : []),
        `${ti.reportDate}: ${new Date(inspection.checkedAt ?? Date.now()).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU')}`,
        ...(doc.totalPages ? [`${ti.totalPages}: ${doc.totalPages}`] : []),
        `${ti.passport.checked}: ${summary.total}`,
        ['ok', 'misuse', 'mismatch', 'uncertain', 'ambiguous'].map((c) => `${CATEGORY_ICON[c]} ${ti.categoriesShort[c]}: ${summary.counts[c]}`).join(' · '),
        ...(summary.compliance !== null ? [`${ti.passport.compliance}: ${summary.compliance}%`] : []),
        ...(inspection.glossarySize ? [ti.baseNote(inspection.glossarySize)] : []),
      ],
      columns: ti.reportColumns,
      rows,
    })
    downloadBlob(blob, `${name.replace(/.[^.]+$/, '')}_отчёт_экспертизы.docx`)
  }

  /** Basis of every decision in the agreed JSON record format. */
  const downloadRecords = () => {
    const records = inspection.results.map((r) => ({
      page: r.page,
      location: locate(r),
      status: categoryOf(r),
      ...decisionRecord(r, ti, chosenFix(r, decisions[r.id], choices[r.id])),
      ...(r.status === 'ok' ? {} : { userDecision: reportStatus(r) }),
    }))
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${inspection.fileName.replace(/.[^.]+$/, '')}_основания.json`)
  }

  return (
    <section id="docs" className="section-static inspector-section">
      <div className="insp-panel" ref={panelRef}>
        <header className="insp-header">
          <h2 className="insp-title">{ti.title}</h2>
          <p className="insp-lead">{ti.lead}</p>
          <StageNav stage={stage} reachable={reachable} done={done} onGo={goToStage} ti={ti} />
        </header>

        {screen === 'upload' && (
          <UploadStage
            source={source}
            inspection={inspection}
            pickError={pickError}
            onPick={pickFile}
            onPaste={checkPasted}
            onRemove={() => replaceSource(null)}
            onStart={() => source?.file && start(source.file)}
            onOpenResults={() => setScreen('review')}
            onRecheck={recheck}
            history={history}
            onOpenHistory={openFromHistory}
            ti={ti}
            tw={tw}
            lang={lang}
          />
        )}

        {stage === 2 && (
          <AnalysisStage
            screen={screen}
            name={source?.name ?? inspection?.fileName ?? ''}
            progress={progress}
            sawOcr={sawOcr}
            inspection={inspection}
            error={error}
            onCancel={() => {
              runRef.current++
              setScreen('upload')
            }}
            onBack={() => setScreen('upload')}
            onResults={() => setScreen('review')}
            onRetry={error?.code === 'build_failed' ? null : recheck}
            ti={ti}
            tw={tw}
          />
        )}

        {stage === 3 && inspection && <DocumentBar inspection={inspection} notice={notice} onRecheck={checkDocument} tw={tw} />}
        {screen === 'review' && inspection && (
          <ReviewScreen
            inspection={inspection}
            output={output}
            decisions={decisions}
            setDecisions={setDecisions}
            choices={choices}
            setChoices={setChoices}
            onOpenFixes={() => setDialogOpen(true)}
            onOpenFixed={() => setScreen('done')}
            onRecords={downloadRecords}
            onReport={downloadReport}
            onReset={() => replaceSource(null)}
            ti={ti}
            lang={lang}
          />
        )}
        {screen === 'done' && inspection && output && (
          <FixedScreen
            inspection={inspection}
            output={output}
            decisions={decisions}
            choices={choices}
            onReport={downloadReport}
            onRecords={downloadRecords}
            onBack={() => setScreen('review')}
            onReset={() => replaceSource(null)}
            locate={locate}
            ti={ti}
          />
        )}
      </div>

      {dialogOpen && inspection && (
        <FixDialog
          inspection={inspection}
          decisions={decisions}
          choices={choices}
          onApply={applyFixes}
          onCancel={closeDialog}
          building={building}
          locate={locate}
          ti={ti}
        />
      )}
    </section>
  )
}

export default DocInspector
