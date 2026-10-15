import './documents.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardCopy,
  Download,
  FileText,
  History,
  FileSearch,
  RotateCcw,
  Loader2,
  Printer,
  Save,
  ScanSearch,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { useToast } from '../../../components/ToastContext.jsx'
import { CATEGORIES, FREE_TEXT_ID, fieldsOf, templateById } from './catalog/index.js'
import { checkBlocks, documentText, isEmptyValue, missingRequired, renderDocument, replaceFragment, setValueAt, valueAt } from './render.js'
import { documentToDocx, documentToPdf, downloadBlob, fileNameOf } from './exportDocument.js'
import { checkDocumentText, createDocument, loadDocVersions, loadDocument, saveDocVersion, saveProfileData, updateDocument } from './useDocuments.js'
import { CHECK_DOCUMENT_PATH, documentSource, expertisePath, loadDocumentExpertises } from '../../workspace/documentModel.js'
import { docStrings, errorText } from './strings.js'
import { requisiteIssues } from '../smartReport/templates/index.js'
import FieldInput from './FieldInput.jsx'
import DocumentPreview from './DocumentPreview.jsx'
import { ChangesPanel, CheckPanel } from './CheckPanel.jsx'
import { AssistDialog, PhotoDialog, ProfileFillDialog, VersionsDialog } from './Dialogs.jsx'

// The universal editor of «Конструктор профессиональной документации».
// Left: the template's sections as a form; right: the live preview, the check
// and the accepted changes. Every document type works through this one
// editor — the template configuration decides what is shown.

const SAVE_DELAY = 900
let issueSeq = 0
const nextIssueId = () => `i${Date.now().toString(36)}${(issueSeq++).toString(36)}`

/** The check as stored: older rows may hold a bare array. */
const readCheck = (raw) => (Array.isArray(raw) ? (raw.length ? { items: raw } : null) : raw && typeof raw === 'object' && raw.items ? raw : null)
const openCount = (check) => (check?.items ?? []).filter((i) => i.status === 'open').length
const savePayload = (values, title, lang, status, check) => ({ values, title, lang, status, issues: check ?? [], issue_count: openCount(check) })

function today() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
const parseIso = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ''))
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

/** Checks that need no AI: required fields, requisites, dates. Titles in the site language, case rules in the document's. */
function ruleIssues(template, values, s, lang, docLang) {
  const c = s.checkPanel
  const fields = fieldsOf(template)
  const issues = missingRequired(template, values).map((key) => ({
    category: 'critical',
    rule: 'missing',
    target: key,
    title: c.missingRequired(fields.find((f) => f.key === key).label[lang]),
    reason: c.missingRequiredReason,
  }))
  // Case of «Кому» / «От кого» (Russian), the same rule as in «Умный рабочий рапорт».
  for (const r of requisiteIssues({ to: values.to, from: values.from }, docLang)) {
    issues.push({ category: 'language', rule: 'case', target: r.field, title: c.requisiteCase[r.field], reason: c.requisiteCaseReason(r.word) })
  }
  const docDate = parseIso(values.date)
  if (docDate && docDate > today()) issues.push({ category: 'important', rule: 'date', target: 'date', title: c.futureDate, reason: c.futureDateReason })
  for (const key of ['incidentDate', 'eventDate']) {
    const event = parseIso(values[key])
    if (event && docDate && event > docDate) issues.push({ category: 'logic', rule: 'date', target: key, title: c.eventAfterDoc, reason: c.eventAfterDocReason })
  }
  return issues
}

export default function DocumentEditor() {
  const { id } = useParams()
  const { lang: uiLang, t } = useLanguage()
  const lang = uiLang === 'kk' ? 'kk' : 'ru'
  const s = docStrings(lang)
  const e = s.editor
  const w = t.workspace.editor
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()

  const [doc, setDoc] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [values, setValues] = useState({})
  const [title, setTitle] = useState('')
  const [docLang, setDocLang] = useState('ru')
  const [status, setStatus] = useState('draft')
  const [check, setCheck] = useState(null)
  const [saveState, setSaveState] = useState('saved')
  const [checking, setChecking] = useState(false)
  const [invalid, setInvalid] = useState(() => new Set())
  const [flashKey, setFlashKey] = useState(null)
  const [rightTab, setRightTab] = useState('preview')
  const [mobileView, setMobileView] = useState('form')
  const [dialog, setDialog] = useState(null) // 'profile' | 'assist' | 'photo' | 'versions' | 'export'
  const [assistText, setAssistText] = useState('')
  const loaded = useRef(false)
  // What is stored now: opening a document must not count as a change (it would move updated_at).
  const lastSaved = useRef(null)
  const [original, setOriginal] = useState(null) // version «original»: the source text
  const [lastExpertise, setLastExpertise] = useState(null)

  const template = doc ? templateById(doc.template_id) : null
  const readOnly = status === 'archive'


  useEffect(() => {
    let alive = true
    loaded.current = false
    loadDocument(id)
      .then((row) => {
        if (!alive) return
        if (!row) return setLoadError('notFound')
        setDoc(row)
        setValues(row.values ?? {})
        setTitle(row.title ?? '')
        setDocLang(row.lang ?? 'ru')
        setStatus(row.status ?? 'draft')
        setCheck(readCheck(row.issues))
        lastSaved.current = JSON.stringify(savePayload(row.values ?? {}, row.title ?? '', row.lang ?? 'ru', row.status ?? 'draft', readCheck(row.issues)))
        // «Написать или вставить текст»: the editor opens with the text helper.
        if (params.get('mode') === 'text' && row.template_id !== FREE_TEXT_ID) {
          setDialog('assist')
          setParams({}, { replace: true })
        }
        // Let the first render pass before changes count as edits.
        setTimeout(() => (loaded.current = true), 0)
      })
      .catch(() => alive && setLoadError('notFound'))
    // The source text and the last terminology expertise (not needed to edit).
    loadDocVersions(id)
      .then((versions) => alive && setOriginal(versions.filter((v) => v.kind === 'original').at(-1) ?? null))
      .catch(() => {})
    loadDocumentExpertises(id, 1)
      .then((rows) => alive && setLastExpertise(rows[0] ?? null))
      .catch(() => {})
    return () => {
      alive = false
    }
    // params are read once, when the document opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // ---- autosave ----
  useEffect(() => {
    if (!loaded.current || !doc) return
    const payload = savePayload(values, title, docLang, status, check)
    const key = JSON.stringify(payload)
    if (key === lastSaved.current) return
    setSaveState('saving')
    const timer = setTimeout(() => {
      updateDocument(doc.id, payload)
        .then(() => {
          lastSaved.current = key
          setSaveState('saved')
        })
        .catch(() => setSaveState('error'))
    }, SAVE_DELAY)
    return () => clearTimeout(timer)
  }, [values, title, docLang, status, check, doc])

  /** Saves at once (the autosave waits for a pause); true when saved. */
  const saveNow = async () => {
    setSaveState('saving')
    try {
      const payload = savePayload(values, title, docLang, status, check)
      await updateDocument(doc.id, payload)
      lastSaved.current = JSON.stringify(payload)
      setSaveState('saved')
      return true
    } catch {
      setSaveState('error')
      return false
    }
  }

  const saveDraft = async () => {
    const ok = await saveNow()
    showToast(ok ? w.draftSaved : w.saveFailed, { type: ok ? 'success' : 'error' })
  }

  /** «Терминологическая экспертиза» of this document: saved first, then checked as it is — no upload. */
  const openExpertise = async () => {
    if (await saveNow()) navigate(CHECK_DOCUMENT_PATH(doc.id))
    else showToast(w.saveFailed, { type: 'error' })
  }

  /** «Вернуть исходный текст»: the current text is kept as a version first. */
  const restoreOriginal = async () => {
    if (!original || !window.confirm(w.restoreConfirm)) return
    try {
      const version = await saveDocVersion(doc, values, 'user')
      setDoc((d) => ({ ...d, current_version: version }))
      setValues(original.values ?? {})
      setStatus('filling')
      showToast(w.restored, { type: 'success' })
    } catch {
      showToast(w.saveFailed, { type: 'error' })
    }
  }

  const rendered = useMemo(() => (template ? renderDocument(template, values, docLang) : null), [template, values, docLang])

  // ---- editing ----
  const changeValues = useCallback(
    (patch) => {
      setValues((current) => ({ ...current, ...patch }))
      // A filled required field resolves its «не заполнено» remark.
      const fields = fieldsOf(template)
      const filled = (key) => key in patch && !isEmptyValue(fields.find((f) => f.key === key) ?? {}, patch[key])
      setCheck((c) =>
        c?.items.some((i) => i.rule === 'missing' && i.status === 'open' && filled(i.target))
          ? { ...c, items: c.items.map((i) => (i.rule === 'missing' && i.status === 'open' && filled(i.target) ? { ...i, status: 'edited' } : i)) }
          : c,
      )
      setInvalid((current) => {
        if (!current.size) return current
        const next = new Set(current)
        Object.keys(patch).forEach((k) => next.delete(k))
        return next
      })
      setStatus((st) => (st === 'draft' || st === 'ready' ? 'filling' : st))
    },
    [template],
  )

  const goTo = useCallback((path) => {
    const key = String(path).split('.')[0]
    setMobileView('form')
    setFlashKey(key)
    requestAnimationFrame(() => {
      const box = document.querySelector(`[data-field="${key}"]`)
      box?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const input = document.querySelector(`[data-path="${path}"]`) ?? box?.querySelector('input, textarea, select')
      input?.focus?.({ preventScroll: true })
    })
    setTimeout(() => setFlashKey((k) => (k === key ? null : k)), 1800)
  }, [])

  // ---- check ----
  const runCheck = async () => {
    if (!template) return
    setChecking(true)
    setRightTab('check')
    setMobileView('preview')
    const prevStatus = status
    setStatus('review')
    try {
      if (!doc.current_version) {
        const version = await saveDocVersion(doc, values, 'original')
        setDoc((d) => ({ ...d, current_version: version }))
      }
    } catch {
      // A failed snapshot must not block the check itself.
    }
    const rules = ruleIssues(template, values, s, lang, docLang)
    let ai = { issues: [], terms: [], variants: [], knowledge: null }
    let failed = null
    const blocks = checkBlocks(template, values, docLang)
    if (blocks.length) {
      try {
        ai = await checkDocumentText({ blocks, documentTitle: template.title[docLang], lang: docLang })
      } catch (err) {
        failed = err
      }
    }
    const items = [...rules.map((r) => ({ ...r, source: 'rule' })), ...ai.issues.map((i) => ({ ...i, source: 'ai' }))].map((i) => ({
      ...i,
      id: nextIssueId(),
      status: 'open',
    }))
    const next = { items, terms: ai.terms ?? [], variants: ai.variants ?? [], knowledge: ai.knowledge ?? null, at: new Date().toISOString(), savedChecked: false }
    setCheck(next)
    setStatus(failed && !items.length ? prevStatus : openCount(next) ? 'issues' : 'review')
    setChecking(false)
    if (failed) showToast(`${s.checkPanel.checkFailed}: ${errorText(s, failed)}`, { type: 'error' })
    else showToast(s.checkPanel.rechecked, { type: 'success' })
  }

  // After the last open remark is decided, the result is kept as «Версия после проверки».
  useEffect(() => {
    if (!check || check.savedChecked || !check.items.length || openCount(check) || !doc) return
    setCheck((c) => ({ ...c, savedChecked: true }))
    setStatus((st) => (st === 'issues' ? 'review' : st))
    saveDocVersion(doc, values, 'checked')
      .then((version) => setDoc((d) => ({ ...d, current_version: version })))
      .catch(() => {})
  }, [check, doc, values])

  const decide = (issue, statusOf, extra = {}) =>
    setCheck((c) => ({ ...c, items: c.items.map((i) => (i.id === issue.id ? { ...i, status: statusOf, ...extra } : i)) }))

  const acceptIssue = (issue) => {
    const current = valueAt(values, issue.target)
    const next = replaceFragment(current, issue.was, issue.now)
    if (next === null) return decide(issue, 'open', { stale: true })
    setValues((v) => setValueAt(v, issue.target, next))
    setStatus((st) => (st === 'ready' ? 'filling' : st))
    decide(issue, 'accepted')
  }

  // ---- finishing, versions, export ----
  const finish = async () => {
    const missing = missingRequired(template, values)
    if (missing.length) {
      setInvalid(new Set(missing))
      showToast(e.missingSummary(missing.length), { type: 'error' })
      goTo(missing[0])
      return
    }
    setStatus('ready')
    try {
      const version = await saveDocVersion(doc, values, 'final')
      setDoc((d) => ({ ...d, current_version: version }))
      showToast(e.finished, { type: 'success' })
    } catch {
      showToast(e.saveFailed, { type: 'error' })
    }
  }

  const saveUserVersion = async () => {
    try {
      const version = await saveDocVersion(doc, values, 'user')
      setDoc((d) => ({ ...d, current_version: version }))
      showToast(e.versionSaved(version), { type: 'success' })
    } catch {
      showToast(e.saveFailed, { type: 'error' })
    }
  }

  const exportAs = async (kind) => {
    setDialog(null)
    try {
      if (kind === 'docx') downloadBlob(await documentToDocx(rendered, docLang), fileNameOf(title || template.title[docLang], 'docx'))
      if (kind === 'pdf') downloadBlob(await documentToPdf(rendered, docLang), fileNameOf(title || template.title[docLang], 'pdf'))
      if (kind === 'copy') {
        await navigator.clipboard.writeText(documentText(rendered, docLang))
        showToast(e.textCopied, { type: 'success' })
      }
      if (kind === 'print') {
        document.body.classList.add('doc-print-mode')
        const done = () => {
          document.body.classList.remove('doc-print-mode')
          window.removeEventListener('afterprint', done)
        }
        window.addEventListener('afterprint', done)
        window.print()
      }
    } catch {
      showToast(e.exportFailed, { type: 'error' })
    }
  }

  // ---- render ----
  if (loadError) {
    return (
      <div className="doc-page">
        <p className="doc-error">{e.notFound}</p>
        <Link to="/account/workspace/create?tab=mine" className="doc-btn">
          <ArrowLeft size={16} aria-hidden="true" /> {e.back}
        </Link>
      </div>
    )
  }
  if (!doc) {
    return (
      <div className="doc-page doc-loading">
        <Loader2 size={22} className="doc-spin" aria-hidden="true" /> {e.loading}
      </div>
    )
  }
  if (!template) {
    return (
      <div className="doc-page">
        <p className="doc-error">{e.unknownTemplate}</p>
      </div>
    )
  }

  const category = CATEGORIES.find((c) => c.key === template.categories[0])
  const source = documentSource(values)
  const opened = openCount(check)

  return (
    <div className="doc-page doc-editor">
      <header className="doc-editor-head">
        <Link to="/account/workspace/create?tab=mine" className="doc-back">
          <ArrowLeft size={16} aria-hidden="true" />
          {e.back}
        </Link>
        <div className="doc-editor-titlebar">
          <span className="doc-editor-kind">
            <FileText size={16} aria-hidden="true" />
            {category?.title[lang]} · {template.title[lang]}
          </span>
          <span className={`doc-status doc-status--${status}`}>{s.docStatus[status]}</span>
          <span className={`doc-tpl-status doc-tpl-status--${template.status}`}>{s.templateStatus[template.status]}</span>
          <span className={`doc-save doc-save--${saveState}`} role="status">
            {saveState === 'saving' ? e.saving : saveState === 'error' ? e.saveFailed : e.saved}
          </span>
        </div>
        <div className="doc-editor-meta">
          <label className="doc-title-input">
            <span>{e.titleLabel}</span>
            <input className="doc-input" value={title} onChange={(ev) => setTitle(ev.target.value)} placeholder={template.title[docLang]} readOnly={readOnly} maxLength={200} />
          </label>
          <div className="doc-lang-toggle" role="group" aria-label={e.docLang}>
            <span>{e.docLang}</span>
            {['kk', 'ru'].map((code) => (
              <button key={code} type="button" className={docLang === code ? 'is-on' : undefined} onClick={() => setDocLang(code)} disabled={readOnly}>
                {code === 'kk' ? 'Қазақша' : 'Русский'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {(source.origin === 'upload' || original || lastExpertise) && (
        <div className="doc-source-bar">
          {source.origin === 'upload' && <span className="doc-source-file">{w.uploadedFrom(source.fileName)}</span>}
          {lastExpertise && (
            <span className="doc-source-expertise">
              {w.lastExpertise}: {new Date(lastExpertise.created_at).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU')} ·{' '}
              {lastExpertise.issue_count > 0 ? t.workspace.activity.issues(lastExpertise.issue_count) : t.workspace.activity.noIssues}{' '}
              <Link to={expertisePath(lastExpertise)}>{w.openExpertise}</Link>
            </span>
          )}
          {original && !readOnly && (
            <button type="button" className="doc-btn doc-btn--small" onClick={restoreOriginal}>
              <RotateCcw size={14} aria-hidden="true" />
              {w.restoreOriginal}
            </button>
          )}
        </div>
      )}

      {readOnly && (
        <div className="doc-archive-note">
          {e.readOnlyArchive}
          <button type="button" className="doc-btn doc-btn--small" onClick={() => setStatus('filling')}>
            {e.unarchive}
          </button>
        </div>
      )}

      <div className="doc-toolbar" role="toolbar">
        <button type="button" className="doc-btn" onClick={() => setDialog('profile')} disabled={readOnly}>
          <UserRound size={16} aria-hidden="true" />
          {e.profileFill}
        </button>
        {template.id !== FREE_TEXT_ID && (
          <>
            <button
              type="button"
              className="doc-btn"
              onClick={() => {
                setAssistText('')
                setDialog('assist')
              }}
              disabled={readOnly}
            >
              <Sparkles size={16} aria-hidden="true" />
              {e.assist}
            </button>
            <button type="button" className="doc-btn" onClick={() => setDialog('photo')} disabled={readOnly}>
              <Camera size={16} aria-hidden="true" />
              {e.photo}
            </button>
          </>
        )}
        <button type="button" className="doc-btn doc-btn--accent" onClick={runCheck} disabled={checking || readOnly}>
          {checking ? <Loader2 size={16} className="doc-spin" aria-hidden="true" /> : <ScanSearch size={16} aria-hidden="true" />}
          {checking ? e.checking : e.check}
        </button>
        <button type="button" className="doc-btn doc-btn--accent" onClick={openExpertise} disabled={checking || readOnly}>
          <FileSearch size={16} aria-hidden="true" />
          {w.expertise}
        </button>
        <span className="doc-toolbar-gap" />
        <button type="button" className="doc-btn" onClick={saveDraft} disabled={readOnly || saveState === 'saving'}>
          <Save size={16} aria-hidden="true" />
          {w.saveDraft}
        </button>
        <button type="button" className="doc-btn" onClick={saveUserVersion} disabled={readOnly}>
          <Save size={16} aria-hidden="true" />
          {e.saveVersion}
        </button>
        <button type="button" className="doc-btn" onClick={() => setDialog('versions')}>
          <History size={16} aria-hidden="true" />
          {e.versions}
        </button>
        <div className="doc-menu">
          <button type="button" className="doc-btn" aria-expanded={dialog === 'export'} onClick={() => setDialog(dialog === 'export' ? null : 'export')}>
            <Download size={16} aria-hidden="true" />
            {e.export}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {dialog === 'export' && (
            <div className="doc-menu-list" role="menu">
              <button type="button" role="menuitem" onClick={() => exportAs('docx')}>
                <FileText size={15} aria-hidden="true" /> {e.docx}
              </button>
              <button type="button" role="menuitem" onClick={() => exportAs('pdf')}>
                <FileText size={15} aria-hidden="true" /> {e.pdf}
              </button>
              <button type="button" role="menuitem" onClick={() => exportAs('print')}>
                <Printer size={15} aria-hidden="true" /> {e.print}
              </button>
              <button type="button" role="menuitem" onClick={() => exportAs('copy')}>
                <ClipboardCopy size={15} aria-hidden="true" /> {e.copyText}
              </button>
            </div>
          )}
        </div>
        <button type="button" className="doc-btn doc-btn--primary" onClick={finish} disabled={readOnly}>
          <CheckCircle2 size={16} aria-hidden="true" />
          {e.finish}
        </button>
      </div>

      <div className="doc-mobile-switch" role="tablist">
        {['form', 'preview'].map((v) => (
          <button key={v} type="button" role="tab" aria-selected={mobileView === v} className={mobileView === v ? 'is-on' : undefined} onClick={() => setMobileView(v)}>
            {v === 'form' ? e.form : `${e.preview}${opened ? ` · ${opened}` : ''}`}
          </button>
        ))}
      </div>

      <div className={`doc-split doc-split--${mobileView}`}>
        <div className="doc-form">
          {template.sections.map((section) => (
            <section key={section.key} className="doc-form-section">
              <h2 className="doc-form-section-title">{section.title[lang]}</h2>
              <div className="doc-form-grid">
                {section.fields.map((field) => (
                  <FieldInput
                    key={field.key}
                    field={field}
                    value={values[field.key]}
                    onChange={(v) => changeValues({ [field.key]: v })}
                    readOnly={readOnly}
                    s={s}
                    lang={lang}
                    invalid={invalid.has(field.key)}
                    flash={flashKey === field.key}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="doc-side">
          <div className="doc-side-tabs" role="tablist">
            {[
              ['preview', e.preview],
              ['check', `${e.checkTab}${opened ? ` (${opened})` : ''}`],
              ['changes', e.changesTab],
            ].map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={rightTab === key} className={rightTab === key ? 'is-on' : undefined} onClick={() => setRightTab(key)}>
                {label}
              </button>
            ))}
          </div>
          <div className="doc-side-body">
            {rightTab === 'preview' && <DocumentPreview doc={rendered} lang={docLang} focusKey={flashKey} onPick={goTo} />}
            {rightTab === 'check' &&
              (checking ? (
                <p className="doc-check-empty">
                  <Loader2 size={18} className="doc-spin" aria-hidden="true" /> {e.checking}
                </p>
              ) : (
                <CheckPanel
                  check={check}
                  s={s}
                  lang={lang}
                  readOnly={readOnly}
                  onAccept={acceptIssue}
                  onReject={(issue) => decide(issue, 'rejected')}
                  onEdit={(issue) => {
                    decide(issue, 'edited')
                    goTo(issue.target)
                  }}
                  onGoTo={goTo}
                />
              ))}
            {rightTab === 'changes' && <ChangesPanel check={check} s={s} onGoTo={goTo} />}
          </div>
        </div>
      </div>

      {/* Printed alone: a direct child of <body>, every other child is hidden while printing. */}
      {createPortal(<div className="doc-print-root">{rendered && <DocumentPreview doc={rendered} lang={docLang} />}</div>, document.body)}

      {dialog === 'profile' && (
        <ProfileFillDialog
          template={template}
          values={values}
          profile={profile}
          lang={lang}
          s={s}
          onClose={() => setDialog(null)}
          onApply={async (patch, profilePatch) => {
            setDialog(null)
            if (Object.keys(patch).length) {
              changeValues(patch)
              showToast(e.filledFromProfile(Object.keys(patch).length), { type: 'success' })
            }
            if (profilePatch && user) {
              try {
                await saveProfileData(user.id, profilePatch)
                refreshProfile?.()
              } catch {
                showToast(e.saveFailed, { type: 'error' })
              }
            }
          }}
        />
      )}
      {dialog === 'assist' && (
        <AssistDialog
          template={template}
          values={values}
          lang={docLang}
          uiLang={lang}
          s={s}
          initialText={assistText}
          onClose={() => setDialog(null)}
          onApply={(patch) => {
            setDialog(null)
            changeValues(patch)
            showToast(e.filledFromAssist(Object.keys(patch).length), { type: 'success' })
          }}
        />
      )}
      {dialog === 'photo' && (
        <PhotoDialog
          s={s}
          onClose={() => setDialog(null)}
          onUseText={(text) => {
            setAssistText(text)
            setDialog('assist')
          }}
        />
      )}
      {dialog === 'versions' && (
        <VersionsDialog
          doc={doc}
          template={template}
          values={values}
          lang={lang}
          s={s}
          onClose={() => setDialog(null)}
          onRestore={(version) => {
            setDialog(null)
            setValues(version.values ?? {})
            setStatus('filling')
            showToast(s.versions.restored(version.version), { type: 'success' })
          }}
        />
      )}
    </div>
  )
}

/** «Создать»: a new document of the given type, then its editor. */
export function NewDocument() {
  const { templateId } = useParams()
  const [params] = useSearchParams()
  const { lang: uiLang } = useLanguage()
  const lang = uiLang === 'kk' ? 'kk' : 'ru'
  const { user } = useAuth()
  const navigate = useNavigate()
  const s = docStrings(lang)
  const [failed, setFailed] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    const template = templateById(templateId)
    if (!template || !user || started.current) return
    started.current = true
    if (template.engine === 'smart') {
      navigate('/account/smart-report/new', { replace: true })
      return
    }
    createDocument(user.id, { template_id: template.id, lang, title: template.title[lang], status: 'draft', values: {} })
      .then((row) => navigate(`/account/documents/${row.id}${params.get('mode') === 'text' ? '?mode=text' : ''}`, { replace: true }))
      .catch(() => setFailed(true))
  }, [templateId, user, lang, navigate, params])

  if (!templateById(templateId) || failed) {
    return (
      <div className="doc-page">
        <p className="doc-error">{failed ? s.errors.default : s.editor.unknownTemplate}</p>
        <Link to="/account/workspace/create" className="doc-btn">
          <ArrowLeft size={16} aria-hidden="true" /> {s.title}
        </Link>
      </div>
    )
  }
  return (
    <div className="doc-page doc-loading">
      <Loader2 size={22} className="doc-spin" aria-hidden="true" /> {s.editor.loading}
    </div>
  )
}
