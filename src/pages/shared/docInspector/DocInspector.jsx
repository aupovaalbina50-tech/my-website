import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookmarkCheck,
  BookmarkPlus,
  Camera,
  Check,
  CheckCircle2,
  CircleDashed,
  Download,
  Eye,
  FileCheck2,
  FileSearch,
  FileText,
  Loader2,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  Upload,
  Wand2,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useFavoriteTerms } from '../../account/useFavoriteTerms.js'
import { InspectorError } from './inspectorClient.js'
import { CATEGORIES, categoryOf, chosenFix, decisionRecord, paragraphNumber, runInspection } from './pipeline.js'
import { buildCorrectedFiles, buildReportDocx, downloadBlob, textToDocxFile } from './writers.js'
import DocPreview from './DocPreview.jsx'
import FixesScreen from './FixesScreen.jsx'
import { adiletUrl, isPairTerm, pairForResult } from './confusables.js'

// «Цифровой инспектор МЧС»: a real terminology check of a PDF / DOCX / photo
// against the site's base of official terms, with corrections written back
// into the document. Screens: upload -> processing -> review -> done (or error).

const ACCEPT = '.pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png'
// A pasted text is for a quick check; longer texts belong in a file.
const MAX_PASTE_CHARS = 20000

function UploadScreen({ onFile, ti }) {
  const [dragging, setDragging] = useState(false)
  const [pasted, setPasted] = useState('')
  const fileInputRef = useRef(null)
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
        <button type="button" className="inspector-btn inspector-btn--primary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} aria-hidden="true" />
          {ti.chooseFile}
        </button>
        <div className="inspector-dropzone-chips">
          <code className="inspector-chip">{ti.formatsChip}</code>
          <code className="inspector-chip">{ti.limitsChip}</code>
        </div>
        {/* capture="environment" opens the rear camera on phones. */}
        <button type="button" className="inspector-btn" onClick={() => cameraInputRef.current?.click()}>
          <Camera size={16} aria-hidden="true" />
          {ti.takePhoto}
        </button>
        <input ref={fileInputRef} type="file" accept={ACCEPT} hidden onChange={pick} />
        <input ref={cameraInputRef} type="file" accept="image/jpeg,image/png" capture="environment" hidden onChange={pick} />
      </div>

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
        <ScanLine size={18} aria-hidden="true" />
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
              {state === 'done' && <Check size={16} aria-hidden="true" />}
              {state === 'active' && <Loader2 size={16} className="inspector-spin" aria-hidden="true" />}
              {state === 'waiting' && <CircleDashed size={16} aria-hidden="true" />}
              <span>{step.label}</span>
              {step.detail && <span className="inspector-step-detail">{step.detail}</span>}
            </li>
          )
        })}
      </ol>
      <p className="inspector-processing-note">{ti.processingNote}</p>
    </div>
  )
}

function locationLabel(inspection, result, ti) {
  const { doc } = inspection
  if (doc.kind === 'docx' && !doc.pagesKnown) {
    const n = paragraphNumber(doc, result)
    return n ? ti.paragraphLabel(n) : ti.pageLabel(1)
  }
  return ti.pageLabel(result.page)
}

/**
 * Language of the sentence a finding is in. Judged by the whole sentence:
 * «Нысанда» alone has no Kazakh-only letters, the sentence around it does;
 * English only when the sentence (without the phrase) is all but Latin.
 */
function sentenceLang(result) {
  const sentence = result.context || result.text
  // Same rule as the Edge Function's matcher: one Kazakh-only letter is
  // enough unless Russian function words show the sentence is Russian.
  const kkLetters = sentence.match(/[әғқңөұүһі]/gi)?.length ?? 0
  const russianWords = /(?<!\p{L})(?:и|в|во|на|с|со|по|не|что|для|при|от|из|к|за|или|как)(?!\p{L})/u.test(sentence.toLowerCase())
  if (kkLetters >= 2 || (kkLetters === 1 && !russianWords)) return 'kk'
  const rest = sentence.replace(result.text, ' ')
  const cyrillic = rest.match(/\p{Script=Cyrillic}/gu)?.length ?? 0
  return cyrillic < 5 && /\p{Script=Latin}/u.test(rest) ? 'en' : 'ru'
}

/** A base entry in the language the document fragment is written in. */
function entryText(term, result, fallback) {
  if (!term) return fallback
  return term[sentenceLang(result)] || fallback
}

const TRILINGUAL = [
  ['kk', 'ҚАЗ'],
  ['ru', 'РУС'],
  ['en', 'ENG'],
]

/** How the base term is written in all three languages (never translated by us). */
function TrilingualLine({ term, ti }) {
  if (!term || isPairTerm(term)) return null
  return (
    <p className="inspector-trilingual">
      <span className="inspector-trilingual-label">{ti.trilingualLabel}:</span>
      {TRILINGUAL.map(([key, label]) => (
        <span key={key} className="inspector-trilingual-item">
          <span className="inspector-trilingual-lang">{label}</span>
          {term[key] ? term[key] : <em className="inspector-trilingual-missing">{ti.notInBase}</em>}
        </span>
      ))}
    </p>
  )
}

const CATEGORY_ICON = { misuse: '🔴', mismatch: '🟠', uncertain: '🟡', ambiguous: '🔵', ok: '🟢' }

function ConfidenceBadge({ result, ti }) {
  const icon = { high: '🟢', medium: '🟡', low: '🔴' }[result.level]
  return (
    <span className={`inspector-confidence inspector-confidence--${result.level}`}>
      {icon} {ti.confidenceLevels[result.level]} · {Math.round(result.confidence * 100)}%
    </span>
  )
}

function ResultCard({ result, inspection, decision, choice, onDecision, onChoose, onShow, selected, ti, lang, favoriteIds, onAddToDictionary }) {
  const typeLabel = result.errorType ? ti.errorTypes[result.errorType] || result.errorType : null
  const location = locationLabel(inspection, result, ti)

  if (result.status === 'ok') {
    const official = entryText(result.term, result, result.official)
    return (
      <li className={`inspector-card inspector-card--ok${selected ? ' inspector-card--selected' : ''}`}>
        <button type="button" className="inspector-ok-row" onClick={() => onShow(result)}>
          <CheckCircle2 size={16} aria-hidden="true" />
          <span className="inspector-ok-text">«{result.text}»</span>
          <span className="inspector-ok-loc">{location}</span>
        </button>
        {official && official.toLowerCase() !== result.text.toLowerCase() && (
          <p className="inspector-ok-official">
            {ti.okNote}: «{official}»
          </p>
        )}
        <TrilingualLine term={result.term} ti={ti} />
      </li>
    )
  }

  const isFix = result.status === 'fix'
  const semantic = result.matchType === 'semantic'
  const several = result.candidates.length > 1
  const single = result.candidates.length === 1 ? result.candidates[0] : null
  const chosen = choice !== undefined && choice !== null ? result.candidates[choice] : null
  const rejected = decision === 'rejected'

  const category = categoryOf(result)
  const headline = `${CATEGORY_ICON[category]} ${ti.categories[category]}`

  const pair = pairForResult(result)
  const fromPair = result.candidates.some((c) => isPairTerm(c.term))

  // Basis of the suggestion, in the agreed order of sources: the platform's
  // base, then official definitions saved on the site («Не путать»); an
  // external source is always marked as unconfirmed.
  const basis = fromPair
    ? ti.basisConfusable
    : result.candidates.length
      ? result.source === 'glossary'
        ? ti.basisGlossary
        : ti.basisBaseAi
      : result.external
        ? ti.basisExternal
        : ti.basisNone
  const basisSources = fromPair && pair ? pair.sources : []

  return (
    <li
      className={`inspector-card inspector-card--${category}${selected ? ' inspector-card--selected' : ''}${rejected ? ' inspector-card--rejected' : ''}`}
    >
      <div className="inspector-card-head">
        <span className="inspector-card-page">{location}</span>
        <span className={`inspector-status inspector-status--${category}`}>{headline}</span>
      </div>

      <div className="inspector-match">
        <div className="inspector-match-row inspector-match-row--doc">
          <span className="inspector-fix-label">❌ {semantic ? ti.phraseLabel : ti.foundLabel}</span>
          <span className="inspector-fix-text inspector-fix-text--error">«{result.text}»</span>
        </div>

        {single && (
          <div className={`inspector-match-row ${isFix ? 'inspector-match-row--ok' : 'inspector-match-row--review'}`}>
            <span className="inspector-fix-label">🔎 {isPairTerm(single.term) ? ti.matchInPair : ti.matchInBase}</span>
            <span className={`inspector-fix-text ${isFix ? 'inspector-fix-text--ok' : ''}`}>
              «{entryText(single.term, result, single.official)}»
            </span>
            {single.suggestion && !same(single.suggestion, entryText(single.term, result, single.official)) && (
              <span className="inspector-match-form">
                {ti.inSentenceForm}: «{single.suggestion}»
              </span>
            )}
          </div>
        )}

        {several && (
          <fieldset className="inspector-options">
            <legend className="inspector-fix-label">🔎 {ti.possibleMatches}</legend>
            {result.candidates.map((c, i) => (
              <label key={c.term.id} className={`inspector-option${choice === i ? ' inspector-option--chosen' : ''}`}>
                <input
                  type="radio"
                  name={`choice-${result.id}`}
                  checked={choice === i}
                  disabled={!c.applicable || rejected}
                  onChange={() => onChoose(result.id, i)}
                />
                <span className="inspector-option-body">
                  <span className="inspector-option-term">
                    {i + 1}. «{entryText(c.term, result, c.official)}»
                    {c.suggestion && !same(c.suggestion, entryText(c.term, result, c.official)) && ` → «${c.suggestion}»`}
                  </span>
                  {c.difference && <span className="inspector-option-diff">{c.difference}</span>}
                  {!c.applicable && <span className="inspector-option-diff">{ti.formNotVerified}</span>}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {!result.candidates.length && result.external && (
          <div className="inspector-match-row inspector-match-row--external">
            <span className="inspector-fix-label">🌐 {ti.externalMatch}</span>
            <span className="inspector-fix-text">«{result.external.officialTerm}»</span>
            <a className="inspector-source-link" href={result.external.sourceUrl} target="_blank" rel="noopener noreferrer">
              {result.external.sourceTitle} ↗
            </a>
          </div>
        )}
        <TrilingualLine term={(chosen ?? single)?.term ?? result.term} ti={ti} />
      </div>

      <dl className="inspector-card-meta">
        <dt>{ti.matchTypeLabel}</dt>
        <dd>
          {semantic ? ti.matchSemantic : ti.matchExact} <ConfidenceBadge result={result} ti={ti} />
        </dd>
        {typeLabel && (
          <>
            <dt>{ti.typeLabel}</dt>
            <dd>{typeLabel}</dd>
          </>
        )}
        {(result.explanation || result.external?.reason) && (
          <>
            <dt>📌 {ti.whyLabel}</dt>
            <dd>{result.external && !result.candidates.length ? result.external.reason || result.explanation : result.explanation}</dd>
          </>
        )}
        {result.context && (
          <>
            <dt>{ti.contextLabel}</dt>
            <dd className="inspector-context">«{result.context}»</dd>
          </>
        )}
        <dt>📚 {ti.basisLabel}</dt>
        <dd className={result.candidates.length ? undefined : 'inspector-basis--unconfirmed'}>
          {basis}
          {!result.candidates.length && result.external && (
            <>
              {' '}
              <a className="inspector-source-link" href={result.external.sourceUrl} target="_blank" rel="noopener noreferrer">
                {result.external.sourceTitle} ↗
              </a>
            </>
          )}
          {basisSources.map((source) => (
            <a
              key={source.docId + source.label[lang]}
              className="inspector-source-link inspector-source-link--block"
              href={adiletUrl(source.docId, lang)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {source.label[lang]} ↗
            </a>
          ))}
        </dd>
      </dl>

      {pair && (
        <div className="inspector-confusable">
          <p className="inspector-confusable-title">⚠️ {ti.dontConfuse}</p>
          <p className="inspector-confusable-pair">
            «{pair.a.name[lang]}» {ti.dontConfuseAnd} «{pair.b.name[lang]}»
          </p>
          <p className="inspector-confusable-text">{pair.difference[lang]}</p>
          <Link className="inspector-source-link" to="/not-to-confuse">
            {ti.dontConfuseMore} →
          </Link>
        </div>
      )}

      {!isFix && (
        <p className="inspector-card-note">
          {several
            ? ti.chooseNote
            : single
              ? single.applicable
                ? ti.confirmNote
                : result.errorType === 'unofficial_variant' && result.source === 'glossary'
                  ? ti.variantManualNote
                  : ti.reviewNote
              : result.external
                ? ti.externalNote
                : ti.noMatchNote}
        </p>
      )}
      {!isFix && !result.meaningPreserved && result.candidates.length > 0 && (
        <p className="inspector-card-note">{ti.meaningWarning}</p>
      )}

      <div className="inspector-card-actions">
        {rejected ? (
          <button type="button" className="inspector-btn inspector-btn--small" onClick={() => onDecision(result.id, null)}>
            <RotateCcw size={14} aria-hidden="true" />
            {ti.rejected} · {ti.undo}
          </button>
        ) : (
          <>
            {isFix && (
              <button
                type="button"
                className={`inspector-btn inspector-btn--small${decision === 'accepted' ? ' inspector-btn--accepted' : ''}`}
                onClick={() => onDecision(result.id, decision === 'accepted' ? null : 'accepted')}
                aria-pressed={decision === 'accepted'}
              >
                <Check size={14} aria-hidden="true" />
                {decision === 'accepted' ? ti.accepted : ti.accept}
              </button>
            )}
            {/* Medium confidence: the user may confirm the single verified match. */}
            {!isFix && single?.applicable && (
              <button
                type="button"
                className={`inspector-btn inspector-btn--small${chosen ? ' inspector-btn--accepted' : ''}`}
                onClick={() => onChoose(result.id, chosen ? null : 0)}
                aria-pressed={Boolean(chosen)}
              >
                <Check size={14} aria-hidden="true" />
                {chosen ? ti.confirmed : ti.confirmMatch}
              </button>
            )}
            {(isFix || result.candidates.length > 0) && (
              <button type="button" className="inspector-btn inspector-btn--small" onClick={() => onDecision(result.id, 'rejected')}>
                <X size={14} aria-hidden="true" />
                {ti.reject}
              </button>
            )}
          </>
        )}
        <button type="button" className="inspector-btn inspector-btn--small" onClick={() => onShow(result)}>
          <Eye size={14} aria-hidden="true" />
          {ti.showInDocument}
        </button>
        {/* A «Не путать» pair term is not a base row, so it can't go to «Мой словарь». */}
        {(chosen ?? single ?? null)?.term && !isPairTerm((chosen ?? single).term) && (
          <button
            type="button"
            className="inspector-btn inspector-btn--small"
            onClick={() => onAddToDictionary((chosen ?? single).term)}
            disabled={favoriteIds.has((chosen ?? single).term.id)}
            lang={lang}
          >
            {favoriteIds.has((chosen ?? single).term.id) ? (
              <BookmarkCheck size={14} aria-hidden="true" />
            ) : (
              <BookmarkPlus size={14} aria-hidden="true" />
            )}
            {favoriteIds.has((chosen ?? single).term.id) ? ti.inDictionary : ti.addToDictionary}
          </button>
        )}
      </div>
    </li>
  )
}

function same(a, b) {
  return a.toLowerCase().replace(/ё/g, 'е').trim() === b.toLowerCase().replace(/ё/g, 'е').trim()
}

// «Matches the base» first, then the problems from most serious, as agreed.
const SUMMARY_ORDER = ['ok', 'misuse', 'mismatch', 'uncertain', 'ambiguous']

function Summary({ inspection, counts, ti }) {
  const { doc, ai, unreadablePages, glossarySize } = inspection
  return (
    <div className="inspector-summary">
      <p className="inspector-summary-title">
        <FileCheck2 size={18} aria-hidden="true" />
        {ti.resultsTitle}
      </p>
      <dl className="inspector-stats">
        <div>
          <dt>{ti.checkedTerms}</dt>
          <dd>{counts.all}</dd>
        </div>
        {SUMMARY_ORDER.map((category) => (
          <div key={category} className={`inspector-stat--${category}`}>
            <dt>
              {CATEGORY_ICON[category]} {ti.categoriesShort[category]}
            </dt>
            <dd>{counts[category]}</dd>
          </div>
        ))}
      </dl>
      {doc.totalPages && (
        <p className="inspector-summary-note">
          {ti.totalPages}: {doc.totalPages}
        </p>
      )}
      {glossarySize && <p className="inspector-summary-note">{ti.baseNote(glossarySize)}</p>}
      {doc.kind === 'docx' && !doc.pagesKnown && <p className="inspector-summary-note">{ti.noPageInfo}</p>}
      {ai.failedChunks > 0 && (
        <p className="inspector-warning">
          <ShieldAlert size={15} aria-hidden="true" />
          {ti.aiFailed(ai.failedChunks, ai.totalChunks)}
          {ai.error && ti.errors[ai.error] ? ` (${ti.errors[ai.error]})` : ''}
        </p>
      )}
      {inspection.lookup.searched > 0 && (
        <p className="inspector-summary-note">{ti.lookupNote(inspection.lookup.searched, inspection.lookup.found)}</p>
      )}
      {inspection.lookup.failed > 0 && (
        <p className="inspector-warning">
          <ShieldAlert size={15} aria-hidden="true" />
          {ti.lookupFailed(inspection.lookup.failed)}
        </p>
      )}
      {unreadablePages > 0 && (
        <p className="inspector-warning">
          <ShieldAlert size={15} aria-hidden="true" />
          {ti.unreadablePages(unreadablePages)}
        </p>
      )}
    </div>
  )
}

function ReviewScreen({ inspection, decisions, setDecisions, choices, setChoices, onOpenFixes, onReport, onRecords, onReset, ti, lang }) {
  const { favoriteIds, toggleFavorite } = useFavoriteTerms()
  const { results, doc } = inspection
  const counts = useMemo(() => {
    const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]))
    for (const r of results) byCategory[categoryOf(r)]++
    return { all: results.length, fix: results.filter((r) => r.status === 'fix').length, ...byCategory }
  }, [results])
  const [filter, setFilter] = useState(CATEGORIES.find((c) => counts[c] > 0) ?? 'ok')
  const [selectedId, setSelectedId] = useState(null)
  const [pageNumber, setPageNumber] = useState(doc.pages[0].number)
  const previewRef = useRef(null)

  const selected = results.find((r) => r.id === selectedId) ?? null
  const visible = results.filter((r) => categoryOf(r) === filter)
  // Findings with a base-verified replacement: what «Исправить терминологию» lists.
  const fixable = results.filter((r) => r.status !== 'ok' && r.candidates.some((c) => c.applicable)).length

  const show = (result) => {
    setSelectedId(result.id)
    setPageNumber(result.page)
    // On narrow screens the preview is above the list — bring it into view.
    if (window.matchMedia('(max-width: 960px)').matches) previewRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  const decide = (id, value) => setDecisions((prev) => ({ ...prev, [id]: value }))
  const choose = (id, index) => {
    setChoices((prev) => ({ ...prev, [id]: index }))
    if (index !== null) decide(id, null) // choosing a variant undoes «Отклонить»
  }

  const tabs = CATEGORIES.map((key) => ({ key, label: `${CATEGORY_ICON[key]} ${ti.categoriesShort[key]}`, count: counts[key] }))
  const empty = ti.categoryEmpty[filter]

  return (
    <div className="inspector-review">
      <Summary inspection={inspection} counts={counts} ti={ti} />

      <div className="inspector-review-actions">
        <button type="button" className="inspector-btn inspector-btn--primary" onClick={onOpenFixes} disabled={fixable === 0}>
          <Wand2 size={16} aria-hidden="true" />
          {ti.fixTerminology(fixable)}
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

      <div className="inspector-split">
        <div className="inspector-split-preview" ref={previewRef}>
          <DocPreview
            doc={doc}
            pageNumber={pageNumber}
            onPageChange={setPageNumber}
            results={results}
            selected={selected}
            ti={ti}
          />
        </div>

        <div className="inspector-split-results">
          <div className="inspector-filter" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={filter === tab.key}
                className="inspector-filter-tab"
                onClick={() => setFilter(tab.key)}
              >
                {tab.label} <span className="inspector-filter-count">{tab.count}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="inspector-empty">{empty}</p>
          ) : (
            <ol className="inspector-cards">
              {visible.map((result) => (
                <ResultCard
                  key={result.id}
                  result={result}
                  inspection={inspection}
                  decision={decisions[result.id] ?? null}
                  choice={choices[result.id]}
                  onChoose={choose}
                  onDecision={decide}
                  onShow={show}
                  selected={result.id === selectedId}
                  ti={ti}
                  lang={lang}
                  favoriteIds={favoriteIds}
                  onAddToDictionary={(term) => !favoriteIds.has(term.id) && toggleFavorite(term)}
                />
              ))}
            </ol>
          )}
        </div>
      </div>

      <p className="inspector-disclaimer">{ti.disclaimer}</p>
    </div>
  )
}

function DoneScreen({ inspection, output, onReport, onBack, onReset, ti }) {
  const values = [...output.status.values()]
  const applied = values.filter((s) => s === 'applied').length
  const textOnly = values.filter((s) => s === 'text_only').length
  const failed = values.filter((s) => s === 'failed').length
  const kind = inspection.doc.kind
  const primary = output.files.find((f) => f.key !== 'text') ?? output.files[0]
  const textVersion = output.files.find((f) => f.key === 'text' && f !== primary)
  const formattingNote = { docx: ti.formattingNoteDocx, pdf: ti.formattingNotePdf, image: ti.formattingNoteImage }[kind]

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
          {kind === 'image' ? ti.downloadFixedText : ti.downloadFixed}
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
        <button type="button" className="inspector-btn" onClick={onReset}>
          <RotateCcw size={15} aria-hidden="true" />
          {ti.checkAnother}
        </button>
      </div>
      <button type="button" className="inspector-link-btn" onClick={onBack}>
        {ti.backToResults}
      </button>
    </div>
  )
}

function DocInspector() {
  const { t, lang } = useLanguage()
  const ti = t.inspector

  const [screen, setScreen] = useState('upload') // upload | processing | review | fixes | done | error
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState({ stage: 'read' })
  const [sawOcr, setSawOcr] = useState(false)
  const [inspection, setInspection] = useState(null)
  const [decisions, setDecisions] = useState({})
  const [choices, setChoices] = useState({}) // result id -> chosen / confirmed candidate index
  const [output, setOutput] = useState(null)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState(null)

  // Free the photo preview URL when the inspection is replaced.
  useEffect(() => () => inspection?.doc.pages.forEach((p) => p.imageUrl && URL.revokeObjectURL(p.imageUrl)), [inspection])

  const start = async (file) => {
    setFileName(file.name)
    setError(null)
    setInspection(null)
    setOutput(null)
    setDecisions({})
    setChoices({})
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
    } catch (err) {
      console.error('Inspection failed:', err)
      setError(err instanceof InspectorError ? err : new InspectorError('internal_error'))
      setScreen('error')
    }
  }

  const reset = () => {
    setScreen('upload')
    setInspection(null)
    setOutput(null)
    setError(null)
  }

  const fixAll = async () => {
    // Each fix carries the replacement the user ended up with (the verified
    // candidate, or the variant they chose / confirmed).
    const fixes = inspection.results
      .map((r) => ({ r, fix: chosenFix(r, decisions[r.id], choices[r.id]) }))
      .filter(({ fix }) => fix)
      .map(({ r, fix }) => ({ ...r, suggestion: fix.suggestion }))
    setBuilding(true)
    try {
      setOutput(await buildCorrectedFiles(inspection, fixes, ti))
      setScreen('done')
    } catch (err) {
      console.error('Building the corrected document failed:', err)
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
    const rows = results
      .filter((r) => r.status !== 'ok')
      .map((r, i) => {
        const status = reportStatus(r)
        const fix = chosenFix(r, decisions[r.id], choices[r.id])
        const where = doc.kind === 'docx' && !doc.pagesKnown ? ti.paragraphLabel(paragraphNumber(doc, r) ?? 1) : String(r.page)
        const official = r.candidates.length
          ? r.candidates.map((cand) => cand.official).join(' / ')
          : r.external
            ? r.external.officialTerm
            : '—'
        return [
          String(i + 1),
          where,
          r.text,
          fix && status !== 'rejected' ? fix.suggestion : `(${official})`,
          [ti.categories[categoryOf(r)], r.errorType ? ti.errorTypes[r.errorType] : null].filter(Boolean).join(' — '),
          `${r.matchType === 'semantic' ? ti.matchSemantic : ti.matchExact}, ${Math.round(r.confidence * 100)}%`,
          r.candidates.length ? ti.sourceBaseShort : r.external ? `${r.external.sourceTitle} — ${r.external.sourceUrl}` : '—',
          ti.reportStatus[status],
        ]
      })
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, results.filter((r) => categoryOf(r) === c).length]))
    const blob = await buildReportDocx({
      title: ti.reportTitle,
      meta: [
        `${ti.reportFile}: ${name}`,
        `${ti.reportDate}: ${new Date().toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU')}`,
        `${ti.totalPages}: ${doc.totalPages ?? '—'}`,
        `${ti.checkedTerms}: ${results.length}`,
        SUMMARY_ORDER.map((c) => `${CATEGORY_ICON[c]} ${ti.categoriesShort[c]}: ${counts[c]}`).join(' · '),
        ...(inspection.glossarySize ? [ti.baseNote(inspection.glossarySize)] : []),
      ],
      columns: ti.reportColumns,
      rows,
    })
    downloadBlob(blob, `${name.replace(/.[^.]+$/, '')}_отчёт_проверки.docx`)
  }

  /** Basis of every decision in the agreed JSON record format. */
  const downloadRecords = () => {
    const records = inspection.results.map((r) => ({
      page: r.page,
      ...decisionRecord(r, ti, chosenFix(r, decisions[r.id], choices[r.id])),
      ...(r.status === 'ok' ? {} : { userDecision: reportStatus(r) }),
    }))
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' })
    downloadBlob(blob, `${inspection.fileName.replace(/.[^.]+$/, '')}_основания.json`)
  }

  return (
    <section id="docs" className="section-static inspector-section">
      <div className="inspector-panel">
        <header className="inspector-header">
          <h2 className="inspector-title">{ti.title}</h2>
          {screen === 'upload' && <p className="inspector-lead">{ti.lead}</p>}
        </header>

        {screen === 'upload' && <UploadScreen onFile={start} ti={ti} />}
        {screen === 'processing' && <ProcessingScreen fileName={fileName} progress={progress} sawOcr={sawOcr} ti={ti} />}
        {screen === 'review' && inspection && (
          <ReviewScreen
            inspection={inspection}
            decisions={decisions}
            setDecisions={setDecisions}
            choices={choices}
            setChoices={setChoices}
            onOpenFixes={() => setScreen('fixes')}
            onRecords={downloadRecords}
            onReport={downloadReport}
            onReset={reset}
            ti={ti}
            lang={lang}
          />
        )}
        {screen === 'fixes' && inspection && (
          <FixesScreen
            inspection={inspection}
            decisions={decisions}
            setDecisions={setDecisions}
            choices={choices}
            setChoices={setChoices}
            onBuild={fixAll}
            building={building}
            onBack={() => setScreen('review')}
            locate={(result) => locationLabel(inspection, result, ti)}
            ti={ti}
            lang={lang}
          />
        )}
        {screen === 'done' && output && (
          <DoneScreen
            inspection={inspection}
            output={output}
            onReport={downloadReport}
            onBack={() => setScreen('fixes')}
            onReset={reset}
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
    </section>
  )
}

export default DocInspector
