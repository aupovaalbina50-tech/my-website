import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, ArrowRight, ChevronDown } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import CivilDefenseMapGraphic from './CivilDefenseMapGraphic.jsx'

function Header() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const isAccountArea = pathname.startsWith('/account')
  const hero = t.header.hero
  const letterheadRef = useRef(null)

  const scrollPastHero = () => {
    const el = letterheadRef.current
    if (!el) return
    const bottom = el.getBoundingClientRect().bottom + window.scrollY
    window.scrollTo({ top: bottom, behavior: 'smooth' })
  }

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

      <header className="letterhead" ref={letterheadRef}>
        <div className="letterhead-inner">
          <div className="hero-emblems-row">
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
            <span className="hero-emblem-divider" aria-hidden="true"></span>
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
          </div>

          <div className="hero-stage">
            <div className="hero-stage-map" aria-hidden="true">
              <CivilDefenseMapGraphic />
            </div>
            <div className="hero-stage-vignette" aria-hidden="true"></div>
            <div className="hero-stage-content">
              <p className="hero-label">
                <span className="hero-label-mark" aria-hidden="true"></span>
                {hero.label}
              </p>
              <h1 className="hero-title hero-title-stacked hero-title-centered">
                <span className="hero-title-lead">{hero.titleLine1}</span>
                <span className="hero-title-sub">{hero.titleLine2}</span>
                <span className="hero-title-sub">{hero.titleLine3}</span>
              </h1>
              <p className="hero-desc hero-desc-centered">{hero.lead}</p>
              <Link to="/terms" className="hero-cta">
                <span>{hero.cta}</span>
                <ArrowRight size={16} className="hero-cta-arrow" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <button
            type="button"
            className="hero-scroll-hint"
            onClick={scrollPastHero}
            aria-label={hero.scrollHintLabel}
          >
            <ChevronDown aria-hidden="true" />
          </button>

          <div className="hero-official-footer">
            <p className="hero-official-line">{t.header.eyebrow}</p>
            <p className="hero-official-line hero-official-line-sub">{t.header.subtitle}</p>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header
