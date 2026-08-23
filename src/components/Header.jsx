import { Link, useLocation } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'

function Header() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const isAccountArea = pathname.startsWith('/account')

  return (
    <>
      <div className="lang-bar">
        <div className={`lang-bar-inner${isAccountArea ? ' lang-bar-inner-split' : ''}`}>
          {isAccountArea && (
            <span className="header-home-link-wrap">
              <Link to="/" className="header-home-link">
                <Home size={15} aria-hidden="true" />
                <span>{t.header.homeLink}</span>
              </Link>
              <span className="nav-tooltip nav-tooltip-header" role="tooltip">
                {t.header.homeLinkTooltip}
              </span>
            </span>
          )}
          <LanguageSwitcher />
        </div>
      </div>

      <header className="letterhead">
        <div className="letterhead-inner">
          <div className="brand-emblems">
            <picture>
              <source srcSet="/emblems/academy.webp" type="image/webp" />
              <img
                src="/emblems/academy.png"
                alt={t.header.academyAlt}
                className="emblem"
                width="240"
                height="240"
                decoding="async"
              />
            </picture>
            <picture>
              <source srcSet="/emblems/ministry.webp" type="image/webp" />
              <img
                src="/emblems/ministry.png"
                alt={t.header.ministryAlt}
                className="emblem"
                width="240"
                height="240"
                decoding="async"
              />
            </picture>
          </div>
          <div className="brand-rule" aria-hidden="true"></div>
          <div className="letterhead-text">
            <p className="site-eyebrow">
              <span className="eyebrow-mark" aria-hidden="true"></span>
              {t.header.eyebrow}
            </p>
            <h1>{t.header.title}</h1>
            <p className="site-subtitle">{t.header.subtitle}</p>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header
