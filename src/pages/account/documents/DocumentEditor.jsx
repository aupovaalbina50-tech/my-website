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
  AlertTriangle,
  CloudOff,
  HardDriveDownload,
  Link2,
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
import { documentText, formatValue, isEmptyValue, missingRequired, renderDocument } from './render.js'
import { documentToDocx, documentToPdf, downloadBlob, fileNameOf } from './exportDocument.js'
import { composeDocumentText, createDocument, loadDocVersions, loadDocument, saveDocVersion, saveProfileData, updateDocument } from './useDocuments.js'
import { contentHash, documentSource, expertisePath, loadDocumentExpertises, saveEditorExpertise } from '../../workspace/documentModel.js'
import { activeItems, applyItem, counts, expertiseState, forStorage, marksOf, readExpertise, setItemStatus, undoLast } from '../../workspace/expertise/model.js'
import { runExpertise } from '../../workspace/expertise/runExpertise.js'
import { ChangesList, ExpertisePanel } from '../../workspace/expertise/ExpertisePanel.jsx'
import { dataBasis, fieldOrigin, narrativeFields, questions, readFlow, STAGES, unconfirmed, withFlow } from '../../workspace/constructor/flow.js'
import { CompletePanel, DraftPanel, ExportPanel, InfoPanel, WizardSteps } from '../../workspace/constructor/WizardPanels.jsx'
import { docStrings } from './strings.js'
import FieldInput from './FieldInput.jsx'
import DocumentPreview from './DocumentPreview.jsx'
import { AssistDialog, PhotoDialog, ProfileFillDialog } from './Dialogs.jsx'
import { VersionsPanel } from '../../workspace/versions/VersionsPanel.jsx'
import { LinkedDocumentsPanel } from '../../workspace/links/LinkedDocumentsPanel.jsx'
import { useDocumentLinks } from '../../workspace/links/useDocumentLinks.js'
import { applyTransfer } from '../../workspace/links/consistency.js'
import { contentKey, isOffline, isRealConflict, reconcile } from '../../workspace/drafts/reconcile.js'
import { deleteDraftIf, getDraft, putDraft, saveEmergency } from '../../workspace/drafts/localDrafts.js'
import { recordOpen } from '../../workspace/drafts/recent.js'
import { ConflictDialog } from '../../workspace/drafts/ConflictDialog.jsx'
import '../../workspace/drafts/drafts.css'

// The universal editor of «Конструктор профессиональной документации».
// Left: the template's sections as a form; right: the live preview, the check
// and the accepted changes. Every document type works through this one
// editor — the template configuration decides what is shown.

const SAVE_DELAY = 900
// The copy on this device follows the text faster than the server save.
const DRAFT_DELAY = 300
// While the server cannot be reached, the save is retried this often.
const RETRY_EVERY = 20_000

/** The check as stored: older rows may hold a bare array. */
// The expertise result is stored with the document (issues); an old-format check of the constructor is not shown.
const readCheck = (raw) => readExpertise(raw)
const savePayload = (values, title, lang, status, check) => ({ values, title, lang, status, issues: forStorage(check) ?? [], issue_count: counts(check, values).all, content_hash: contentHash(values) })

// One editor per document: opening another document mounts a fresh editor
// (the previous one saves on the way out), so one document's text can never
// land in another.
export default function DocumentEditorRoute() {
  const { id } = useParams()
  return <DocumentEditor key={id} />
}

function DocumentEditor() {
  const { id } = useParams()
  const { lang: uiLang, t } = useLanguage()
  const lang = uiLang === 'kk' ? 'kk' : 'ru'
  const s = docStrings(lang)
  const e = s.editor
  const w = t.workspace.editor
  const x = t.workspace.expertise
  const [checkFailure, setCheckFailure] = useState(null)
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const wz = t.workspace.wizard
  const [composing, setComposing] = useState(false)
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
  const [dialog, setDialog] = useState(null) // 'profile' | 'assist' | 'photo' | 'versions' | 'links' | 'export'
  const [assistText, setAssistText] = useState('')
  const loaded = useRef(false)
  // What is stored now: opening a document must not count as a change (it would move updated_at).
  const lastSaved = useRef(null)
  const [original, setOriginal] = useState(null) // version «original»: the source text
  // Fingerprint of the text of the newest saved version (a version on leaving only when it differs).
  const lastVersionHash = useRef(null)
  const autoCheck = useRef(false)
  // Number of the newest version. Reserved synchronously, so two versions saved one right
  // after the other (original + checked) never get the same number.
  const versionNo = useRef(0)
  const latest = useRef({})
  const [lastExpertise, setLastExpertise] = useState(null)
  // Server state the editor builds on: updated_at of the row (optimistic lock)
  // and the content it confirmed. A conflict blocks automatic writes until
  // the user chose a version.
  const serverAt = useRef(null)
  const confirmed = useRef(null)
  const blocked = useRef(false)
  const [conflict, setConflict] = useState(null) // { server, mine, mineAt }
  const [resolving, setResolving] = useState(false)
  const [restoredAt, setRestoredAt] = useState(null)

  const template = doc ? templateById(doc.template_id) : null
  // While two versions wait for the user's choice nothing can be edited (or overwritten).
  const readOnly = status === 'archive' || saveState === 'conflict'
  const dr = t.workspace.drafts
  // «Связанные документы»: links, cards, comparison; the banner when a linked document changed.
  const links = useDocumentLinks(id, values)


  useEffect(() => {
    let alive = true
    loaded.current = false
    loadDocument(id)
      .then(async (row) => {
        if (!alive) return
        if (!row) return setLoadError('notFound')
        // A copy of this document on this device (unsaved edits from before a reload / without connection).
        const copy = user ? await getDraft(user.id, row.id).catch(() => null) : null
        if (!alive) return
        if (user) recordOpen(user.id, row.id)
        serverAt.current = row.updated_at
        confirmed.current = contentKey(row)
        const action = reconcile(row, copy)
        // Every copy of this document on this device is obsolete: the server holds the text.
        if (action === 'discard') deleteDraftIf(user.id, row.id, null).catch(() => {})
        if (action === 'conflict') {
          blocked.current = true
          setConflict({ server: row, mine: copy.payload, mineAt: copy.savedAt, open: true })
          setSaveState('conflict')
        }
        setDoc(row)
        versionNo.current = row.current_version ?? 0
        setValues(row.values ?? {})
        setTitle(row.title ?? '')
        setDocLang(row.lang ?? 'ru')
        // «На проверке» left by a check that never finished (the page was closed): the stored result decides.
        const stored = readCheck(row.issues)
        const rowStatus = row.status === 'review' ? (stored ? (counts(stored, row.values ?? {}).all ? 'issues' : 'checked') : 'filling') : (row.status ?? 'draft')
        setStatus(rowStatus)
        setCheck(stored)
        lastSaved.current = JSON.stringify(savePayload(row.values ?? {}, row.title ?? '', row.lang ?? 'ru', row.status ?? 'draft', stored))
        autoCheck.current = params.get('check') === '1'
        // The step the user was on; «Описать ситуацию» opens the description.
        const flow = readFlow(row.values)
        if (params.get('mode') === 'text') {
          setValues((v) => withFlow(v, { method: 'text', stage: 'info' }))
          setRightTab('info')
          setParams({}, { replace: true })
        } else setRightTab(STAGES.includes(flow.stage) ? flow.stage : 'info')
        // Links of «История»: ?panel=versions opens the versions, ?panel=check the expertise.
        if (params.get('panel') === 'versions') setDialog('versions')
        else if (params.get('panel') === 'check' && stored) setRightTab('check')
        // Unsaved edits made on top of the text the server still holds: back in the editor, saved by the autosave.
        if (action === 'restore') {
          setValues(copy.payload.values ?? {})
          setTitle(copy.payload.title ?? '')
          setDocLang(copy.payload.lang ?? 'ru')
          setRestoredAt(copy.savedAt)
        }
        // Let the first render pass before changes count as edits.
        setTimeout(() => (loaded.current = true), 0)
      })
      .catch(() => alive && setLoadError('notFound'))
    // The source text and the last terminology expertise (not needed to edit).
    loadDocVersions(id)
      .then((versions) => {
        if (!alive) return
        setOriginal(versions.filter((v) => v.kind === 'original').at(-1) ?? null)
        lastVersionHash.current = versions[0] ? contentHash(versions[0].values) : null
      })
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
  // Saves go one after another (never two requests at once, so an older text can
  // never land after a newer one), and each takes the newest text when it starts.
  // «Сохранено» is shown only when the database confirmed exactly the text on screen.
  const wantKey = useRef(null)
  const queue = useRef(Promise.resolve())
  /**
   * One write of this document, only on top of the row the editor knows
   * (updated_at). A refused write is a conflict only when the content on the
   * server is not the content this editor confirmed: a version number or a
   * status changed elsewhere just moves updated_at, and the write is retried.
   */
  const writeNow = async (fields) => {
    const d = latest.current.doc
    if (blocked.current) throw Object.assign(new Error('conflict'), { code: 'conflict' })
    try {
      const r = await updateDocument(d.id, fields, serverAt.current)
      serverAt.current = r.updated_at
      return r
    } catch (err) {
      if (err.code !== 'conflict') throw err
      const server = await loadDocument(d.id)
      if (server && !isRealConflict(server, confirmed.current)) {
        serverAt.current = server.updated_at
        const r = await updateDocument(d.id, fields, serverAt.current)
        serverAt.current = r.updated_at
        return r
      }
      throw Object.assign(err, { server })
    }
  }
  const write = (fields) => enqueue(() => writeNow(fields))
  const persist = () => {
    const run = async () => {
      const { values: v, title: tt, docLang: dl, status: st, check: ck, doc: d } = latest.current
      const payload = savePayload(v, tt, dl, st, ck)
      const key = JSON.stringify(payload)
      if (key === lastSaved.current) return
      await writeNow(payload)
      lastSaved.current = key
      confirmed.current = contentKey({ values: v, title: tt, lang: dl })
      // The server holds this text now: the copy on this device is no longer needed (a newer copy stays).
      if (user) deleteDraftIf(user.id, d.id, confirmed.current).catch(() => {})
    }
    return enqueue(run)
  }
  /** What a failed save means for the user: conflict / no connection / error. */
  const failed = (err) => {
    if (err?.code === 'conflict') {
      blocked.current = true
      const { values: v, title: tt, docLang: dl } = latest.current
      if (err.server) setConflict({ server: err.server, mine: { values: v, title: tt, lang: dl }, mineAt: null, open: true })
      setSaveState('conflict')
    } else setSaveState(isOffline(err) ? 'offline' : 'error')
  }
  /** Any write of this document waits for the previous one. */
  const enqueue = (fn) => {
    const next = queue.current.then(fn, fn)
    queue.current = next.catch(() => {})
    return next
  }
  useEffect(() => {
    if (!loaded.current || !doc) return
    const key = JSON.stringify(savePayload(values, title, docLang, status, check))
    wantKey.current = key
    if (key === lastSaved.current) {
      setSaveState((st) => (st === 'saving' ? 'saved' : st))
      return
    }
    // The copy on this device first: it survives a reload, a closed tab and a lost connection.
    const draftTimer = setTimeout(() => {
      if (user) putDraft(user.id, doc.id, { payload: { values, title, lang: docLang, status }, baseContent: confirmed.current, templateId: doc.template_id }).catch(() => {})
    }, DRAFT_DELAY)
    if (blocked.current) {
      clearTimeout(draftTimer)
      return
    }
    setSaveState((st) => (st === 'offline' ? st : 'saving'))
    const timer = setTimeout(() => {
      persist()
        .then(() => wantKey.current === lastSaved.current && setSaveState('saved'))
        .catch((err) => wantKey.current !== lastSaved.current && failed(err))
    }, SAVE_DELAY)
    return () => {
      clearTimeout(timer)
      clearTimeout(draftTimer)
    }
    // persist reads the newest state from `latest`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, title, docLang, status, check, doc])

  latest.current = { values, doc, saveState, title, docLang, status, check }
  const userRef = useRef(user)
  userRef.current = user
  // Lost connection: retry as soon as it is back; leaving with unsaved changes asks first.
  useEffect(() => {
    const online = () => ['error', 'offline'].includes(latest.current.saveState) && saveNowRef.current?.()
    const unload = (ev) => {
      if (latest.current.saveState === 'saved') return
      ev.preventDefault()
      ev.returnValue = ''
    }
    // The page is left (reload, closed tab, another address): the unsaved text is copied at once.
    const leave = () => {
      const { values: v, title: tt, docLang: dl, status: st, doc: d, saveState: ss } = latest.current
      if (!loaded.current || !d || !userRef.current || ss === 'saved' || blocked.current) return
      saveEmergency(userRef.current.id, d.id, { payload: { values: v, title: tt, lang: dl, status: st }, baseContent: confirmed.current, templateId: d.template_id })
    }
    window.addEventListener('online', online)
    window.addEventListener('beforeunload', unload)
    window.addEventListener('pagehide', leave)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('beforeunload', unload)
      window.removeEventListener('pagehide', leave)
    }
  }, [])
  // No connection / failed save: retried every RETRY_EVERY while the browser says it is online.
  useEffect(() => {
    if (saveState !== 'error' && saveState !== 'offline') return
    const timer = setInterval(() => navigator.onLine && saveNowRef.current?.(), RETRY_EVERY)
    return () => clearInterval(timer)
  }, [saveState])
  // Leaving the editor (another page, another document): unsaved text is saved on the way
  // out — the copy on this device stays until the server confirms it — and the text is kept
  // as a version when it differs from the newest one (one version per session of work).
  useEffect(
    () => () => {
      const { values: v, doc: d } = latest.current
      if (!loaded.current || !d || blocked.current) return
      persist().catch(() => {})
      if (!Object.keys(v ?? {}).some((k) => !k.startsWith('__') && v[k] !== '' && v[k] != null)) return
      if (contentHash(v) === lastVersionHash.current) return
      enqueue(() => saveDocVersion({ ...d, current_version: versionNo.current++ }, v, 'user', onLeaveNote.current, writeNow)).catch(() => {})
    },
    // persist / enqueue / writeNow read the newest state from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  /** Saves at once (the autosave waits for a pause); true only when the database confirmed it. */
  const saveNow = async () => {
    if (blocked.current) {
      setSaveState('conflict')
      return false
    }
    setSaveState('saving')
    try {
      await persist()
      setSaveState(wantKey.current === lastSaved.current ? 'saved' : 'saving')
      return true
    } catch (err) {
      failed(err)
      return false
    }
  }
  const saveNowRef = useRef(null)
  saveNowRef.current = saveNow
  const onLeaveNote = useRef('')
  onLeaveNote.current = t.workspace.versions.onLeave

  /** A version with a reason; remembers its fingerprint. */
  const keepVersion = async (v, kind, note = null) => {
    const version = await saveDocVersion({ ...(latest.current.doc ?? doc), current_version: versionNo.current++ }, v, kind, note, write)
    setDoc((d) => ({ ...d, current_version: Math.max(d.current_version ?? 0, version) }))
    lastVersionHash.current = contentHash(v)
    return version
  }

  /** Transfer of values the user chose in «Связанные документы»: a version first, then exactly these fields. */
  const transferFrom = async (items, source) => {
    const lt = t.workspace.links
    try {
      await keepVersion(values, 'user', lt.beforeTransfer(source.title))
    } catch {
      showToast(w.saveFailed, { type: 'error' })
      return false
    }
    setValues((v) => applyTransfer(v, items, source))
    showToast(lt.transferred(items.length), { type: 'success' })
    return true
  }

  // ---- two versions: the user chooses, the other one is kept as a version ----
  const adoptServer = (server) => {
    blocked.current = false
    serverAt.current = server.updated_at
    confirmed.current = contentKey(server)
    versionNo.current = Math.max(versionNo.current, server.current_version ?? 0)
  }
  const keepMine = async () => {
    const { server, mine } = conflict
    setResolving(true)
    try {
      adoptServer(server)
      // The text on the server is kept as a version before it is replaced.
      await keepVersion(server.values ?? {}, 'user', dr.serverKept)
      setValues(mine.values ?? {})
      setTitle(mine.title ?? '')
      setDocLang(mine.lang ?? 'ru')
      lastSaved.current = null
      setConflict(null)
      setSaveState('saving')
      setTimeout(() => saveNowRef.current?.(), 0)
    } catch (err) {
      failed(err)
    } finally {
      setResolving(false)
    }
  }
  const takeServer = async () => {
    const { server, mine } = conflict
    setResolving(true)
    try {
      adoptServer(server)
      // Your text is kept as a version: nothing is lost.
      await keepVersion(mine.values ?? {}, 'user', dr.mineKept)
      const stored = readCheck(server.issues)
      lastSaved.current = JSON.stringify(savePayload(server.values ?? {}, server.title ?? '', server.lang ?? 'ru', server.status ?? 'draft', stored))
      setValues(server.values ?? {})
      setTitle(server.title ?? '')
      setDocLang(server.lang ?? 'ru')
      setStatus(server.status ?? 'draft')
      setCheck(stored)
      if (user) deleteDraftIf(user.id, server.id, null).catch(() => {})
      setConflict(null)
      setSaveState('saved')
    } catch (err) {
      failed(err)
    } finally {
      setResolving(false)
    }
  }

  const saveDraft = async () => {
    const ok = await saveNow()
    showToast(ok ? w.draftSaved : w.saveFailed, { type: ok ? 'success' : 'error' })
  }


  /** «Вернуть исходный текст»: the current text is kept as a version first. */
  const restoreOriginal = async () => {
    if (!original || !window.confirm(w.restoreConfirm)) return
    try {
      await keepVersion(values, 'user', t.workspace.versions.beforeRestore(original.version))
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
      setValues((current) => {
        const next = { ...current, ...patch }
        // A value the user typed is theirs: it leaves the «from the description, to check» list.
        const fromText = readFlow(current).fromText ?? {}
        if (!Object.keys(patch).some((k) => k in fromText)) return next
        return withFlow(next, { fromText: Object.fromEntries(Object.entries(fromText).filter(([k]) => !(k in patch))) })
      })
      // A filled required field resolves its «не заполнено» remark.
      const fields = fieldsOf(template)
      const filled = (key) => key in patch && !isEmptyValue(fields.find((f) => f.key === key) ?? {}, patch[key])
      const resolves = (i) => i.basis?.rule === 'missing' && i.status === 'open' && filled(i.target)
      setCheck((c) => (c?.items.some(resolves) ? { ...c, items: c.items.map((i) => (resolves(i) ? { ...i, status: 'edited' } : i)) } : c))
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

  // «Перейти к фрагменту»: the field, and the exact range selected when it still holds.
  const goTo = useCallback((path, range = null) => {
    const key = String(path).split('.')[0]
    setMobileView('form')
    setFlashKey(key)
    requestAnimationFrame(() => {
      const box = document.querySelector(`[data-field="${key}"]`)
      box?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const input = document.querySelector(`[data-path="${path}"]`) ?? box?.querySelector('textarea, input, select')
      input?.focus?.({ preventScroll: true })
      if (range && input && typeof input.setSelectionRange === 'function' && input.value.slice(range.start, range.end) === range.fragment) {
        input.setSelectionRange(range.start, range.end)
      }
    })
    setTimeout(() => setFlashKey((k) => (k === key ? null : k)), 1800)
  }, [])
  // The remark chosen in the panel or in the text; its fragment is selected in the field.
  const [activeRemark, setActiveRemark] = useState(null)
  const goToItem = (item) => {
    if (item.id) setActiveRemark(item.id)
    goTo(item.target, item.start != null ? { start: item.start, end: item.end, fragment: item.fragment } : null)
  }
  /** A marked fragment was clicked: its card opens in the expertise panel. */
  const openRemark = useCallback((remarkId) => {
    setActiveRemark(remarkId)
    setRightTab('check')
    setMobileView('preview')
  }, [])
  // Open remarks located in the current text, by field (nothing when the text changed since).
  const marks = useMemo(() => (check ? marksOf(check, values) : new Map()), [check, values])

  // ---- expertise ----
  // «Проверить документ» / «Повторить экспертизу»: always the CURRENT text.
  const runCheck = async () => {
    if (!template) return
    setChecking(true)
    setCheckFailure(null)
    // The expertise is step 7: the document reopens there.
    setStage('check')
    const prevStatus = status
    // «На проверке» while it runs — stored at once, so «Мои документы» shows it too.
    setStatus('review')
    write({ status: 'review' }).catch(() => {})
    try {
      if (!doc.current_version) await keepVersion(values, 'original')
    } catch {
      // A failed snapshot must not block the check itself.
    }
    let next
    try {
      next = await runExpertise({ template, values, docLang, uiLang: lang, documentTitle: template.title[docLang], strings: s.checkPanel })
    } catch (err) {
      console.error('Expertise failed:', err)
      next = null
    }
    setChecking(false)
    const state = next ? expertiseState(next, values) : 'error'
    if (state === 'error') {
      // Nothing finished: the previous result stays as it was, marked by its own date.
      setStatus(prevStatus)
      write({ status: prevStatus }).catch(() => {})
      setCheckFailure(x.failedAll)
      showToast(x.failedAll, { type: 'error' })
      return
    }
    // The checked text is kept as a version: the result belongs to exactly that edition.
    const open = counts(next, values).all
    try {
      next.version = await keepVersion(values, 'checked', t.workspace.versions.afterCheck(open))
    } catch {
      next.version = null
    }
    const hash = contentHash(values)
    const nextStatus = open ? 'issues' : 'checked'
    setCheck(next)
    if (state === 'needs_review') setCheckFailure(x.failedPart)
    setStatus(nextStatus)
    setDoc((d) => ({ ...d, checked_at: next.at, checked_hash: hash, content_hash: hash }))
    // The checked text itself goes with the result, so «saved» is true of exactly this text.
    const checkedPayload = savePayload(values, title, docLang, nextStatus, next)
    write({ ...checkedPayload, checked_at: next.at, checked_hash: hash })
      .then(() => {
        lastSaved.current = JSON.stringify(checkedPayload)
        confirmed.current = contentKey({ values, title, lang: docLang })
        if (user) deleteDraftIf(user.id, doc.id, confirmed.current).catch(() => {})
      })
      .catch(failed)
    showToast(x.state[state], { type: 'success' })
    if (user) saveEditorExpertise(user.id, doc, title || template.title[docLang], next, values).then((row) => row && setLastExpertise(row)).catch((err) => console.error('Expertise history was not saved:', err))
  }

  // After the last open remark is decided, the text is kept as «Версия после проверки».
  useEffect(() => {
    if (!check || check.savedChecked || !check.items.length || activeItems(check, values).length || !(check.changes ?? []).length || !doc) return
    setCheck((c) => ({ ...c, savedChecked: true }))
    // Every remark is decided; the text changed, so it shows as «изменён после проверки» until re-checked.
    setStatus((st) => (st === 'issues' ? 'checked' : st))
    keepVersion(values, 'user', t.workspace.versions.afterRemarks).catch(() => {})
    // keepVersion is recreated each render; the trigger is the check itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [check, doc, values])

  // «Проверить документ» from «Мои документы» (?check=1): the saved text, right after opening.
  useEffect(() => {
    if (!autoCheck.current || !doc || !template || checking) return
    autoCheck.current = false
    setParams({}, { replace: true })
    runCheck()
    // runs once, when the document has loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, template])

  /** Applies one remark to exactly its range; refuses when the text changed since the check. */
  const applyRemark = (item, replacement, how) => {
    const out = applyItem(check, values, item.id, replacement, how)
    if (out.error) {
      showToast(x.applyStale, { type: 'error' })
      return
    }
    setValues(out.values)
    setCheck(out.check)
    setStatus((st) => (st === 'ready' ? 'filling' : st))
    showToast(x.accepted, { type: 'success' })
  }
  const undoChange = () => {
    const out = undoLast(check, values)
    if (out.error) return showToast(x.undoStale, { type: 'error' })
    setValues(out.values)
    setCheck(out.check)
    showToast(x.undone, { type: 'success' })
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
      await keepVersion(values, 'final')
      showToast(e.finished, { type: 'success' })
    } catch {
      showToast(e.saveFailed, { type: 'error' })
    }
  }

  const saveUserVersion = async () => {
    try {
      const version = await keepVersion(values, 'user')
      showToast(e.versionSaved(version), { type: 'success' })
    } catch {
      showToast(e.saveFailed, { type: 'error' })
    }
  }

  const exportAs = async (kind) => {
    setDialog(null)
    // The export is the current text, saved first.
    if (!(await saveNow())) {
      showToast(w.saveFailed, { type: 'error' })
      return
    }
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

  // ---- constructor steps ----
  const setStage = (stage) => {
    setRightTab(stage)
    setMobileView('preview')
    setValues((v) => (readFlow(v).stage === stage ? v : withFlow(v, { stage })))
  }

  /** «Сформировать проект»: the narrative fields from the confirmed data; the user's own text only when they agreed. */
  const compose = async ({ replace }) => {
    const flow = readFlow(values)
    const narrative = narrativeFields(template)
    const include = new Set(narrative.filter((f) => ['empty', 'generated'].includes(fieldOrigin(f.key, values)) || replace.includes(f.key)).map((f) => f.key))
    const fields = fieldsOf(template)
      .map((f) => ({ key: f.key, label: f.label[docLang], hint: f.hint?.[docLang] ?? '', value: isEmptyValue(f, values[f.key]) ? '' : formatValue(f, values[f.key]), compose: include.has(f.key) }))
      .filter((f) => f.compose || f.value)
    if (!fields.some((f) => f.compose)) return
    if (!fields.some((f) => !f.compose && f.value) && !flow.brief.trim() && !fields.some((f) => f.compose && f.value)) {
      showToast(wz.draftMissing(questions(template, values).length), { type: 'error' })
      return
    }
    setComposing(true)
    let out
    try {
      out = await composeDocumentText({ fields, brief: flow.brief, documentTitle: template.title[docLang], lang: docLang })
    } catch (err) {
      setComposing(false)
      showToast(err?.code === 'bad_request' ? wz.composeUnavailable : `${wz.composeFailed} (${err?.code ?? 'error'})`, { type: 'error' })
      return
    }
    setComposing(false)
    const at = new Date().toISOString()
    const patch = {}
    const gen = {}
    const outcome = {}
    for (const f of narrative) {
      const section = out.sections?.find((sec) => sec.key === f.key)
      if (!include.has(f.key)) {
        outcome[f.key] = { status: 'kept' }
        continue
      }
      outcome[f.key] = section ? { status: section.status, missing: section.missing, inventedNumbers: section.inventedNumbers ?? [], unknownNames: section.unknownNames ?? [] } : { status: 'insufficient' }
      // Only a checked fragment goes in; an empty or rejected one leaves the field as it was.
      if (section?.status === 'ok' && section.text) {
        patch[f.key] = section.text
        gen[f.key] = { text: section.text, at }
      }
    }
    if (Object.keys(patch).length) changeValues(patch)
    setValues((v) => withFlow(v, { gen: { ...(readFlow(v).gen ?? {}), ...gen }, genBasis: dataBasis(template, { ...v, ...patch }), outcome }))
    if (Object.keys(patch).length) showToast(wz.composed, { type: 'success' })
    else showToast(wz.composedNothing, { type: 'error' })
  }

  const saveCurrentVersion = async () => {
    try {
      await keepVersion(values, 'user', t.workspace.versions.beforeRegenerate)
      showToast(wz.versionSaved, { type: 'success' })
      return true
    } catch {
      showToast(e.saveFailed, { type: 'error' })
      return false
    }
  }

  // ---- render ----
  if (loadError) {
    return (
      <div className="doc-page">
        <p className="doc-error">{e.notFound}</p>
        <Link to="/account/workspace/documents" className="doc-btn">
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
  const opened = counts(check, values).all

  return (
    <div className="doc-page doc-editor">
      <header className="doc-editor-head">
        <Link to="/account/workspace/documents" className="doc-back">
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
            {{ saving: e.saving, error: e.saveFailed, offline: dr.offlineShort, conflict: dr.conflictShort }[saveState] ?? e.saved}
            {(saveState === 'error' || saveState === 'offline') && (
              <button type="button" className="exp-link doc-save-retry" onClick={saveNow}>
                {e.retrySave}
              </button>
            )}
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

      {saveState === 'offline' && (
        <div className="draft-notice draft-notice--offline" role="status">
          <p>
            <CloudOff size={16} aria-hidden="true" /> {dr.offline}
          </p>
        </div>
      )}
      {saveState === 'conflict' && !conflict?.open && conflict && (
        <div className="draft-notice draft-notice--conflict" role="alert">
          <p>
            <AlertTriangle size={16} aria-hidden="true" /> {dr.conflict}
          </p>
          <button type="button" className="doc-btn doc-btn--small" onClick={() => setConflict((cf) => ({ ...cf, open: true }))}>
            {dr.compare}
          </button>
        </div>
      )}
      {restoredAt && (
        <div className="draft-notice draft-notice--restored" role="status">
          <p>
            <HardDriveDownload size={16} aria-hidden="true" /> {dr.restored(new Date(restoredAt).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU'))}
          </p>
          <button type="button" className="doc-btn doc-btn--small" onClick={() => setRestoredAt(null)}>
            {dr.dismiss}
          </button>
        </div>
      )}

      {links.attention > 0 && (
        <div className="lnk-banner" role="status">
          <p>
            <Link2 size={16} aria-hidden="true" /> {t.workspace.links.banner(links.attention)}
          </p>
          <button type="button" className="doc-btn doc-btn--small" onClick={() => setDialog('links')}>
            {t.workspace.links.bannerOpen}
          </button>
        </div>
      )}

      {(source.origin === 'upload' || original || lastExpertise) && (
        <div className="doc-source-bar">
          {source.origin === 'upload' && <span className="doc-source-file">{w.uploadedFrom(source.fileName)}</span>}
          {lastExpertise && (
            <span className="doc-source-expertise">
              {w.lastExpertise}: {new Date(lastExpertise.created_at).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU')} ·{' '}
              {lastExpertise.issue_count > 0 ? t.workspace.activity.issues(lastExpertise.issue_count) : t.workspace.activity.noIssues}{' '}
              {lastExpertise.kind !== 'editor' && <Link to={expertisePath(lastExpertise)}>{w.openExpertise}</Link>}
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
          {checking ? e.checking : check ? x.rerun : x.run}
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
        <button type="button" className="doc-btn" onClick={() => setDialog('links')}>
          <Link2 size={16} aria-hidden="true" />
          {t.workspace.links.button}
          {links.items.length > 0 && <span className="doc-count">{links.items.length}</span>}
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

      <WizardSteps
        stage={rightTab === 'changes' ? 'check' : rightTab}
        onStage={setStage}
        w={wz}
        templateTitle={template.title[lang]}
        method={readFlow(values).method}
        onChangeType={() => navigate('/account/workspace/create')}
        counts={{ complete: questions(template, values).length + unconfirmed(template, values).length, check: opened }}
      />

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
                    marks={marks.get(field.key)}
                    activeMark={activeRemark}
                    onMark={openRemark}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="doc-side">
          {(rightTab === 'check' || rightTab === 'changes') && (
            <div className="doc-side-tabs" role="tablist">
              {[
                ['check', `${x.tab}${opened ? ` (${opened})` : ''}`],
                ['changes', x.changesTab],
              ].map(([key, label]) => (
                <button key={key} type="button" role="tab" aria-selected={rightTab === key} className={rightTab === key ? 'is-on' : undefined} onClick={() => setRightTab(key)}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="doc-side-body">
            {rightTab === 'info' && (
              <InfoPanel
                template={template}
                values={values}
                w={wz}
                readOnly={readOnly}
                onMethod={(method) => setValues((v) => withFlow(v, { method }))}
                onBrief={(brief) => setValues((v) => withFlow(v, { brief }))}
                onExtract={() => {
                  setAssistText(readFlow(values).brief)
                  setDialog('assist')
                }}
              />
            )}
            {rightTab === 'complete' && (
              <CompletePanel
                template={template}
                values={values}
                w={wz}
                lang={lang}
                readOnly={readOnly}
                onAnswer={(field, value) => changeValues({ [field.key]: value })}
                onGoTo={(key) => goTo(key)}
                onConfirm={(key) => setValues((v) => withFlow(v, { fromText: Object.fromEntries(Object.entries(readFlow(v).fromText ?? {}).filter(([k]) => k !== key)) }))}
              />
            )}
            {rightTab === 'draft' && (
              <DraftPanel
                template={template}
                values={values}
                w={wz}
                lang={lang}
                readOnly={readOnly}
                busy={composing}
                outcome={readFlow(values).outcome}
                basisChanged={readFlow(values).genBasis !== null && readFlow(values).genBasis !== dataBasis(template, values)}
                onCompose={compose}
                onSaveVersion={saveCurrentVersion}
                onGoTo={(key) => goTo(key)}
              />
            )}
            {rightTab === 'export' && (
              <ExportPanel template={template} values={values} rendered={rendered} docLang={docLang} w={wz} lang={lang} saving={saveState === 'saving'} onExport={exportAs} onGoTo={(key) => goTo(key)} />
            )}
            {rightTab === 'preview' && (
              <DocumentPreview doc={rendered} lang={docLang} focusKey={flashKey} onPick={goTo} marks={marks} activeMark={activeRemark} onMark={openRemark} markTitle={x.qc.openRemark} />
            )}
            {rightTab === 'check' && (
              <ExpertisePanel
                check={check}
                values={values}
                outdated={Boolean(doc.checked_hash && doc.checked_hash !== contentHash(values))}
                running={checking}
                failure={checkFailure}
                x={x}
                errorTypes={t.inspector.errorTypes}
                lang={lang}
                readOnly={readOnly}
                activeId={activeRemark}
                onRun={runCheck}
                onAccept={(item) => applyRemark(item, item.suggestion, 'accepted')}
                onManual={(item, text) => applyRemark(item, text, 'edited')}
                onReject={(item) => setCheck((c) => setItemStatus(c, item.id, 'rejected'))}
                onReopen={(item) => setCheck((c) => setItemStatus(c, item.id, 'open'))}
                onGoTo={goToItem}
              />
            )}
            {rightTab === 'changes' && <ChangesList check={check} values={values} x={x} readOnly={readOnly} onUndo={undoChange} onGoTo={goToItem} />}
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
          onApply={(patch, meta = {}) => {
            setDialog(null)
            changeValues(patch)
            // Values from the description stay «to check» until the user marks them; the description itself is kept.
            setValues((v) => {
              const flow = readFlow(v)
              return withFlow(v, { fromText: { ...(flow.fromText ?? {}), ...(meta.quotes ?? {}) }, brief: flow.brief || meta.text || '' })
            })
            showToast(e.filledFromAssist(Object.keys(patch).length), { type: 'success' })
            setStage('complete')
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
      {conflict?.open && (
        <ConflictDialog
          template={template}
          server={conflict.server}
          mine={conflict.mine}
          mineAt={conflict.mineAt}
          lang={lang}
          c={dr.conflictDialog}
          busy={resolving}
          onKeepMine={keepMine}
          onTakeServer={takeServer}
          onLater={() => setConflict((cf) => ({ ...cf, open: false }))}
        />
      )}
      {dialog === 'links' && (
        <LinkedDocumentsPanel
          self={{ id: doc.id, title: title || template.title[docLang], template, values, lang: docLang }}
          links={links}
          readOnly={readOnly}
          onTransfer={transferFrom}
          onClose={() => {
            setDialog(null)
            links.reload()
          }}
        />
      )}
      {dialog === 'versions' && (
        <VersionsPanel
          doc={doc}
          template={template}
          values={values}
          docLang={docLang}
          lang={lang}
          v={t.workspace.versions}
          onClose={() => setDialog(null)}
          onExport={async (item) => {
            if (item.id === 'current') return exportAs('docx')
            try {
              const r = renderDocument(template, item.values ?? {}, docLang)
              downloadBlob(await documentToDocx(r, docLang), fileNameOf(`${title || template.title[docLang]} v${item.version}`, 'docx'))
            } catch {
              showToast(e.exportFailed, { type: 'error' })
            }
          }}
          onRestore={async (version) => {
            const vs = t.workspace.versions
            if (!window.confirm(vs.restoreConfirm(version.version))) return
            try {
              // The current text first becomes a version of its own — nothing is lost.
              await keepVersion(values, 'user', vs.beforeRestore(version.version))
            } catch {
              showToast(w.saveFailed, { type: 'error' })
              return
            }
            setDialog(null)
            setValues(version.values ?? {})
            setStatus('filling')
            showToast(vs.restored(version.version), { type: 'success' })
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
