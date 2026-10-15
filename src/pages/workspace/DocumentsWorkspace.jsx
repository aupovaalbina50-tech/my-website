import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, FilePlus2, FileSearch, FolderOpen, Lock } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { useAuth } from '../../auth/AuthContext.jsx'
import SiteSectionLayout from '../../components/SiteSectionLayout.jsx'
import DocsContent from '../shared/DocsContent.jsx'
import DocumentBuilderPage from '../account/documents/DocumentBuilderPage.jsx'
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

export function AccountWorkspaceCheckPage() {
  return (
    <>
      <div className="dws-scenario">
        <BackToHub to="/account/workspace" />
      </div>
      <DocsContent />
    </>
  )
}
