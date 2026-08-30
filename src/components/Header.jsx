import { Link, useLocation } from 'react-router-dom'
import { Home, ArrowRight } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import CivilDefenseMapGraphic from './CivilDefenseMapGraphic.jsx'

function Header() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const isAccountArea = pathname.startsWith('/account')
  const hero = t.header.hero

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
        <div className="letterhead-scanline" aria-hidden="true"></div>
        <div className="letterhead-inner">
          <div className="letterhead-brandrow">
            <div className="brand-org-text">
              <p className="brand-org-line">{t.header.eyebrow}</p>
              <p className="brand-org-line brand-org-line-sub">{t.header.subtitle}</p>
            </div>
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
          </div>

          <div className="hero-grid hero-grid-map">
            <div className="hero-copy">
              <p className="hero-label">
                <span className="hero-label-mark" aria-hidden="true"></span>
                {hero.label}
              </p>
              <h1 className="hero-title hero-title-stacked">
                <span className="hero-title-lead">{hero.titleLine1}</span>
                <span className="hero-title-sub">{hero.titleLine2}</span>
                <span className="hero-title-sub">{hero.titleLine3}</span>
              </h1>
              <p className="hero-desc">{hero.lead}</p>
              <Link to="/terms" className="hero-cta">
                <span>{hero.cta}</span>
                <ArrowRight size={16} className="hero-cta-arrow" aria-hidden="true" />
              </Link>
            </div>
            <div className="hero-visual">
              <CivilDefenseMapGraphic centerLabel={hero.mapCenterLabel} />
            </div>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header
