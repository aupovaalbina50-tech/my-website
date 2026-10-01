import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  Camera,
  CheckCircle2,
  Copy,
  FileSearch,
  RotateCcw,
  ScanLine,
  ShieldAlert,
  Upload,
} from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useToast } from '../../../components/ToastContext.jsx'
import { useFavoriteTerms } from '../../account/useFavoriteTerms.js'
import { inspectDocument, InspectorError, prepareImage } from './inspectorClient.js'

// «Цифровой инспектор МЧС»: photo of a service document -> Claude Vision
// terminology check against the official glossary -> interactive report.
// Screens: 'upload' -> 'scanning' -> 'results' (or 'error').

function UploadScreen({ onFile, ti }) {
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const pick = (event) => {
    const file = event.target.files?.[0]
    event.target.value = '' // allow choosing the same file again later
    if (file) onFile(file)
  }

  return (
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
      <p className="inspector-dropzone-hint">{ti.dropHint}</p>

      <div className="inspector-dropzone-actions">
        <button type="button" className="inspector-btn inspector-btn--primary" onClick={() => fileInputRef.current?.click()}>
          <Upload size={16} aria-hidden="true" />
          {ti.chooseFile}
        </button>
        {/* capture="environment" opens the rear camera on phones; on desktop
            it behaves like a normal file picker. */}
        <button type="button" className="inspector-btn" onClick={() => cameraInputRef.current?.click()}>
          <Camera size={16} aria-hidden="true" />
          {ti.takePhoto}
        </button>
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/*" hidden onChange={pick} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />

      <ul className="inspector-tips">
        {ti.tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  )
}

function ScanningScreen({ previewUrl, ti }) {
  return (
    <div className="inspector-scan" role="status" aria-live="polite">
      <div className="inspector-scan-frame">
        {previewUrl && <img src={previewUrl} alt="" className="inspector-scan-image" />}
        <span className="inspector-scan-line" aria-hidden="true" />
        <span className="inspector-scan-corner inspector-scan-corner--tl" aria-hidden="true" />
        <span className="inspector-scan-corner inspector-scan-corner--tr" aria-hidden="true" />
        <span className="inspector-scan-corner inspector-scan-corner--bl" aria-hidden="true" />
        <span className="inspector-scan-corner inspector-scan-corner--br" aria-hidden="true" />
      </div>
      <p className="inspector-scan-title">
        <ScanLine size={18} aria-hidden="true" />
        {ti.scanning}
      </p>
      <p className="inspector-scan-sub">{ti.scanningSub}</p>
    </div>
  )
}

function FindingCard({ finding, index, ti, lang, isFavorite, onCopy, onAddToDictionary }) {
  const typeLabel = ti.errorTypes[finding.error_type] || finding.error_type
  return (
    <li className="inspector-card" style={{ '--i': index }}>
      <div className="inspector-card-head">
        <span className={`inspector-type inspector-type--${finding.error_type}`}>{typeLabel}</span>
        <span className="inspector-card-number">№ {String(index + 1).padStart(2, '0')}</span>
      </div>

      {/* Error (red) -> recommendation (green) */}
      <div className="inspector-fix">
        <div className="inspector-fix-box inspector-fix-box--error">
          <span className="inspector-fix-label">{ti.foundLabel}</span>
          <span className="inspector-fix-text inspector-fix-text--error">{finding.found_text}</span>
        </div>
        <ArrowRight className="inspector-fix-arrow" size={20} aria-hidden="true" />
        <div className="inspector-fix-box inspector-fix-box--ok">
          <span className="inspector-fix-label">{ti.correctLabel}</span>
          <span className="inspector-fix-text inspector-fix-text--ok">{finding.correct_term}</span>
        </div>
      </div>

      <p className="inspector-card-explanation">{finding.explanation}</p>

      {finding.term && (
        <p className="inspector-card-glossary">
          {ti.glossaryLabel}: {[finding.term.kk, finding.term.ru, finding.term.en].filter(Boolean).join(' · ')}
        </p>
      )}

      <div className="inspector-card-actions">
        <button type="button" className="inspector-btn inspector-btn--small" onClick={() => onCopy(finding.correct_term)}>
          <Copy size={14} aria-hidden="true" />
          {ti.copyTerm}
        </button>
        <button
          type="button"
          className="inspector-btn inspector-btn--small"
          onClick={() => onAddToDictionary(finding.term)}
          disabled={!finding.term || isFavorite}
          title={!finding.term ? ti.notInGlossary : undefined}
          lang={lang}
        >
          {isFavorite ? <BookmarkCheck size={14} aria-hidden="true" /> : <BookmarkPlus size={14} aria-hidden="true" />}
          {isFavorite ? ti.inDictionary : ti.addToDictionary}
        </button>
      </div>
    </li>
  )
}

function ResultsScreen({ result, previewUrl, ti, lang, favoriteIds, onCopy, onAddToDictionary, onReset }) {
  const count = result.findings.length
  return (
    <div className="inspector-results">
      <div className="inspector-summary">
        {previewUrl && <img src={previewUrl} alt="" className="inspector-summary-thumb" />}
        <div className="inspector-summary-text">
          {!result.readable ? (
            <>
              <p className="inspector-summary-title inspector-summary-title--warn">
                <ShieldAlert size={18} aria-hidden="true" />
                {ti.unreadableTitle}
              </p>
              <p className="inspector-summary-sub">{ti.unreadableText}</p>
            </>
          ) : count === 0 ? (
            <>
              <p className="inspector-summary-title inspector-summary-title--ok">
                <CheckCircle2 size={18} aria-hidden="true" />
                {ti.cleanTitle}
              </p>
              <p className="inspector-summary-sub">{ti.cleanText}</p>
            </>
          ) : (
            <>
              <p className="inspector-summary-title">
                <ShieldAlert size={18} aria-hidden="true" />
                {ti.foundCount(count)}
              </p>
              <p className="inspector-summary-sub">{ti.foundText}</p>
            </>
          )}
        </div>
        <button type="button" className="inspector-btn" onClick={onReset}>
          <RotateCcw size={15} aria-hidden="true" />
          {ti.checkAnother}
        </button>
      </div>

      {count > 0 && (
        <ol className="inspector-cards">
          {result.findings.map((finding, i) => (
            <FindingCard
              key={`${finding.found_text}-${i}`}
              finding={finding}
              index={i}
              ti={ti}
              lang={lang}
              isFavorite={!!finding.term && favoriteIds.has(finding.term.id)}
              onCopy={onCopy}
              onAddToDictionary={onAddToDictionary}
            />
          ))}
        </ol>
      )}

      <p className="inspector-disclaimer">{ti.disclaimer}</p>
    </div>
  )
}

function DocInspector() {
  const { t, lang } = useLanguage()
  const ti = t.inspector
  const { showToast } = useToast()
  const { favoriteIds, toggleFavorite } = useFavoriteTerms()

  const [screen, setScreen] = useState('upload') // upload | scanning | results | error
  const [previewUrl, setPreviewUrl] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Free the object URL of the previous preview.
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl])

  const runInspection = async (file) => {
    setError(null)
    setResult(null)
    try {
      // 1. Normalise the photo in the browser (rotation, size, JPEG).
      const { blob, previewUrl: url } = await prepareImage(file)
      setPreviewUrl(url)
      setScreen('scanning')
      // 2. Claude Vision terminology check on the server.
      const report = await inspectDocument(blob, lang)
      setResult(report)
      setScreen('results')
    } catch (err) {
      setError(err instanceof InspectorError ? err : new InspectorError('internal_error'))
      setScreen('error')
    }
  }

  const reset = () => {
    setScreen('upload')
    setResult(null)
    setError(null)
    setPreviewUrl(null)
  }

  const copyTerm = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(ti.copied)
      return
    } catch {
      // Clipboard API denied (embedded browsers, non-secure contexts) —
      // fall back to the legacy copy command on a temporary textarea.
    }
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    showToast(ok ? ti.copied : ti.copyFailed, ok ? undefined : { type: 'error' })
  }

  // Reuses the site's existing favourites ("Мой словарь"); it shows its own
  // "sign in first" toast for anonymous visitors.
  const addToDictionary = (term) => {
    if (term && !favoriteIds.has(term.id)) toggleFavorite(term)
  }

  return (
    <section id="docs" className="section-static inspector-section">
      <div className="inspector-panel">
        <header className="inspector-header">
          <span className="inspector-eyebrow">
            <ScanLine size={14} aria-hidden="true" />
            {ti.eyebrow}
          </span>
          <h2 className="inspector-title">{ti.title}</h2>
          <p className="inspector-lead">{ti.lead}</p>
        </header>

        {screen === 'upload' && <UploadScreen onFile={runInspection} ti={ti} />}
        {screen === 'scanning' && <ScanningScreen previewUrl={previewUrl} ti={ti} />}
        {screen === 'results' && result && (
          <ResultsScreen
            result={result}
            previewUrl={previewUrl}
            ti={ti}
            lang={lang}
            favoriteIds={favoriteIds}
            onCopy={copyTerm}
            onAddToDictionary={addToDictionary}
            onReset={reset}
          />
        )}
        {screen === 'error' && error && (
          <div className="inspector-error" role="alert">
            <ShieldAlert size={22} aria-hidden="true" />
            <p className="inspector-error-title">{ti.errors[error.code] || ti.errors.internal_error}</p>
            {error.code === 'rate_limited' && <p className="inspector-error-sub">{ti.rateLimitHint}</p>}
            <button type="button" className="inspector-btn inspector-btn--primary" onClick={reset}>
              <RotateCcw size={15} aria-hidden="true" />
              {ti.tryAgain}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default DocInspector
