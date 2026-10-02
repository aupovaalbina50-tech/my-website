import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, ChevronDown } from 'lucide-react'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import CivilDefenseMapGraphic from './CivilDefenseMapGraphic.jsx'
import { Silhouette } from './fireGearArt.jsx'

// Faint fire-service kit down both sides of the hero, in place of a grid:
// helmet, nozzle, radio, axe and rescue boat on the left; the rescue
// helicopter in the top-right corner, then extinguisher, fire bucket,
// hydrant and tanker truck down the right.
const HERO_GEAR = [
  { kind: 'helmet', side: 'left', offset: '2%', top: '4%', size: 170 },
  { kind: 'nozzle', side: 'left', offset: '1%', top: '22%', size: 170 },
  { kind: 'radio', side: 'left', offset: '4%', top: '36%', size: 50, wideOnly: true },
  { kind: 'axe', side: 'left', offset: '3%', top: '54%', size: 64 },
  { kind: 'boat', side: 'left', offset: '1%', top: '82%', size: 220 },
  { kind: 'helicopter', side: 'right', offset: '1%', top: '4%', size: 250 },
  { kind: 'extinguisher', side: 'right', offset: '2%', top: '28%', size: 72 },
  { kind: 'bucket', side: 'right', offset: '3%', top: '44%', size: 60, wideOnly: true },
  { kind: 'hydrant', side: 'right', offset: '3%', top: '58%', size: 72, wideOnly: true },
  { kind: 'truck', side: 'right', offset: '1%', top: '80%', size: 270 },
]

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
        <div className="hero-gear" aria-hidden="true">
          {HERO_GEAR.map((g, i) => (
            <div
              key={g.kind}
              className={`hero-gear-item${g.wideOnly ? ' hero-gear-wide-only' : ''}${g.size >= 200 ? ' hero-gear-large' : ''}`}
              style={{
                top: g.top,
                [g.side]: g.offset,
                width: g.size,
                '--gear-rotate': `${g.rotate || 0}deg`,
                animationDelay: `${i * -2.5}s`,
              }}
            >
              <Silhouette kind={g.kind} />
            </div>
          ))}
        </div>
        <div className="letterhead-inner">
          <div className="hero-emblems-row">
            <picture>
              <source srcSet="/emblems/ministry.webp" type="image/webp" />
              <img
                src="/emblems/ministry.png"
                alt={t.header.ministryAlt}
                className="emblem emblem-ministry"
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
            <div className="hero-stage-content">
              <h1
                className="hero-title hero-title-stacked hero-title-centered"
                aria-label={`${hero.titleLine1} ${hero.titleLine2} ${hero.titleLine3}`}
              >
                <span className="hero-title-lead" aria-hidden="true">
                  <span className="hero-beacon hero-beacon-red"></span>
                  <span className="hero-title-chars">
                    {/* Letters are grouped per word so a phone wraps between
                        words, never inside one. */}
                    {hero.titleLine1.split(' ').map((word, w, words) => {
                      const offset = words.slice(0, w).join(' ').length + (w ? 1 : 0)
                      return (
                        <span key={w}>
                          {w > 0 && ' '}
                          <span className="hero-title-word">
                            {[...word].map((ch, i) => (
                              <span key={i} className="hero-title-char" style={{ '--i': offset + i }}>
                                {ch}
                              </span>
                            ))}
                          </span>
                        </span>
                      )
                    })}
                  </span>
                  <span className="hero-beacon hero-beacon-blue"></span>
                </span>
                <span className="hero-title-sub" aria-hidden="true">{hero.titleLine2}</span>
                <span className="hero-title-sub" aria-hidden="true">{hero.titleLine3}</span>
              </h1>
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
            <span className="hero-official-divider" aria-hidden="true">
              <span className="hero-official-diamond"></span>
            </span>
            <p className="hero-official-line">{t.header.eyebrow}</p>
            <p className="hero-official-line hero-official-line-sub">{t.header.subtitle}</p>
          </div>
        </div>
      </header>
    </>
  )
}

export default Header
