import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, UserCircle } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import SiteSectionNav from './SiteSectionNav.jsx'

function HomeSidebar({ activeSection, onSectionClick }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="sidebar-topbar">
        <button
          type="button"
          className="sidebar-burger"
          onClick={() => setOpen(true)}
          aria-label={t.account.sidebar.openMenu}
        >
          <Menu size={22} aria-hidden="true" />
        </button>
        <span className="sidebar-topbar-brand">{t.nav.aria}</span>
      </div>

      {open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true"></div>
      )}

      <aside className={`account-sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-brand">
            <span className="sidebar-brand-mark" aria-hidden="true"></span>
            {t.nav.aria}
          </span>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setOpen(false)}
            aria-label={t.account.sidebar.closeMenu}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label={t.nav.aria}>
          <SiteSectionNav
            activeSection={activeSection}
            onSectionClick={onSectionClick}
            onNavigate={() => setOpen(false)}
          />
          <Link to="/account" className="sidebar-link" onClick={() => setOpen(false)}>
            <UserCircle size={18} className="sidebar-link-icon" aria-hidden="true" />
            <span>{t.nav.account}</span>
          </Link>
        </nav>
      </aside>
    </>
  )
}

export default memo(HomeSidebar)
