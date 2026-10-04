import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Check, CheckCircle2, CircleDashed, Download, FileSearch, FileText, ImageUp, Info, Loader2, RotateCcw, ShieldAlert, ShieldCheck, Upload, Wand2 } from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useFavoriteTerms } from '../../account/useFavoriteTerms.js'
import { InspectorError } from './inspectorClient.js'
import { categoryOf, chosenFix, decisionRecord, runInspection } from './pipeline.js'
import { buildCorrectedFiles, buildReportDocx, downloadBlob, textToDocxFile } from './writers.js'
import DocPreview from './DocPreview.jsx'
import { ChangesCompare, FixDialog } from './FixDialog.jsx'
import { Conclusion, FilterBar, FindingCard, HistoryList, OkRow, Passport, ResultsHeader, Stepper, TermProfile } from './ExpertiseView.jsx'
import { fixableResults, summarize } from './expertise.js'
import { CATEGORY_ICON, documentTypeLabel, locationLabel } from './helpers.js'
import { fromSnapshot, useInspectionHistory } from './useInspectionHistory.js'

// «Цифровой инспектор терминологии»: a real terminology check of a PDF / DOCX
// / photo / pasted text against the site's base of official terms.
//   01 upload -> 02 terminology check (processing, review) -> 03 correction and
//   conclusion (confirmation of fixes, corrected file, comparison, downloads).
// Checks of a signed-in user are kept in «История экспертиз».

const ACCEPT = '.pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png'
// A pasted text is for a quick check; longer texts belong in a file.
const MAX_PASTE_CHARS = 20000

function UploadScreen({ onFile, history, onOpenHistory, ti, lang }) {
  const [dragging, setDragging] = useState(false)
  const [pasted, setPasted] = useState('')
  const fileInputRef = useRef(null)
  const photoInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const pick = (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again later
    if (file) onFile(file)
  }

  const checkPasted = async () => {
    if (!pasted.trim()) return
    onFile(await textToDocxFile(pasted.trim(), ti.pastedFileName))
  }

  return (
    <div className="inspector-upload">
      <h3 className="inspector-subheading">{ti.uploadHeading}</h3>
      <div
        className={`inspector-dropzone${dragging ? ' inspector-dropzone--active' : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files?.[0]
          if (file) onFile(file)
        }}
      >
        <span className="inspector-dropzone-icon" aria-hidden="true">
          <FileSearch size={30} strokeWidth={1.6} />
        </span>
        <p className="inspector-dropzone-title">{ti.dropTitle}</p>
        <p className="inspector-dropzone-or">{ti.dropOr}</p>
        <div className="inspector-dropzone-buttons">
          <button type="button" className="inspector-btn inspector-btn--primary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} aria-hidden="true" />
            {ti.uploadDocument}
          </button>
          <button type="button" className="inspector-btn" onClick={() => photoInputRef.current?.click()}>
            <ImageUp size={16} aria-hidden="true" />
            {ti.uploadPhoto}
          </button>
          {/* capture="environment" opens the rear camera on phones. */}
          <button type="button" className="inspector-btn" onClick={() => cameraInputRef.current?.click()}>
            <Camera size={16} aria-hidden="true" />
            {ti.takePhoto}
          </button>
        </div>
        <div className="inspector-dropzone-chips">
          <code className="inspector-chip">{ti.formatsChip}</code>
          <code className="inspector-chip">{ti.limitsChip}</code>
        </div>
        <input ref={fileInputRef} type="file" accept={ACCEPT} hidden onChange={pick} />
        <input ref={photoInputRef} type="file" accept="image/jpeg,image/png" hidden onChange={pick} />
        <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png" capture="environment" hidden onChange={pick} />
      </div>
      <p className="inspector-summary-note">{ti.photoHint}</p>

      <h3 className="inspector-subheading">{ti.pasteHeading}</h3>
      <div className="inspector-paste">
        <textarea
          aria-label={ti.pasteHeading}
          className="inspector-paste-input"
          value={pasted}
          onChange={(event) => setPasted(event.target.value.slice(0, MAX_PASTE_CHARS))}
          placeholder={ti.pastePlaceholder}
          rows={6}
        />
        <div className="inspector-paste-footer">
          <span className="inspector-paste-count">
            {pasted.length.toLocaleString()} / {MAX_PASTE_CHARS.toLocaleString()}
          </span>
          <button type="button" className="inspector-btn inspector-btn--primary" onClick={checkPasted} disabled={!pasted.trim()}>
            <FileSearch size={16} aria-hidden="true" />
            {ti.pasteCheck}
          </button>
        </div>
      </div>

      <HistoryList history={history} onOpen={onOpenHistory} ti={ti} lang={lang} />

      <h3 className="inspector-subheading">{ti.howTitle}</h3>
      <ol className="inspector-how">
        {ti.howSteps.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong> — {step.text}
          </li>
        ))}
      </ol>

      <p className="inspector-important">
        <strong>{ti.importantLabel}</strong> {ti.importantText}
      </p>

      <dl className="inspector-facts">
        {ti.facts.map((fact) => (
          <div key={fact.label} className="inspector-fact">
            <dt>{fact.label}:</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const STAGE_ORDER = ['read', 'ocr', 'analyze', 'lookup']

/** Real progress: each step shows done / running / waiting as it happens. */
function ProcessingScreen({ fileName, progress, sawOcr, ti }) {
  const current = STAGE_ORDER.indexOf(progress.stage)
  const steps = [
    { stage: 'read', label: ti.stepRead },
    ...(sawOcr ? [{ stage: 'ocr', label: ti.stepOcr, detail: progress.stage === 'ocr' && ti.stepOcrProgress(progress.current, progress.total) }] : []),
    {
      stage: 'analyze',
      label: ti.stepAnalyze,
      detail: progress.stage === 'analyze' && ti.stepAnalyzeProgress(progress.current, progress.total),
    },
    // Only shown once it actually runs (phrases with no match in the base).
    ...(progress.stage === 'lookup'
      ? [{ stage: 'lookup', label: ti.stepLookup, detail: ti.stepAnalyzeProgress(progress.current, progress.total) }]
      : []),
  ]
  return (
    <div className="inspector-processing" role="status" aria-live="polite">
      <p className="inspector-processing-title">
        <span className="inspector-processing-badge" aria-hidden="true">
          <FileText size={22} strokeWidth={1.75} />
        </span>
        {ti.processingTitle}
      </p>
      <p className="inspector-processing-file">
        <FileText size={15} aria-hidden="true" />
        {fileName}
      </p>
      <ol className="inspector-steps">
        {steps.map((step) => {
          const index = STAGE_ORDER.indexOf(step.stage)
          const state = index < current ? 'done' : index === current ? 'active' : 'waiting'
          return (
            <li key={step.stage} className={`inspector-step inspector-step--${state}`}>
              <span className="inspector-step-mark" aria-hidden="true">
                {state === 'done' && <Check size={18} strokeWidth={3} />}
                {state === 'active' && <Loader2 size={26} className="inspector-spin" />}
                {state === 'waiting' && <CircleDashed size={24} />}
              </span>
              <span className="inspector-step-label">{step.label}</span>
              {step.detail && (
                <span className="inspector-step-detail">
                  <FileText size={15} aria-hidden="true" />
                  {step.detail}
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <p className="inspector-processing-note">
        <Info size={20} aria-hidden="true" />
        <span>{ti.processingNote}</span>
      </p>
    </div>
  )
}

function ReviewScreen({ inspection, decisions, setDecisions, choices, setChoices, onOpenFixes, onReport, onRecords, onReset, ti, lang }) {
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
    <div className="inspector-review">
      <ResultsHeader inspection={inspection} summary={summary} ti={ti} lang={lang} />
      <Passport inspection={inspection} summary={summary} ti={ti} />

      <div className="inspector-review-actions">
        <button type="button" className="inspector-btn inspector-btn--primary" onClick={onOpenFixes} disabled={fixable === 0}>
          <Wand2 size={16} aria-hidden="true" />
          {ti.fixConfirmed}
        </button>
        <button type="button" className="inspector-btn" onClick={onReport}>
          <Download size={15} aria-hidden="true" />
          {ti.downloadReport}
        </button>
        <button type="button" className="inspector-btn" onClick={onRecords}>
          <FileText size={15} aria-hidden="true" />
          {ti.downloadRecords}
        </button>
        <button type="button" className="inspector-btn" onClick={onReset}>
          <RotateCcw size={15} aria-hidden="true" />
          {ti.checkAnother}
        </button>
      </div>
      {fixable > 0 && <p className="inspector-review-hint">{ti.fixAllHint}</p>}

      <FilterBar filter={filter} onChange={setFilter} summary={summary} ti={ti} />

      <div className="inspector-split">
        <div className="inspector-split-preview" ref={previewRef}>
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

        <div className="inspector-split-results">
          {filter !== 'ok' && (
            <p className="inspector-issues-title">
              {filter === 'all' ? ti.issuesTitle(summary.issues) : `${CATEGORY_ICON[filter]} ${ti.filterLabels[filter]} — ${issues.length}`}
            </p>
          )}
          {visible.length === 0 ? (
            <p className="inspector-empty">{filter === 'all' ? ti.categoryEmpty.ok : ti.categoryEmpty[filter]}</p>
          ) : (
            <ol className="inspector-cards">
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
              {okRows.length > 0 && filter === 'all' && <li className="inspector-cards-divider">{ti.okDivider(okRows.length)}</li>}
              {okRows.map((result) => (
                <OkRow key={result.id} result={result} location={locate(result)} selected={result.id === selectedId} onShow={show} ti={ti} />
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="inspector-review-bottom">
        <TermProfile inspection={inspection} ti={ti} lang={lang} />
        <Conclusion summary={summary} ti={ti} />
      </div>

      <p className="inspector-disclaimer">{ti.disclaimer}</p>
    </div>
  )
}

function DoneScreen({ inspection, output, decisions, choices, onReport, onRecords, onBack, onReset, locate, ti }) {
  const values = [...output.status.values()]
  const applied = values.filter((s) => s === 'applied').length
  const textOnly = values.filter((s) => s === 'text_only').length
  const failed = values.filter((s) => s === 'failed').length
  const kind = inspection.doc.kind
  const primary = output.files.find((f) => f.key !== 'text') ?? output.files[0]
  const textVersion = output.files.find((f) => f.key === 'text' && f !== primary)
  const formattingNote = { docx: ti.formattingNoteDocx, pdf: ti.formattingNotePdf, image: ti.formattingNoteImage, saved: ti.formattingNoteSaved }[kind]
  const summary = useMemo(() => summarize(inspection.results), [inspection])

  return (
    <div className="inspector-done">
      <p className="inspector-done-title">
        <CheckCircle2 size={22} aria-hidden="true" />
        {ti.doneTitle}
      </p>
      <p className="inspector-done-count">
        {ti.fixedCount}: <strong>{applied + textOnly}</strong>
      </p>
      <p className="inspector-summary-note">{formattingNote}</p>
      {textOnly > 0 && kind === 'pdf' && <p className="inspector-warning">{ti.textOnlyNote(textOnly)}</p>}
      {failed > 0 && <p className="inspector-warning">{ti.failedNote(failed)}</p>}

      <div className="inspector-done-actions">
        <button type="button" className="inspector-btn inspector-btn--primary" onClick={() => downloadBlob(primary.blob, primary.fileName)}>
          <Download size={16} aria-hidden="true" />
          {kind === 'image' || kind === 'saved' ? ti.downloadFixedText : ti.downloadFixed}
        </button>
        {textVersion && (
          <button type="button" className="inspector-btn" onClick={() => downloadBlob(textVersion.blob, textVersion.fileName)}>
            <FileText size={15} aria-hidden="true" />
            {ti.downloadFixedText}
          </button>
        )}
        <button type="button" className="inspector-btn" onClick={onReport}>
          <Download size={15} aria-hidden="true" />
          {ti.downloadReport}
        </button>
        <button type="button" className="inspector-btn" onClick={onRecords}>
          <FileText size={15} aria-hidden="true" />
          {ti.downloadRecords}
        </button>
        <button type="button" className="inspector-btn" onClick={onReset}>
          <RotateCcw size={15} aria-hidden="true" />
          {ti.checkAnother}
        </button>
      </div>

      <ChangesCompare inspection={inspection} decisions={decisions} choices={choices} locate={locate} ti={ti} />
      <Conclusion summary={summary} ti={ti} />

      <button type="button" className="inspector-link-btn" onClick={onBack}>
        {ti.backToResults}
      </button>
    </div>
  )
}

function DocInspector() {
  const { t, lang } = useLanguage()
  const ti = t.inspector
  const history = useInspectionHistory()

  const [screen, setScreen] = useState('upload') // upload | processing | review | done | error
  const [fileName, setFileName] = useState('')
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

  const locate = useCallback((r) => locationLabel(inspection, r, ti), [inspection, ti])
  const closeDialog = useCallback(() => setDialogOpen(false), [])

  // Free the photo preview URL when the inspection is replaced.
  useEffect(() => () => inspection?.doc.pages.forEach((p) => p.imageUrl && URL.revokeObjectURL(p.imageUrl)), [inspection])
  // Each step starts at the top of the panel.
  useEffect(() => {
    if (screen !== 'upload') panelRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [screen])

  const start = async (file) => {
    setFileName(file.name)
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
        if (p.stage === 'ocr') setSawOcr(true)
        setProgress(p)
      })
      setInspection(result)
      setScreen('review')
      // Saved for a signed-in user; the check itself never depends on it.
      history.save(result, {}, {}, (r) => locationLabel(result, r, ti)).then(setHistoryId)
    } catch (err) {
      console.error('Inspection failed:', err)
      setError(err instanceof InspectorError ? err : new InspectorError('internal_error'))
      setScreen('error')
    }
  }

  const openFromHistory = async (id) => {
    const snapshot = await history.load(id)
    if (!snapshot) {
      setError(new InspectorError('history_unavailable'))
      setScreen('error')
      return
    }
    const restored = fromSnapshot(snapshot)
    setFileName(restored.fileName)
    setInspection(restored)
    setDecisions(snapshot.decisions ?? {})
    setChoices(snapshot.choices ?? {})
    setOutput(null)
    setHistoryId(id)
    setScreen('review')
  }

  const reset = () => {
    setScreen('upload')
    setInspection(null)
    setOutput(null)
    setError(null)
    setHistoryId(null)
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
        const official = r.candidates.length
          ? r.candidates.map((cand) => cand.official).join(' / ')
          : r.external
            ? r.external.officialTerm
            : '—'
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
      <div className="inspector-panel" ref={panelRef}>
        <header className="inspector-header">
          <h2 className="inspector-title">
            <ShieldCheck className="inspector-title-icon" size={44} strokeWidth={1.5} aria-hidden="true" />
            {ti.title}
          </h2>
          {screen === 'upload' && <p className="inspector-lead">{ti.lead}</p>}
          <Stepper screen={screen} ti={ti} />
        </header>

        {screen === 'upload' && <UploadScreen onFile={start} history={history} onOpenHistory={openFromHistory} ti={ti} lang={lang} />}
        {screen === 'processing' && <ProcessingScreen fileName={fileName} progress={progress} sawOcr={sawOcr} ti={ti} />}
        {screen === 'review' && inspection && (
          <ReviewScreen
            inspection={inspection}
            decisions={decisions}
            setDecisions={setDecisions}
            choices={choices}
            setChoices={setChoices}
            onOpenFixes={() => setDialogOpen(true)}
            onRecords={downloadRecords}
            onReport={downloadReport}
            onReset={reset}
            ti={ti}
            lang={lang}
          />
        )}
        {screen === 'done' && output && (
          <DoneScreen
            inspection={inspection}
            output={output}
            decisions={decisions}
            choices={choices}
            onReport={downloadReport}
            onRecords={downloadRecords}
            onBack={() => setScreen('review')}
            onReset={reset}
            locate={locate}
            ti={ti}
          />
        )}
        {screen === 'error' && error && (
          <div className="inspector-error" role="alert">
            <ShieldAlert size={22} aria-hidden="true" />
            <p className="inspector-error-title">{ti.errors[error.code] || ti.errors.internal_error}</p>
            {error.code === 'rate_limited' && <p className="inspector-error-sub">{ti.rateLimitHint}</p>}
            <button type="button" className="inspector-btn inspector-btn--primary" onClick={inspection ? () => setScreen('review') : reset}>
              <RotateCcw size={15} aria-hidden="true" />
              {inspection ? ti.backToResults : ti.tryAgain}
            </button>
          </div>
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
