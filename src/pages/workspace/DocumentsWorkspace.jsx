import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, NavLink, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardCheck,
  FilePlus2,
  FileSearch,
  FolderOpen,
  History,
  Library,
  Lock,
  RotateCcw,
  Scale,
  ExternalLink,
  ChevronDown,
  Search,
  X,
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { useAuth } from '../../auth/AuthContext.jsx'
import SiteSectionLayout from '../../components/SiteSectionLayout.jsx'
import DocsContent from '../shared/DocsContent.jsx'
import DocInspector from '../shared/docInspector/DocInspector.jsx'
import MyDocuments from './MyDocuments.jsx'
import { CatalogView, CreateView } from '../account/documents/DocumentBuilderPage.jsx'
import { templateById } from '../account/documents/catalog/index.js'
import { expertisePath, useWorkspaceActivity } from './documentModel.js'
import { readExpertise } from './expertise/model.js'
import { OFFICIAL_SITES } from './sources/registry.js'
import './documentsWorkspace.css'

// «Центр работы со служебными документами»: one working environment of
// separate screens with one navigation —
//   /account/workspace            → /account/workspace/create
//   /account/workspace/create     Создание документа (умный рапорт, недавние документы)
//   /account/workspace/catalog    Каталог документов и форм
//   /account/workspace/documents  Мои документы
//   /account/workspace/check      Проверка готового документа (без пункта в навигации)
//   /account/workspace/history    Нормативные источники и история изменений
// The public /documents keeps the choice screen and the check without an account.

export const CREATE_PATH = '/account/workspace/create'

// The expertise (/check) has no item of its own: it opens from a document,
// from «Создание документа» (a ready file) and from the history.
const SECTIONS = [
  { key: 'create', to: CREATE_PATH, Icon: FilePlus2 },
  { key: 'catalog', to: '/account/workspace/catalog', Icon: Library },
  { key: 'documents', to: '/account/workspace/documents', Icon: FolderOpen },
  { key: 'history', to: '/account/workspace/history', Icon: History },
]

function WorkspaceNav() {
  const { t } = useLanguage()
  const n = t.workspace.nav
  return (
    <nav className="dws-nav" aria-label={n.aria}>
      {SECTIONS.map(({ key, to, Icon, end }) => (
        <NavLink key={key} to={to} end={end} className={({ isActive }) => `dws-nav-link${isActive ? ' is-active' : ''}`}>
          <Icon size={18} aria-hidden="true" />
          <span>{n[key]}</span>
        </NavLink>
      ))}
    </nav>
  )
}

/** The frame of every screen: title of the environment, navigation, the screen. */
function WorkspaceFrame({ section, children }) {
  const { t } = useLanguage()
  const w = t.workspace
  const full = section === 'create'
  return (
    <div className="dws-page dws-page--light">
      <header className={`dws-hero${full ? '' : ' dws-hero--compact'}`}>
        <span className="dws-hero-icon" aria-hidden="true">
          <FolderOpen size={full ? 30 : 22} strokeWidth={1.75} />
        </span>
        <div>
          <p className="dws-hero-kicker">{full ? w.kicker : w.title}</p>
          <h1 className="dws-hero-title">{full ? w.title : w.nav.titles[section]}</h1>
          <p className="dws-hero-lead">{full ? w.lead : w.nav.leads[section]}</p>
        </div>
      </header>
      <WorkspaceNav />
      <div className="dws-screen">{children}</div>
    </div>
  )
}

function formatDate(iso, lang) {
  try {
    return new Date(iso).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function HistoryRow({ row, lang, a }) {
  return (
    <li>
      <Link to={expertisePath(row)} className="dws-row">
        <span className="dws-row-icon" aria-hidden="true">
          <FileSearch size={18} />
        </span>
        <span className="dws-row-main">
          <span className="dws-row-title">{row.file_name}</span>
          <span className="dws-row-meta">
            {formatDate(row.created_at, lang)}
            {row.kind === 'editor' ? ` · ${a.fromEditor}` : ` · ${a.fromFile}`}
            {row.status === 'fixed' ? ` · ${a.fixed}` : ''}
          </span>
        </span>
        <span className={`dws-row-badge${row.issue_count > 0 ? ' is-issues' : ''}`}>{row.issue_count > 0 ? a.issues(row.issue_count) : a.noIssues}</span>
      </Link>
    </li>
  )
}

function Block({ title, lead, Icon, children, action }) {
  return (
    <section className="dws-block">
      <header className="dws-block-head">
        <h2 className="dws-block-title">
          <Icon size={20} aria-hidden="true" />
          {title}
        </h2>
        {action}
      </header>
      {lead && <p className="dws-block-lead">{lead}</p>}
      {children}
    </section>
  )
}

function LoadError({ text, retryLabel, onRetry }) {
  return (
    <div className="dws-error" role="alert">
      <p>{text}</p>
      <button type="button" className="dws-retry" onClick={onRetry}>
        <RotateCcw size={15} aria-hidden="true" /> {retryLabel}
      </button>
    </div>
  )
}

// ---- «История проверок и изменений» -------------------------------------------------

/** Documents with an expertise result stored with them (work_documents.issues). */
function useCheckedDocuments() {
  const { user } = useAuth()
  const [state, setState] = useState({ loading: true, error: false, rows: [] })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!user) return
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    supabase
      .from('work_documents')
      .select('id, title, template_id, status, current_version, updated_at, issues')
      .order('updated_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!alive) return
        const rows = (data ?? [])
          .map((doc) => ({ doc, check: readExpertise(doc.issues) }))
          .filter((r) => r.check)
          .map(({ doc, check }) => {
            const by = (st) => check.items.filter((i) => i.status === st).length
            return {
              id: doc.id,
              title: doc.title,
              template_id: doc.template_id,
              status: doc.status,
              at: check.at,
              version: check.version ?? null,
              total: check.items.length,
              open: by('open'),
              accepted: by('accepted'),
              edited: by('edited'),
              rejected: by('rejected'),
              changes: (check.changes ?? []).map((c) => ({ label: c.label, was: c.was, now: c.now, how: c.how, at: c.at })),
            }
          })
          .sort((x, y) => new Date(y.at) - new Date(x.at))
        setState({ loading: false, error: Boolean(error), rows })
      })
    return () => {
      alive = false
    }
  }, [user, attempt])
  return { ...state, retry: () => setAttempt((n) => n + 1) }
}

/** The registry of sources (public.kb_sources) as it is — nothing added by the client. */
function useSources() {
  const [state, setState] = useState({ loading: true, error: false, rows: [] })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    supabase
      .from('kb_sources')
      .select('*')
      .order('priority', { ascending: true })
      .then(({ data, error }) => alive && setState({ loading: false, error: Boolean(error), rows: data ?? [] }))
    return () => {
      alive = false
    }
  }, [attempt])
  return { ...state, retry: () => setAttempt((n) => n + 1) }
}

/** The query found in the text, wrapped in <mark>. */
function Highlight({ text, query }) {
  const q = query.trim().toLowerCase()
  if (!q || !text) return text
  const parts = []
  let from = 0
  const low = text.toLowerCase()
  for (let at = low.indexOf(q); at !== -1; at = low.indexOf(q, from)) {
    if (at > from) parts.push(text.slice(from, at))
    parts.push(<mark key={at}>{text.slice(at, at + q.length)}</mark>)
    from = at + q.length
  }
  parts.push(text.slice(from))
  return parts
}

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function SourcesBlock({ lang }) {
  const { t } = useLanguage()
  const w = t.workspace
  const h = w.history
  const r = w.expertise.refs
  const { loading, error, rows, retry } = useSources()
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState(0)
  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU') : null)
  const actuality = (s) => (s.status === 'outdated' ? 'outdated' : s.status === 'official' && s.verified_at ? 'confirmed' : 'needs_review')
  const titleOf = (s) => (lang === 'kk' ? s.title_kk : s.title_ru) || s.title_ru || ''
  const q = query.trim().toLowerCase()
  const matched = rows.filter((s) => !q || `${titleOf(s)} ${s.doc_number ?? ''}`.toLowerCase().includes(q))
  const shown = matched.filter((s) => !priority || s.priority === priority)
  const groups = [1, 2, 3, 4].filter((p) => shown.some((s) => s.priority === p))
  return (
    <Block title={h.sourcesTitle} lead={h.sourcesLead} Icon={Scale}>
      {loading ? (
        <p className="dws-muted">{w.activity.loading}</p>
      ) : error ? (
        <LoadError text={w.activity.loadError} retryLabel={w.dashboard.retry} onRetry={retry} />
      ) : rows.length === 0 ? (
        <p className="dws-muted">{h.sourcesNone}</p>
      ) : (
        <>
          <div className="dws-sources-tools">
            <label className="dws-sources-search">
              <Search size={17} aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={h.sourcesSearch} aria-label={h.sourcesSearch} />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="×">
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </label>
            <div className="dws-sources-chips" role="group" aria-label={h.sourcesTitle}>
              {[0, 1, 2, 3, 4]
                .filter((p) => !p || rows.some((s) => s.priority === p))
                .map((p) => (
                  <button key={p} type="button" className={priority === p ? 'is-on' : undefined} aria-pressed={priority === p} onClick={() => setPriority(p)}>
                    {p ? `${p}. ${h.priority[p]}` : h.sourcesAll}
                    <small>{p ? matched.filter((s) => s.priority === p).length : matched.length}</small>
                  </button>
                ))}
            </div>
            {q && <p className="dws-sources-found" role="status">{h.sourcesFound(shown.length)}</p>}
          </div>
          {shown.length === 0 && <p className="dws-muted">{h.sourcesNoMatch}</p>}
          {groups.map((p) => {
            const items = shown.filter((s) => s.priority === p)
            return (
              <details key={p} className={`dws-sources-group dws-sources-group--p${p}`} open>
                <summary className="dws-sources-title">
                  <span className="dws-sources-num">{p}</span>
                  <span className="dws-sources-name">{h.priority[p]}</span>
                  <span className="dws-sources-count">{h.sourcesCount(items.length)}</span>
                  <ChevronDown size={18} className="dws-sources-chevron" aria-hidden="true" />
                </summary>
                <ul className="dws-history">
                  {items.map((s) => (
                    <li key={s.id} className={`dws-history-item dws-source dws-source--${actuality(s)}`}>
                      <span className="dws-row-title">
                        <Highlight text={titleOf(s)} query={query} />
                      </span>
                      <span className="dws-source-tags">
                        {s.doc_number || s.doc_date ? (
                          <>
                            {s.doc_number && (
                              <span className="dws-source-tag dws-source-tag--number">
                                <Highlight text={s.doc_number} query={query} />
                              </span>
                            )}
                            {s.doc_date && <span className="dws-source-tag">{r.dated(fmt(s.doc_date))}</span>}
                          </>
                        ) : (
                          <span className="dws-source-tag is-empty">{r.noRequisites}</span>
                        )}
                      </span>
                      <span className="dws-row-meta">
                        {r.statusLabel}: {r.registryStatus[s.status] ?? s.status} · {s.verified_at ? r.verifiedAt(fmt(s.verified_at)) : r.notVerified}
                      </span>
                      {actuality(s) !== 'needs_review' && <span className="dws-source-state">{r.actuality[actuality(s)]}</span>}
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noreferrer" className="dws-source-link" title={s.url}>
                          {h.sourcesOpen(hostOf(s.url))} <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )
          })}
        </>
      )}
      <p className="dws-block-lead">{h.officialSites}:</p>
      <ul className="dws-sites">
        {OFFICIAL_SITES.map((site) => (
          <li key={site.key}>
            <a href={site.url} target="_blank" rel="noreferrer">
              {site.title[lang] ?? site.title.ru} <ExternalLink size={12} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </Block>
  )
}

function HistoryScreen() {
  const { lang: uiLang, t } = useLanguage()
  const lang = uiLang === 'kk' ? 'kk' : 'ru'
  const w = t.workspace
  const a = w.activity
  const h = w.history
  const [kind, setKind] = useState('all')
  const { history, historyLoading, historyError, retry } = useWorkspaceActivity({ historyLimit: 100 })
  const checked = useCheckedDocuments()
  const runs = useMemo(() => history.filter((row) => kind === 'all' || (kind === 'editor' ? row.kind === 'editor' : row.kind !== 'editor')), [history, kind])

  return (
    <div className="dws-activity dws-activity--wide">
      <SourcesBlock lang={lang} />
      <Block title={h.documentsTitle} lead={h.documentsLead} Icon={ClipboardCheck}>
        {checked.loading ? (
          <p className="dws-muted">{a.loading}</p>
        ) : checked.error ? (
          <LoadError text={a.loadError} retryLabel={w.dashboard.retry} onRetry={checked.retry} />
        ) : checked.rows.length === 0 ? (
          <p className="dws-muted">{h.noChecked}</p>
        ) : (
          <ul className="dws-history">
            {checked.rows.map((r) => {
              const template = templateById(r.template_id)
              return (
                <li key={r.id} className="dws-history-item">
                  <div className="dws-history-head">
                    <Link to={`/account/documents/${r.id}?panel=check`} className="dws-row-title">
                      {r.title || template?.title[lang] || r.template_id}
                    </Link>
                    <span className="dws-row-meta">
                      {h.checkedAt(formatDate(r.at, lang))}
                      {r.version ? ` · ${h.version(r.version)}` : ''}
                    </span>
                  </div>
                  <ul className="dws-history-counts">
                    <li>{h.counts.total(r.total)}</li>
                    <li className="is-open">{h.counts.open(r.open)}</li>
                    <li className="is-accepted">{h.counts.accepted(r.accepted + r.edited)}</li>
                    <li className="is-rejected">{h.counts.rejected(r.rejected)}</li>
                  </ul>
                  {r.changes.length > 0 && (
                    <details className="dws-history-changes">
                      <summary>{h.changes(r.changes.length)}</summary>
                      <ol>
                        {r.changes.map((c, i) => (
                          <li key={i}>
                            <span className="dws-row-meta">
                              {c.label} · {formatDate(c.at, lang)}
                            </span>
                            <span>
                              <del>{c.was}</del> → <ins>{c.now}</ins>
                            </span>
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                  <div className="dws-history-links">
                    <Link to={`/account/documents/${r.id}?panel=check`}>{h.openCheck}</Link>
                    <Link to={`/account/documents/${r.id}?panel=versions`}>{h.openVersions}</Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Block>

      <Block
        title={h.runsTitle}
        lead={h.runsLead}
        Icon={History}
        action={
          <select className="dws-select" value={kind} onChange={(e) => setKind(e.target.value)} aria-label={h.kindAria}>
            <option value="all">{h.kinds.all}</option>
            <option value="editor">{h.kinds.editor}</option>
            <option value="file">{h.kinds.file}</option>
          </select>
        }
      >
        {historyLoading ? (
          <p className="dws-muted">{a.loading}</p>
        ) : historyError ? (
          <LoadError text={a.loadError} retryLabel={w.dashboard.retry} onRetry={retry} />
        ) : runs.length ? (
          <ul className="dws-list">
            {runs.map((row) => (
              <HistoryRow key={row.id} row={row} lang={lang} a={a} />
            ))}
          </ul>
        ) : (
          <p className="dws-muted">{a.emptyHistory}</p>
        )}
      </Block>
    </div>
  )
}

// ---- public site ------------------------------------------------------------------

function PublicHub() {
  const { t } = useLanguage()
  const { isAuthenticated } = useAuth()
  const w = t.workspace
  const cards = [
    { key: 'create', to: CREATE_PATH, Icon: FilePlus2, note: isAuthenticated ? null : w.create.note },
    { key: 'check', to: '/documents/check', Icon: FileSearch },
  ]
  return (
    <div className="dws-page dws-page--standalone">
      <header className="dws-hero">
        <span className="dws-hero-icon" aria-hidden="true">
          <FolderOpen size={30} strokeWidth={1.75} />
        </span>
        <div>
          <p className="dws-hero-kicker">{w.kicker}</p>
          <h1 className="dws-hero-title">{w.title}</h1>
          <p className="dws-hero-lead">{w.lead}</p>
        </div>
      </header>
      <nav className="dws-cards" aria-label={w.chooseAria}>
        {cards.map(({ key, to, Icon, note }) => (
          <Link key={key} to={to} className={`dws-card dws-card--${key}`}>
            <span className="dws-card-icon" aria-hidden="true">
              <Icon size={34} strokeWidth={1.6} />
            </span>
            <span className="dws-card-title">{w[key].title}</span>
            <span className="dws-card-text">{w[key].text}</span>
            <span className="dws-card-footer">
              <span className="dws-card-cta">
                {w[key].cta}
                <ArrowRight size={18} aria-hidden="true" />
              </span>
              {note && (
                <span className="dws-card-note">
                  <Lock size={14} aria-hidden="true" />
                  {note}
                </span>
              )}
            </span>
          </Link>
        ))}
      </nav>
      {isAuthenticated && (
        <Link to="/account/workspace" className="dws-card-cta dws-public-open">
          {w.openWorkspace}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

export function WorkspacePage() {
  return (
    <SiteSectionLayout activeSection="workspace">
      <PublicHub />
    </SiteSectionLayout>
  )
}

export function WorkspaceCheckPage() {
  const { t } = useLanguage()
  return (
    <SiteSectionLayout activeSection="workspace">
      <div className="dws-scenario dws-scenario--standalone">
        <Link to="/documents" className="dws-back">
          ← {t.workspace.back}
        </Link>
      </div>
      <DocsContent />
    </SiteSectionLayout>
  )
}

// ---- personal account -------------------------------------------------------------

// The former «Рабочая панель»: its link (/account/workspace) opens the creation screen.
export function AccountWorkspacePage() {
  return <Navigate to={CREATE_PATH} replace />
}

export function AccountWorkspaceCreatePage() {
  const [params] = useSearchParams()
  // Old links to «Мои документы» of the constructor (?tab=mine).
  if (params.get('tab') === 'mine') return <Navigate to="/account/workspace/documents" replace />
  return (
    <WorkspaceFrame section="create">
      <CreateView />
    </WorkspaceFrame>
  )
}

export function AccountCatalogPage() {
  return (
    <WorkspaceFrame section="catalog">
      <CatalogView />
    </WorkspaceFrame>
  )
}

export function AccountMyDocumentsPage() {
  return (
    <WorkspaceFrame section="documents">
      <MyDocuments embedded />
    </WorkspaceFrame>
  )
}

export function AccountHistoryPage() {
  return (
    <WorkspaceFrame section="history">
      <HistoryScreen />
    </WorkspaceFrame>
  )
}

// ?document=<id> checks a saved document, ?history=<id> reopens a saved check.
export function AccountWorkspaceCheckPage() {
  const [params] = useSearchParams()
  const documentId = params.get('document')
  const historyId = params.get('history')
  return (
    <WorkspaceFrame section="check">
      <DocInspector key={`${documentId}|${historyId}`} documentId={documentId} historyId={historyId} linkDocuments />
    </WorkspaceFrame>
  )
}
