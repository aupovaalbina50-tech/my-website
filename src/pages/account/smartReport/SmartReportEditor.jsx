import './smartReport.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { useToast } from '../../../components/ToastContext.jsx'
import { DEFAULT_TEMPLATE, inferredFacts, missingFacts, templateFor } from './templates/index.js'
import { composeReport, extractFacts, ReportError, reviewReport, termsInReport } from './reportClient.js'
import { createReport, loadReport, loadVersions, saveVersion, updateReport } from './useWorkReports.js'
import { reportToDocx } from './exportDocx.js'
import { StepCheck, StepDraft, StepFacts, StepPhrasing, StepSituation } from './ReportSteps.jsx'

// Editor of «Рапортты құрастыру»: situation → facts → professional wording
// → draft → final check. A new report is stored once its facts are first
// extracted; from then on every change is autosaved to work_reports.

const SAVE_DELAY_MS = 1200
const SAVED_FIELDS = ['title', 'lang', 'status', 'step', 'source_text', 'facts', 'missing', 'phrasing', 'content', 'terms']

function today() {
  const d = new Date()
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

function emptyDraft(lang, profile) {
  const name = [profile?.last_name, profile?.first_name].filter(Boolean).join(' ')
  return {
    id: null,
    report_type: DEFAULT_TEMPLATE,
    lang,
    title: '',
    status: 'draft',
    step: 1,
    source_text: '',
    facts: {},
    missing: [],
    phrasing: [],
    content: { header: {}, sections: {}, docDate: today(), signature: name, variants: [] },
    terms: [],
    current_version: 0,
  }
}

/**
 * Reports made before the fields were split keep one «casualties» field
 * (пострадавшие, спасённые); its text moves to «Другая информация» so it
 * stays visible and is not lost.
 */
function withLegacyFacts(row) {
  const legacy = row.facts?.casualties?.value?.trim()
  if (!legacy) return row
  const { casualties, ...facts } = row.facts
  const label = row.lang === 'kk' ? 'Зардап шеккендер, құтқарылғандар' : 'Пострадавшие, спасённые'
  const other = [facts.other?.value?.trim(), `${label}: ${legacy}`].filter(Boolean).join('; ')
  return { ...row, facts: { ...facts, other: { value: other, quote: casualties.quote ?? '' } } }
}

/** The report as header / title / paragraphs / date / signature (preview, copy, DOCX). */
function assemble(draft, template) {
  const lang = draft.lang
  const content = draft.content ?? {}
  return {
    header: template.header.map((h) => ({ label: h.label[lang], value: content.header?.[h.key] ?? '' })),
    title: template.docTitle[lang],
    paragraphs: template.sections.map((s) => content.sections?.[s.key] ?? ''),
    date: content.docDate ?? '',
    signature: content.signature ?? '',
  }
}

function docToText(doc) {
  return [
    ...doc.header.filter((h) => h.value.trim()).map((h) => h.value),
    '',
    doc.title,
    '',
    ...doc.paragraphs.filter((p) => p.trim()),
    '',
    doc.date,
    doc.signature,
  ].join('\n')
}

function SmartReportEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { lang: uiLang, t } = useLanguage()
  const tr = t.smartReport
  const { user, profile } = useAuth()
  const { showToast } = useToast()

  const [draft, setDraft] = useState(() => (id ? null : emptyDraft(uiLang, profile)))
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState('idle')
  const [checking, setChecking] = useState(false)
  const [versions, setVersions] = useState([])
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState('')
  const dirty = useRef(false)

  const template = templateFor(draft?.report_type)
  const lang = draft?.lang ?? uiLang

  // ---- load an existing report ----
  useEffect(() => {
    if (!id) return
    let cancelled = false
    loadReport(id)
      .then((row) => {
        if (cancelled) return
        if (!row) setNotFound(true)
        else setDraft(withLegacyFacts(row))
      })
      .catch(() => !cancelled && setNotFound(true))
    loadVersions(id)
      .then((rows) => !cancelled && setVersions(rows))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [id])

  const patch = useCallback((fields) => {
    dirty.current = true
    setDraft((current) => ({ ...current, ...fields }))
  }, [])

  const patchContent = useCallback((fields) => {
    dirty.current = true
    setDraft((current) => ({ ...current, content: { ...current.content, ...fields } }))
  }, [])

  // ---- autosave ----
  useEffect(() => {
    if (!draft?.id || !dirty.current) return
    setSaveState('saving')
    const timer = setTimeout(async () => {
      dirty.current = false
      try {
        await updateReport(draft.id, Object.fromEntries(SAVED_FIELDS.map((k) => [k, draft[k]])))
        setSaveState('saved')
      } catch {
        dirty.current = true
        setSaveState('error')
      }
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draft])

  const errorText = (err) => (err instanceof ReportError ? tr.errors[err.code] || tr.errors.generic : tr.errors.generic)

  const goTo = (step) => patch({ step })

  // ---- step 1 → 2: extract facts ----
  const handleExtract = async () => {
    const text = draft.source_text.trim()
    if (text.length < 20) {
      setError(tr.step1.tooShort)
      return
    }
    setBusy(true)
    setError('')
    try {
      const out = await extractFacts(text, draft.lang, today())
      const fields = {
        facts: out.facts,
        title: draft.title || out.title,
        missing: missingFacts(template, out.facts),
        content: { ...draft.content, events: out.events },
        step: 2,
      }
      if (!draft.id) {
        const row = await createReport(user.id, { ...Object.fromEntries(SAVED_FIELDS.map((k) => [k, draft[k]])), ...fields, report_type: draft.report_type })
        navigate(`/account/smart-report/${row.id}`, { replace: true })
        return
      }
      patch(fields)
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  // ---- step 2 → 3: professional wording + draft sections ----
  const handleCompose = async () => {
    setBusy(true)
    setError('')
    try {
      const out = await composeReport({
        text: draft.source_text,
        facts: Object.fromEntries(template.facts.map((f) => [f.key, draft.facts?.[f.key]?.value ?? ''])),
        inferred: inferredFacts(template, draft.facts),
        sections: template.sections.map((s) => ({ key: s.key, title: s.title[draft.lang], guidance: s.guidance })),
        lang: draft.lang,
      })
      patch({
        phrasing: out.phrasing,
        terms: out.terms,
        missing: missingFacts(template, draft.facts),
        content: { ...draft.content, sections: Object.fromEntries(out.sections.map((s) => [s.key, s.text])), variants: out.variants, review: null },
        step: 3,
      })
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }

  // ---- step 5: deterministic term check of the edited text ----
  const recheckTerms = useCallback(async () => {
    if (!draft) return
    setChecking(true)
    try {
      const out = await termsInReport(Object.values(draft.content?.sections ?? {}), draft.lang)
      patch({ terms: out.terms })
      patchContent({ variants: out.variants })
    } catch {
      /* the previous result stays */
    } finally {
      setChecking(false)
    }
  }, [draft, patch, patchContent])

  // ---- step 5: proof-reading + logic check (было / стало / причина) ----
  const reviewBasis = (d) => JSON.stringify([d.content?.header ?? {}, d.content?.sections ?? {}])

  const runReview = useCallback(async () => {
    if (!draft) return
    setReviewing(true)
    setReviewError('')
    try {
      const out = await reviewReport({
        header: draft.content?.header ?? {},
        sections: template.sections.map((s) => ({ key: s.key, text: draft.content?.sections?.[s.key] ?? '' })),
        facts: Object.fromEntries(template.facts.map((f) => [f.key, draft.facts?.[f.key]?.value ?? ''])),
        lang: draft.lang,
      })
      patchContent({
        review: {
          corrections: out.corrections.map((c, i) => ({ ...c, id: i, status: 'pending' })),
          issues: out.issues,
          basis: reviewBasis(draft),
          at: new Date().toISOString(),
        },
      })
    } catch (err) {
      setReviewError(errorText(err))
    } finally {
      setReviewing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, template, patchContent])

  /** Applies corrections (ids) to the header / sections and marks them applied. */
  const applyCorrections = (ids) => {
    dirty.current = true
    setDraft((current) => {
      const content = current.content ?? {}
      const header = { ...content.header }
      const sections = { ...content.sections }
      const corrections = (content.review?.corrections ?? []).map((c) => {
        if (!ids.includes(c.id) || c.status !== 'pending') return c
        const isHeader = c.target.startsWith('header.')
        const key = isHeader ? c.target.slice(7) : c.target
        const text = (isHeader ? header[key] : sections[key]) ?? ''
        const at = text.indexOf(c.was)
        if (at < 0) return { ...c, status: 'stale' }
        const next = text.slice(0, at) + c.now + text.slice(at + c.was.length)
        if (isHeader) header[key] = next
        else sections[key] = next
        return { ...c, status: 'applied' }
      })
      const review = { ...content.review, corrections }
      return { ...current, content: { ...content, header, sections, review: { ...review, basis: reviewBasis({ content: { header, sections } }) } } }
    })
  }

  const rejectCorrection = (id) => {
    dirty.current = true
    setDraft((current) => {
      const review = current.content?.review
      if (!review) return current
      const corrections = review.corrections.map((c) => (c.id === id ? { ...c, status: 'rejected' } : c))
      return { ...current, content: { ...current.content, review: { ...review, corrections } } }
    })
  }

  const enterCheck = () => {
    goTo(5)
    recheckTerms()
    if (!draft.content?.review) runReview()
  }

  const doc = useMemo(() => (draft ? assemble(draft, template) : null), [draft, template])

  const handleSaveVersion = async (note = null) => {
    setBusy(true)
    try {
      await updateReport(draft.id, Object.fromEntries(SAVED_FIELDS.map((k) => [k, draft[k]])))
      dirty.current = false
      const version = await saveVersion({ ...draft, user_id: draft.user_id ?? user.id }, note)
      setDraft((current) => ({ ...current, current_version: version }))
      setVersions(await loadVersions(draft.id))
      showToast(tr.step5.versionSaved(version))
      return true
    } catch {
      showToast(tr.saveFailed, { type: 'error' })
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleFinalize = async () => {
    const finalDraft = { ...draft, status: 'final' }
    setDraft(finalDraft)
    dirty.current = true
    setBusy(true)
    try {
      await updateReport(draft.id, Object.fromEntries(SAVED_FIELDS.map((k) => [k, finalDraft[k]])))
      dirty.current = false
      const version = await saveVersion({ ...finalDraft, user_id: draft.user_id ?? user.id }, tr.step5.finalNote)
      setDraft((current) => ({ ...current, current_version: version }))
      setVersions(await loadVersions(draft.id))
      showToast(tr.step5.finalized)
    } catch {
      showToast(tr.saveFailed, { type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const handleReopen = () => patch({ status: 'draft', step: 4 })

  const handleExport = async () => {
    const blob = await reportToDocx(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(draft.title || tr.untitled).replace(/[\\/:*?"<>|]+/g, ' ').trim()}.docx`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(docToText(doc))
      showToast(tr.step5.copied)
    } catch {
      showToast(tr.errors.generic, { type: 'error' })
    }
  }

  if (notFound) {
    return (
      <div className="report-page">
        <Link to="/account/smart-report" className="report-back">
          <ArrowLeft size={18} aria-hidden="true" />
          {tr.back}
        </Link>
        <p className="report-error">{tr.notFound}</p>
      </div>
    )
  }
  if (!draft) return <div className="report-page" />

  const readOnly = draft.status === 'final'
  const hasFacts = Object.values(draft.facts ?? {}).some((f) => f?.value)
  const hasSections = Object.values(draft.content?.sections ?? {}).some((s) => s?.trim())
  const reachable = (step) => step === 1 || (step === 2 && (hasFacts || draft.id)) || (step >= 3 && hasSections)
  const step = draft.step ?? 1

  const stepProps = { draft, template, patch, busy, error, readOnly, tr, lang }

  return (
    <div className="report-page">
      <div className="report-editor-top">
        <Link to="/account/smart-report" className="report-back">
          <ArrowLeft size={18} aria-hidden="true" />
          {tr.back}
        </Link>
        <span className={`report-save report-save--${saveState}`} aria-live="polite">
          {saveState === 'saving' && (
            <>
              <Loader2 size={14} className="report-spin" aria-hidden="true" />
              {tr.saving}
            </>
          )}
          {saveState === 'saved' && (
            <>
              <Check size={14} aria-hidden="true" />
              {tr.saved}
            </>
          )}
          {saveState === 'error' && tr.saveFailed}
        </span>
      </div>

      <header className="report-editor-head">
        <h1 className="report-hero-title">{draft.title || tr.title}</h1>
        <p className="report-muted">
          {template.name[lang]}
          {' · '}
          {readOnly ? tr.statusFinal : tr.statusDraft}
          {draft.current_version > 0 && ` · ${tr.versionShort(draft.current_version)}`}
        </p>
      </header>

      <ol className="report-steps" aria-label={tr.stepperLabel}>
        {tr.steps.map((label, i) => {
          const n = i + 1
          const state = n === step ? 'active' : n < step ? 'done' : 'todo'
          return (
            <li key={label}>
              <button
                type="button"
                className={`report-step-tab report-step-tab--${state}`}
                onClick={() => (n === 5 ? enterCheck() : goTo(n))}
                disabled={!reachable(n) || busy}
                aria-current={n === step ? 'step' : undefined}
              >
                <span className="report-step-num">{n < step ? <Check size={16} aria-hidden="true" /> : n}</span>
                <span className="report-step-text">
                  <span className="report-step-of">{tr.stepOf(n)}</span>
                  {label}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <section className="report-card">
        <h2 className="report-section-title">
          {tr.stepOf(step)}. {tr.steps[step - 1]}
        </h2>
        {step === 1 && <StepSituation {...stepProps} onExtract={handleExtract} />}
        {step === 2 && <StepFacts {...stepProps} onCompose={handleCompose} />}
        {step === 3 && <StepPhrasing {...stepProps} onCompose={handleCompose} onNext={() => goTo(4)} />}
        {step === 4 && <StepDraft {...stepProps} patchContent={patchContent} onNext={enterCheck} />}
        {step === 5 && (
          <StepCheck
            {...stepProps}
            doc={doc}
            checking={checking}
            onRecheck={recheckTerms}
            onSaveVersion={() => handleSaveVersion()}
            onFinalize={handleFinalize}
            onReopen={handleReopen}
            onExport={handleExport}
            onCopy={handleCopy}
            versions={versions}
            reviewing={reviewing}
            reviewError={reviewError}
            reviewOutdated={Boolean(draft.content?.review) && draft.content.review.basis !== reviewBasis(draft)}
            onReview={runReview}
            onApply={(id) => applyCorrections([id])}
            onApplyAll={() => applyCorrections((draft.content?.review?.corrections ?? []).map((c) => c.id))}
            onReject={rejectCorrection}
          />
        )}
      </section>
    </div>
  )
}

export default SmartReportEditor
