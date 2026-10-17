import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRight,
  BookMarked,
  ClipboardCheck,
  Clock3,
  FilePenLine,
  FilePlus2,
  FileSearch,
  FileText,
  FolderOpen,
  History,
  LayoutDashboard,
  Library,
  Lock,
  PlayCircle,
  RotateCcw,
  Scale,
  Search,
  ExternalLink,
  Upload,
  Wand2,
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { useAuth } from '../../auth/AuthContext.jsx'
import SiteSectionLayout from '../../components/SiteSectionLayout.jsx'
import DocsContent from '../shared/DocsContent.jsx'
import DocInspector from '../shared/docInspector/DocInspector.jsx'
import MyDocuments, { loadContents } from './MyDocuments.jsx'
import { CatalogView, CreateView } from '../account/documents/DocumentBuilderPage.jsx'
import { templateById } from '../account/documents/catalog/index.js'
import { docStrings } from '../account/documents/strings.js'
import { documentPath, expertisePath, useWorkspaceActivity } from './documentModel.js'
import { readExpertise } from './expertise/model.js'
import { OFFICIAL_SITES } from './sources/registry.js'
import './documentsWorkspace.css'

// «Центр работы со служебными документами»: one working environment of
// separate screens with one navigation —
//   /account/workspace            Рабочая панель (real counters, recent work)
//   /account/workspace/create     Создание документа (by the task / own choice)
//   /account/workspace/catalog    Каталог документов и форм
//   /account/workspace/documents  Мои документы
//   /account/workspace/check      Комплексная проверка готового документа
//   /account/workspace/history    Нормативные источники и история изменений
// The public /documents keeps the choice screen and the check without an account.

export const CREATE_PATH = '/account/workspace/create'

const SECTIONS = [
  { key: 'dashboard', to: '/account/workspace', Icon: LayoutDashboard, end: true },
  { key: 'create', to: CREATE_PATH, Icon: FilePlus2 },
  { key: 'catalog', to: '/account/workspace/catalog', Icon: Library },
  { key: 'documents', to: '/account/workspace/documents', Icon: FolderOpen },
  { key: 'check', to: '/account/workspace/check', Icon: FileSearch },
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
  const full = section === 'dashboard'
  return (
    <div className="dws-page">
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

const IN_PROGRESS = new Set(['draft', 'filling', 'issues', 'review'])
// Counters of the dashboard: only statuses the documents really have.
const COUNTERS = [
  { key: 'draft', statuses: ['draft', 'filling'], filter: 'draft', Icon: FilePenLine },
  { key: 'issues', statuses: ['review', 'issues'], filter: 'issues', Icon: ClipboardCheck },
  { key: 'checked', statuses: ['checked'], filter: 'checked', Icon: FileSearch },
  { key: 'ready', statuses: ['ready'], filter: 'ready', Icon: BookMarked },
]

function formatDate(iso, lang) {
  try {
    return new Date(iso).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function DocumentRow({ item, lang, a, statusLabels, stage = null }) {
  const template = templateById(item.template_id)
  const type = item.kind === 'report' ? a.report : template ? template.title[lang] : item.template_id
  return (
    <li>
      <Link to={documentPath(item)} className="dws-row">
        <span className="dws-row-icon" aria-hidden="true">
          {item.source?.origin === 'upload' ? <Upload size={18} /> : <FileText size={18} />}
        </span>
        <span className="dws-row-main">
          <span className="dws-row-title">{item.title || type}</span>
          <span className="dws-row-meta">
            {type}
            {item.source?.origin === 'upload' ? ` · ${a.uploaded}` : ''} · {a.updated} {formatDate(item.updated_at, lang)}
            {stage ? ` · ${stage}` : ''}
          </span>
        </span>
        <span className={`doc-status doc-status--${item.status}`}>{statusLabels[item.status] ?? item.status}</span>
      </Link>
    </li>
  )
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

const typeOf = (item, lang, a) => (item.kind === 'report' ? a.report : templateById(item.template_id)?.title[lang] ?? item.template_id)

/**
 * «Поиск по моим документам» with a quick jump: names and types at once, the
 * text of the documents once it is loaded; Enter opens the full list.
 */
function DashboardSearch({ documents, loading, lang }) {
  const { t } = useLanguage()
  const a = t.workspace.activity
  const d = t.workspace.dashboard
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [contents, setContents] = useState(null)
  const q = query.trim().toLowerCase()
  useEffect(() => {
    if (q.length < 2 || contents) return
    let alive = true
    loadContents().then((c) => alive && setContents(c.map))
    return () => {
      alive = false
    }
  }, [q, contents])
  const results = useMemo(() => {
    if (q.length < 2) return []
    return documents
      .map((item) => {
        const head = `${item.title ?? ''} ${typeOf(item, lang, a)}`.toLowerCase()
        if (head.includes(q)) return { item, inText: false }
        if (contents?.get(`${item.kind}-${item.id}`)?.includes(q)) return { item, inText: true }
        return null
      })
      .filter(Boolean)
      .slice(0, 6)
  }, [q, documents, contents, lang, a])
  const all = `/account/workspace/documents?q=${encodeURIComponent(query.trim())}`
  return (
    <form
      className="dws-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        if (q.length >= 2) navigate(all)
      }}
    >
      <label className="dws-search-field">
        <Search size={18} aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={d.searchPlaceholder} aria-label={d.search} disabled={loading} />
      </label>
      {q.length >= 2 && (
        <div className="dws-search-results" aria-live="polite">
          {results.length ? (
            <ul className="dws-list">
              {results.map(({ item, inText }) => (
                <li key={`${item.kind}-${item.id}`}>
                  <Link to={documentPath(item)} className="dws-row">
                    <span className="dws-row-icon" aria-hidden="true">
                      <FileText size={18} />
                    </span>
                    <span className="dws-row-main">
                      <span className="dws-row-title">{item.title || typeOf(item, lang, a)}</span>
                      <span className="dws-row-meta">
                        {typeOf(item, lang, a)} · {a.updated} {formatDate(item.updated_at, lang)}
                        {inText ? ` · ${d.searchContent}` : ''}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dws-muted">{d.searchNone}</p>
          )}
          <Link to={all} className="dws-block-link">
            {d.searchAll(query.trim())}
          </Link>
        </div>
      )}
    </form>
  )
}

/** «Рабочая панель»: actions, the user's real counters, recent documents and checks. */
function Dashboard() {
  const { lang: uiLang, t } = useLanguage()
  const lang = uiLang === 'kk' ? 'kk' : 'ru'
  const w = t.workspace
  const a = w.activity
  const d = w.dashboard
  const statusLabels = docStrings(lang).docStatus
  const { signedIn, documents, documentsLoading, documentsError, history, historyLoading, historyError, retry } = useWorkspaceActivity({ historyLimit: 5 })

  const active = documents.filter((doc) => doc.status !== 'archive')
  const lastDraft = active.find((doc) => IN_PROGRESS.has(doc.status))
  const actions = [
    { key: 'create', to: CREATE_PATH, Icon: FilePlus2 },
    { key: 'describe', to: `${CREATE_PATH}#finder`, Icon: Wand2 },
    { key: 'check', to: '/account/workspace/check', Icon: FileSearch },
    { key: 'documents', to: '/account/workspace/documents', Icon: FolderOpen },
    { key: 'catalog', to: '/account/workspace/catalog', Icon: Library },
    { key: 'continue', to: lastDraft ? documentPath(lastDraft) : null, Icon: PlayCircle },
  ]
  const pending = active.filter((doc) => IN_PROGRESS.has(doc.status)).slice(0, 5)

  return (
    <div className="dws-dashboard">
      <nav className="dws-actions" aria-label={d.actionsAria}>
        {actions.map(({ key, to, Icon }) => {
          const locked = !signedIn && key !== 'check' && key !== 'catalog'
          const body = (
            <>
              <Icon size={22} aria-hidden="true" />
              <span className="dws-action-title">{d.actions[key].title}</span>
              <span className="dws-action-text">
                {key === 'continue' && signedIn && !documentsLoading ? (lastDraft ? lastDraft.title || d.actions.continue.untitled : d.actions.continue.none) : d.actions[key].text}
              </span>
              {locked && (
                <span className="dws-card-note">
                  <Lock size={13} aria-hidden="true" /> {w.create.note}
                </span>
              )}
            </>
          )
          return to ? (
            <Link key={key} to={to} className={`dws-action dws-action--${key}`}>
              {body}
            </Link>
          ) : (
            <span key={key} className={`dws-action dws-action--${key} is-disabled`} aria-disabled="true">
              {body}
            </span>
          )
        })}
      </nav>

      {signedIn && <DashboardSearch documents={active} loading={documentsLoading} lang={lang} />}

      {!signedIn ? (
        <div className="dws-empty">
          <p>{a.signedOut}</p>
          <Link to="/account" className="dws-card-cta">
            {a.signIn}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <>
          <section className="dws-counters" aria-label={d.countersAria}>
            {documentsLoading ? (
              <p className="dws-muted" role="status">
                {a.loading}
              </p>
            ) : documentsError ? (
              <LoadError text={a.loadError} retryLabel={d.retry} onRetry={retry} />
            ) : (
              COUNTERS.map(({ key, statuses, filter, Icon }) => (
                <Link key={key} to={`/account/workspace/documents?status=${filter}`} className={`dws-counter dws-counter--${key}`}>
                  <Icon size={20} aria-hidden="true" />
                  <span className="dws-counter-value">{active.filter((doc) => statuses.includes(doc.status)).length}</span>
                  <span className="dws-counter-label">{d.counters[key]}</span>
                </Link>
              ))
            )}
          </section>

          <div className="dws-activity">
            <Block title={d.pendingTitle} lead={d.pendingLead} Icon={PlayCircle}>
              {documentsLoading ? (
                <p className="dws-muted">{a.loading}</p>
              ) : documentsError ? (
                <LoadError text={a.loadError} retryLabel={d.retry} onRetry={retry} />
              ) : pending.length ? (
                <ul className="dws-list">
                  {pending.map((item) => (
                    <DocumentRow key={`${item.kind}-${item.id}`} item={item} lang={lang} a={a} statusLabels={statusLabels} stage={d.pendingStage[item.status]} />
                  ))}
                </ul>
              ) : (
                <p className="dws-muted">{d.pendingNone}</p>
              )}
            </Block>
            <Block
              title={a.recentTitle}
              Icon={Clock3}
              action={
                <Link to="/account/workspace/documents" className="dws-block-link">
                  {a.allDocuments}
                </Link>
              }
            >
              {documentsLoading ? (
                <p className="dws-muted">{a.loading}</p>
              ) : documentsError ? (
                <LoadError text={a.loadError} retryLabel={d.retry} onRetry={retry} />
              ) : active.length ? (
                <ul className="dws-list">
                  {active.slice(0, 6).map((item) => (
                    <DocumentRow key={`${item.kind}-${item.id}`} item={item} lang={lang} a={a} statusLabels={statusLabels} />
                  ))}
                </ul>
              ) : (
                <div className="dws-empty dws-empty--inline">
                  <p>{a.empty}</p>
                  <Link to={CREATE_PATH} className="dws-card-cta">
                    <FilePlus2 size={18} aria-hidden="true" />
                    {a.createFirst}
                  </Link>
                </div>
              )}
            </Block>
            <Block
              title={a.historyTitle}
              lead={a.historyLead}
              Icon={History}
              action={
                <Link to="/account/workspace/history" className="dws-block-link">
                  {d.allHistory}
                </Link>
              }
            >
              {historyLoading ? (
                <p className="dws-muted">{a.loading}</p>
              ) : historyError ? (
                <LoadError text={a.loadError} retryLabel={d.retry} onRetry={retry} />
              ) : history.length ? (
                <ul className="dws-list">
                  {history.map((row) => (
                    <HistoryRow key={row.id} row={row} lang={lang} a={a} />
                  ))}
                </ul>
              ) : (
                <p className="dws-muted">{a.emptyHistory}</p>
              )}
            </Block>
          </div>
        </>
      )}
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

function SourcesBlock({ lang }) {
  const { t } = useLanguage()
  const w = t.workspace
  const h = w.history
  const r = w.expertise.refs
  const { loading, error, rows, retry } = useSources()
  const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU') : null)
  const actuality = (s) => (s.status === 'outdated' ? 'outdated' : s.status === 'official' && s.verified_at ? 'confirmed' : 'needs_review')
  return (
    <Block title={h.sourcesTitle} lead={h.sourcesLead} Icon={Scale}>
      {loading ? (
        <p className="dws-muted">{w.activity.loading}</p>
      ) : error ? (
        <LoadError text={w.activity.loadError} retryLabel={w.dashboard.retry} onRetry={retry} />
      ) : rows.length === 0 ? (
        <p className="dws-muted">{h.sourcesNone}</p>
      ) : (
        [1, 2, 3, 4]
          .filter((p) => rows.some((s) => s.priority === p))
          .map((p) => (
            <div key={p} className="dws-sources-group">
              <h3 className="dws-sources-title">
                {p}. {h.priority[p]}
              </h3>
              <ul className="dws-history">
                {rows
                  .filter((s) => s.priority === p)
                  .map((s) => (
                    <li key={s.id} className={`dws-history-item dws-source dws-source--${actuality(s)}`}>
                      <span className="dws-row-title">{(lang === 'kk' ? s.title_kk : s.title_ru) || s.title_ru}</span>
                      <span className="dws-row-meta">
                        {[s.doc_number, s.doc_date && r.dated(fmt(s.doc_date))].filter(Boolean).join(' · ') || r.noRequisites}
                      </span>
                      <span className="dws-row-meta">
                        {r.statusLabel}: {r.registryStatus[s.status] ?? s.status} · {s.verified_at ? r.verifiedAt(fmt(s.verified_at)) : r.notVerified}
                      </span>
                      <span className="dws-source-state">{r.actuality[actuality(s)]}</span>
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noreferrer" className="dws-source-link">
                          {s.url} <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  ))}
              </ul>
            </div>
          ))
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

export function AccountWorkspacePage() {
  return (
    <WorkspaceFrame section="dashboard">
      <Dashboard />
    </WorkspaceFrame>
  )
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
