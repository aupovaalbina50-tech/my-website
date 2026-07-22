import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { ACCOUNT_NAV_ITEMS } from '../../constants/accountNav.js'
import AuthCard from './auth/AuthCard.jsx'

function AccountHomePage() {
  const { isAuthenticated, loading, user, profile } = useAuth()
  const { t } = useLanguage()

  if (loading) {
    return <div className="auth-page" aria-busy="true" />
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <AuthCard />
      </div>
    )
  }

  const displayName = profile?.first_name || user?.email || ''
  const quickLinks = ACCOUNT_NAV_ITEMS.filter((item) => item.key !== 'dashboard')

  return (
    <div className="account-home">
      <div className="account-card">
        <h1 className="account-title">{t.account.home.greeting(displayName)}</h1>
        <p className="account-description">{t.account.home.subtitle}</p>
      </div>

      <div className="quicklinks-block">
        <h2 className="quicklinks-title">{t.account.home.quickLinksTitle}</h2>
        <div className="quicklinks-grid">
          {quickLinks.map(({ key, to, Icon }) => (
            <Link key={key} to={to} className="quicklink-card">
              <Icon size={22} aria-hidden="true" />
              <span>{t.account.sidebar[key]}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AccountHomePage
