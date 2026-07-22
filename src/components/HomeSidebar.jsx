import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X, Search, Quote, Landmark, Users, FileText, UserCircle } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { SECTION_IDS } from '../constants/navigation.js'

const SECTION_ICONS = {
  search: Search,
  quotes: Quote,
  ministry: Landmark,
  committees: Users,
  docs: FileText,
}

function HomeSidebar({ activeSection, onSectionClick }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  const handleClick = (id) => {
    onSectionClick(id)
    setOpen(false)
  }

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
          {SECTION_IDS.map((id) => {
            const Icon = SECTION_ICONS[id]
            return (
              <button
                key={id}
                type="button"
                className={`sidebar-link${activeSection === id ? ' active' : ''}`}
                onClick={() => handleClick(id)}
                aria-current={activeSection === id ? 'page' : undefined}
              >
                <Icon size={18} className="sidebar-link-icon" aria-hidden="true" />
                <span>{t.nav[id]}</span>
              </button>
            )
          })}
          <Link to="/account" className="sidebar-link" onClick={() => setOpen(false)}>
            <UserCircle size={18} className="sidebar-link-icon" aria-hidden="true" />
            <span>{t.nav.account}</span>
          </Link>
        </nav>
      </aside>
    </>
  )
}

export default HomeSidebar
