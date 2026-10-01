import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { BookOpen, ClipboardCheck, Compass, Medal, Shield, ShieldCheck, Siren, Target, TriangleAlert } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { TOTAL_MISSIONS } from '../../data/missions.js'
import { useMissionsProgress } from './useMissionsProgress.js'
import MissionsList from './MissionsList.jsx'

const STEP_ORDER = ['study', 'test', 'result', 'mission']
const STEP_ICONS = { study: BookOpen, test: ClipboardCheck, result: Target, mission: ShieldCheck }

const VALID_STAGES = ['intro', 'hero', 'list']

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Background of the missions hero, in the style of an MES field tablet: a
// faint topographic map (contour lines around two heights, as on rescue
// maps), a radar in the right half and coordinate-grid brackets in the
// corners. Everything is drawn at very low opacity behind the content.
function contourPath(cx, cy, radius, phase) {
  const points = []
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2
    const r = radius * (1 + 0.16 * Math.sin(3 * a + phase) + 0.08 * Math.cos(5 * a - phase) + 0.05 * Math.sin(7 * a))
    points.push(`${(cx + r * Math.cos(a) * 1.35).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`)
  }
  return `M${points.join(' L')} Z`
}

const CONTOURS = [
  ...[18, 34, 52, 72, 94, 118, 144].map((r, i) => ({ d: contourPath(430, 120, r, 0.6 + i * 0.12), index: i })),
  ...[16, 32, 50, 70, 92].map((r, i) => ({ d: contourPath(120, 250, r, 2.1 + i * 0.15), index: i })),
]

function CornerGrid({ x, y, flipX, flipY, label }) {
  const sx = flipX ? -1 : 1
  const sy = flipY ? -1 : 1
  return (
    <g className="mission-hero-corner" transform={`translate(${x} ${y}) scale(${sx} ${sy})`}>
      <path d="M0,34 L0,0 L34,0" />
      {[8, 16, 24].map((t) => (
        <g key={t}>
          <line x1={t} y1="0" x2={t} y2="4" />
          <line x1="0" y1={t} x2="4" y2={t} />
        </g>
      ))}
      {/* Un-flip the label; its offset is then measured from the corner itself. */}
      <text x={8 * sx} y={flipY ? -10 : 18} transform={`scale(${sx} ${sy})`} textAnchor={flipX ? 'end' : 'start'}>
        {label}
      </text>
    </g>
  )
}

function MissionsHeroVisual() {
  return (
    <svg
      className="mission-hero-svg"
      viewBox="0 0 600 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g className="mission-hero-topo">
        {CONTOURS.map((c, i) => (
          <path key={i} d={c.d} className={c.index % 3 === 2 ? 'mission-hero-topo-index' : undefined} />
        ))}
      </g>

      <g className="mission-hero-radar" transform="translate(470 150)">
        {[30, 60, 90, 120].map((r) => (
          <circle key={r} r={r} />
        ))}
        <line x1="-130" y1="0" x2="130" y2="0" />
        <line x1="0" y1="-130" x2="0" y2="130" />
        {!prefersReducedMotion && (
          <line className="mission-hero-radar-sweep" x1="0" y1="0" x2="120" y2="0" />
        )}
      </g>

      <CornerGrid x={10} y={10} label="N 48°" />
      <CornerGrid x={590} y={10} flipX label="E 68°" />
      <CornerGrid x={10} y={290} flipY label="ГЗ-01" />
      <CornerGrid x={590} y={290} flipX flipY label="ТЖМ" />
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
                  <Shield size={18} strokeWidth={2} />
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
              <div className="mission-hero-path-stat-row">
                <span className="mission-hero-path-stat-icon" aria-hidden="true">
                  <Medal size={18} strokeWidth={2} />
                </span>
                <span className="mission-hero-path-stat">{h.stat3}</span>
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
