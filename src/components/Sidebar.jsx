import { memo, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, User, UserCircle } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { ACCOUNT_NAV_ITEMS } from '../constants/accountNav.js'

function Sidebar() {
  const { t } = useLanguage()
  const { isAuthenticated, user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    setOpen(false)
    await signOut()
    navigate('/account')
  }

  const displayName = profile?.first_name || user?.email || ''

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
        <Link to="/" className="sidebar-topbar-brand">
          {t.account.sidebar.brand}
        </Link>
      </div>

      {open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true"></div>
      )}

      <aside className={`account-sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand" title={t.account.sidebar.backToSite}>
            <span className="sidebar-brand-mark" aria-hidden="true"></span>
            {t.account.sidebar.brand}
          </Link>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setOpen(false)}
            aria-label={t.account.sidebar.closeMenu}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {isAuthenticated && displayName && (
          <div className="sidebar-user">
            <span className="sidebar-user-icon" aria-hidden="true">
              <UserCircle size={20} />
            </span>
            <span className="sidebar-user-name">{displayName}</span>
          </div>
        )}

        <nav className="sidebar-nav" aria-label={t.account.sidebar.aria}>
          {ACCOUNT_NAV_ITEMS.map(({ key, to, end, Icon }) => (
            <NavLink
              key={key}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} className="sidebar-link-icon" aria-hidden="true" />
              <span>{t.account.sidebar[key]}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <NavLink
            to="/account/profile"
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            onClick={() => setOpen(false)}
          >
            <User size={18} className="sidebar-link-icon" aria-hidden="true" />
            <span>{t.account.sidebar.profile}</span>
          </NavLink>
          <button
            type="button"
            className="sidebar-link sidebar-logout"
            onClick={handleLogout}
            disabled={!isAuthenticated}
          >
            <LogOut size={18} className="sidebar-link-icon" aria-hidden="true" />
            <span>{t.account.sidebar.logout}</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default memo(Sidebar)
