import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Clock3, FilePlus2, FileSearch, FileText, FolderOpen, History, Lock, PlayCircle, Upload } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { useAuth } from '../../auth/AuthContext.jsx'
import SiteSectionLayout from '../../components/SiteSectionLayout.jsx'
import DocsContent from '../shared/DocsContent.jsx'
import DocInspector from '../shared/docInspector/DocInspector.jsx'
import DocumentBuilderPage from '../account/documents/DocumentBuilderPage.jsx'
import { templateById } from '../account/documents/catalog/index.js'
import { docStrings } from '../account/documents/strings.js'
import { documentPath, expertisePath, useWorkspaceActivity } from './documentModel.js'
import './documentsWorkspace.css'

// «Работа с документами»: one entry point for the two existing document
// tools. The constructor and the terminology check are the same components
// as before; this section only adds the choice screen and a way back to it.
//   public site:  /documents        -> /documents/check
//   account:      /account/workspace -> /account/workspace/create | /check
// The constructor needs an account, so «Создать документ» always opens it in
// the personal account (RequireAuth there shows the sign-in form).
export const CREATE_PATH = '/account/workspace/create'

function WorkspaceHub({ checkPath, standalone = false }) {
  const { t } = useLanguage()
  const { isAuthenticated } = useAuth()
  const w = t.workspace

  const cards = [
    { key: 'create', to: CREATE_PATH, Icon: FilePlus2, note: isAuthenticated ? null : w.create.note },
    { key: 'check', to: checkPath, Icon: FileSearch },
  ]

  return (
    <div className={`dws-page${standalone ? ' dws-page--standalone' : ''}`}>
      <header className="dws-hero">
        <span className="dws-hero-icon" aria-hidden="true">
          <FolderOpen size={30} strokeWidth={1.75} />
        </span>
        <div>
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

      <WorkspaceActivity />
    </div>
  )
}

const IN_PROGRESS = new Set(['draft', 'filling', 'issues'])

function formatDate(iso, lang) {
  try {
    return new Date(iso).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function DocumentRow({ item, lang, a, statusLabels }) {
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
            {row.status === 'fixed' ? ` · ${a.fixed}` : ''}
          </span>
        </span>
        <span className={`dws-row-badge${row.issue_count > 0 ? ' is-issues' : ''}`}>
          {row.issue_count > 0 ? a.issues(row.issue_count) : a.noIssues}
        </span>
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

/** «Продолжить работу», «Недавние документы», «История документов» — the user's real documents only. */
function WorkspaceActivity() {
  const { lang: uiLang, t } = useLanguage()
  const lang = uiLang === 'kk' ? 'kk' : 'ru'
  const a = t.workspace.activity
  const statusLabels = docStrings(lang).docStatus
  const { signedIn, documents, documentsLoading, documentsError, history, historyLoading, historyError } = useWorkspaceActivity()

  if (!signedIn) {
    return (
      <div className="dws-empty">
        <p>{a.signedOut}</p>
        <Link to="/account" className="dws-card-cta">
          {a.signIn}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    )
  }
  if (documentsLoading || historyLoading) return <p className="dws-muted">{a.loading}</p>
  if (documentsError && historyError) return <p className="dws-error">{a.loadError}</p>

  const active = documents.filter((d) => d.status !== 'archive')
  if (!active.length && !history.length && !documentsError && !historyError) {
    return (
      <div className="dws-empty">
        <p>{a.empty}</p>
        <Link to={CREATE_PATH} className="dws-card-cta">
          <FilePlus2 size={18} aria-hidden="true" />
          {a.createFirst}
        </Link>
      </div>
    )
  }

  const inProgress = active.filter((d) => IN_PROGRESS.has(d.status)).slice(0, 4)
  const recent = active.slice(0, 6)
  const rows = (list) => (
    <ul className="dws-list">
      {list.map((item) => (
        <DocumentRow key={`${item.kind}-${item.id}`} item={item} lang={lang} a={a} statusLabels={statusLabels} />
      ))}
    </ul>
  )

  return (
    <div className="dws-activity">
      <Block title={a.continueTitle} Icon={PlayCircle}>
        {documentsError ? <p className="dws-error">{a.loadError}</p> : inProgress.length ? rows(inProgress) : <p className="dws-muted">{a.emptyContinue}</p>}
      </Block>
      <Block
        title={a.recentTitle}
        Icon={Clock3}
        action={
          <Link to={`${CREATE_PATH}?tab=mine`} className="dws-block-link">
            {a.allDocuments}
          </Link>
        }
      >
        {documentsError ? <p className="dws-error">{a.loadError}</p> : recent.length ? rows(recent) : <p className="dws-muted">{a.empty}</p>}
      </Block>
      <Block title={a.historyTitle} lead={a.historyLead} Icon={History}>
        {historyError ? (
          <p className="dws-error">{a.loadError}</p>
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
  )
}

function BackToHub({ to }) {
  const { t } = useLanguage()
  return (
    <Link to={to} className="dws-back">
      <ArrowLeft size={16} aria-hidden="true" />
      {t.workspace.back}
    </Link>
  )
}

// Public site
export function WorkspacePage() {
  return (
    <SiteSectionLayout activeSection="workspace">
      <WorkspaceHub checkPath="/documents/check" standalone />
    </SiteSectionLayout>
  )
}

export function WorkspaceCheckPage() {
  return (
    <SiteSectionLayout activeSection="workspace">
      <div className="dws-scenario dws-scenario--standalone">
        <BackToHub to="/documents" />
      </div>
      <DocsContent />
    </SiteSectionLayout>
  )
}

// Personal account
export function AccountWorkspacePage() {
  return <WorkspaceHub checkPath="/account/workspace/check" />
}

export function AccountWorkspaceCreatePage() {
  return (
    <>
      <div className="dws-scenario">
        <BackToHub to="/account/workspace" />
      </div>
      <DocumentBuilderPage />
    </>
  )
}

// ?document=<id> checks a saved document, ?history=<id> reopens a saved check.
export function AccountWorkspaceCheckPage() {
  const [params] = useSearchParams()
  const documentId = params.get('document')
  const historyId = params.get('history')
  return (
    <>
      <div className="dws-scenario">
        <BackToHub to="/account/workspace" />
      </div>
      <DocInspector key={`${documentId}|${historyId}`} documentId={documentId} historyId={historyId} linkDocuments />
    </>
  )
}
