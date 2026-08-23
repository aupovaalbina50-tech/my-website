import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BookOpen, ClipboardCheck, Compass, Flag, ShieldCheck, Siren, Target, TriangleAlert } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { TOTAL_MISSIONS } from '../../data/missions.js'
import { useMissionsProgress } from './useMissionsProgress.js'
import MissionsList from './MissionsList.jsx'

const STEP_ORDER = ['study', 'test', 'result', 'mission']
const STEP_ICONS = { study: BookOpen, test: ClipboardCheck, result: Target, mission: ShieldCheck }

const VALID_STAGES = ['intro', 'hero', 'list']

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// A trail up the ridge, not a smooth growth curve — angular waypoint-to-
// waypoint legs, the way a route is actually marked on an ops map.
const ROUTE_PATH = 'M40,268 L128,236 L182,246 L246,180 L308,196 L372,124 L432,140 L560,48'
const WAYPOINTS = [
  { x: 246, y: 180 },
  { x: 372, y: 124 },
  { x: 432, y: 140 },
]

function MissionsHeroVisual() {
  return (
    <svg
      className="mission-hero-svg"
      viewBox="0 0 600 300"
      preserveAspectRatio="xMaxYMid slice"
      aria-hidden="true"
    >
      <path
        className="mission-hero-ridge"
        d="M0,300 L0,222 L60,152 L110,192 L170,112 L230,176 L300,92 L360,160 L430,72 L490,142 L560,62 L600,112 L600,300 Z"
      />

      {/* coordinate ticks — cartographic framing, not a chart axis */}
      <g className="mission-hero-ticks">
        {[0, 1, 2, 3, 4].map((i) => (
          <line key={i} x1={i * 150} y1="290" x2={i * 150} y2="296" />
        ))}
      </g>

      <path id="mission-route-path" className="mission-hero-route" d={ROUTE_PATH} pathLength="1" />

      <circle className="mission-hero-node" cx="40" cy="268" r="4" />
      {WAYPOINTS.map((p, i) => (
        <rect
          key={i}
          className="mission-hero-waypoint"
          x={p.x - 5}
          y={p.y - 5}
          width="10"
          height="10"
          transform={`rotate(45 ${p.x} ${p.y})`}
        />
      ))}

      <g className="mission-hero-summit" transform="translate(560,48)">
        <line className="mission-hero-summit-pole" x1="0" y1="2" x2="0" y2="-30" />
        <path className="mission-hero-summit-flag" d="M0,-30 L20,-23 L0,-16 Z" />
        <circle className="mission-hero-summit-base" cx="0" cy="4" r="4" />
      </g>

      <circle className="mission-hero-dot" cx="40" cy="268" r="5">
        {!prefersReducedMotion && (
          <animateMotion dur="7s" repeatCount="indefinite" calcMode="linear">
            <mpath href="#mission-route-path" xlinkHref="#mission-route-path" />
          </animateMotion>
        )}
      </circle>
    </svg>
  )
}

function MissionsIntroPage() {
  const { t } = useLanguage()
  const location = useLocation()
  const m = t.account.missions
  const [stage, setStage] = useState(() =>
    VALID_STAGES.includes(location.state?.stage) ? location.state.stage : 'intro'
  )
  const { completedCount } = useMissionsProgress()

  if (stage === 'list') {
    return <MissionsList />
  }

  if (stage === 'hero') {
    const h = m.hero
    return (
      <div className="mission-page">
        <div className="mission-hero">
          <div className="mission-hero-visual">
            <MissionsHeroVisual />
          </div>

          <div className="mission-hero-body">
            <span className="mission-hero-eyebrow">
              <Siren size={14} aria-hidden="true" />
              {h.eyebrow}
            </span>
            <h1 className="mission-hero-title">{h.title}</h1>
            <p className="mission-hero-lead">{h.lead}</p>
            <p className="mission-hero-sub">{h.sub}</p>

            <div className="mission-hero-path-stats">
              <div className="mission-hero-path-stat-row">
                <span className="mission-hero-path-stat-icon" aria-hidden="true">
                  <Target size={18} strokeWidth={2} />
                </span>
                <span className="mission-hero-path-stat">{h.stat1}</span>
              </div>
              <span className="mission-hero-path-arrow" aria-hidden="true">
                &darr;
              </span>
              <div className="mission-hero-path-stat-row">
                <span className="mission-hero-path-stat-icon" aria-hidden="true">
                  <Compass size={18} strokeWidth={2} />
                </span>
                <span className="mission-hero-path-stat">{h.stat2}</span>
              </div>
              <span className="mission-hero-path-arrow" aria-hidden="true">
                &darr;
              </span>
              <div className="mission-hero-path-stat-row mission-hero-path-stat-row--final">
                <span className="mission-hero-path-stat-icon" aria-hidden="true">
                  <Flag size={18} strokeWidth={2} />
                </span>
                <span className="mission-hero-path-stat mission-hero-path-stat--final">{h.stat3}</span>
              </div>
            </div>

            <button type="button" className="mission-hero-cta" onClick={() => setStage('list')}>
              {h.cta}
            </button>
          </div>
        </div>

        <div className="mission-progress-note">
          <span className="mission-progress-text">{h.progressNote}</span>
          <span className="mission-progress-count">
            {h.progressCount(completedCount, TOTAL_MISSIONS)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="account-home mission-page">
      <div className="account-card">
        <span className="mission-eyebrow">
          <Siren size={14} aria-hidden="true" />
          {t.account.sidebar.missions}
        </span>
        <h1 className="account-title">{m.intro.title}</h1>
        <p className="account-description">{m.intro.subtitle}</p>
      </div>

      <div className="card mission-steps-card">
        <ol className="mission-steps">
          {STEP_ORDER.map((key, i) => {
            const step = m.intro.steps[key]
            const Icon = STEP_ICONS[key]
            return (
              <li className="mission-step" key={key} style={{ '--i': i }}>
                <div className="mission-step-marker">
                  <span className="mission-step-number">{step.number}</span>
                  <span className="mission-step-icon" aria-hidden="true">
                    <Icon size={19} strokeWidth={1.75} />
                  </span>
                </div>
                <div className="mission-step-body">
                  <h2 className="mission-step-title">{step.title}</h2>
                  <p className="mission-step-text">{step.text}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="mission-rule">
        <span className="mission-rule-icon" aria-hidden="true">
          <TriangleAlert size={24} strokeWidth={2} />
        </span>
        <div>
          <h3 className="mission-rule-title">{m.intro.ruleTitle}</h3>
          <p className="mission-rule-text">{m.intro.ruleText}</p>
        </div>
      </div>

      <button
        type="button"
        className="btn-auth-primary quiz-start-btn mission-cta"
        onClick={() => setStage('hero')}
      >
        {m.intro.cta}
      </button>
    </div>
  )
}

export default MissionsIntroPage
