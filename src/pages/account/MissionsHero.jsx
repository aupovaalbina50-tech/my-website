import './missionsHero.css'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, List, Siren } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { MISSIONS, TOTAL_MISSIONS } from '../../data/missions.js'
import { Silhouette } from '../../components/fireGearArt.jsx'

// Missions hero — «Сынаққа дайынсыз ба?»: the call to action and the path
// in three figures, on a background in the style of an МЧС field tablet —
// topographic contours, the emblem (eight-pointed star) in radar range rings
// and technical drawings of fire equipment. «Жалғастыру» leads to the first
// mission not completed yet (real progress from useMissionsProgress).

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ---- background ---------------------------------------------------------------

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

/** Eight-pointed star of the МЧС emblem, centred on (0, 0). */
function starPath(outer, inner) {
  const points = []
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = ((i * 22.5 - 90) * Math.PI) / 180
    points.push(`${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`)
  }
  return `M${points.join(' L')} Z`
}

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
      <text x={8 * sx} y={flipY ? -10 : 18} transform={`scale(${sx} ${sy})`} textAnchor={flipX ? 'end' : 'start'}>
        {label}
      </text>
    </g>
  )
}

function HeroBackground() {
  return (
    <div className="mission-hero-visual" aria-hidden="true">
      <svg className="mission-hero-svg" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice">
        <g className="mission-hero-topo">
          {CONTOURS.map((c, i) => (
            <path key={i} d={c.d} className={c.index % 3 === 2 ? 'mission-hero-topo-index' : undefined} />
          ))}
        </g>
        <g className="mission-hero-radar" transform="translate(455 150)">
          {[44, 76, 108, 140].map((r) => (
            <circle key={r} r={r} />
          ))}
          <line x1="-150" y1="0" x2="150" y2="0" />
          <line x1="0" y1="-150" x2="0" y2="150" />
          <path className="mission-hero-star" d={starPath(64, 30)} />
          <circle className="mission-hero-star-ring" r="22" />
          <circle className="mission-hero-star-ring" r="72" />
          {!prefersReducedMotion && <line className="mission-hero-radar-sweep" x1="0" y1="0" x2="140" y2="0" />}
        </g>
        <CornerGrid x={10} y={10} label="N 48°" />
        <CornerGrid x={590} y={10} flipX label="E 68°" />
        <CornerGrid x={10} y={290} flipY label="ГЗ-01" />
        <CornerGrid x={590} y={290} flipX flipY label="ТЖМ" />
      </svg>
      <div className="mission-hero-drawing mission-hero-drawing--truck">
        <Silhouette kind="truck" />
      </div>
      <div className="mission-hero-drawing mission-hero-drawing--helmet">
        <Silhouette kind="helmet" />
      </div>
    </div>
  )
}

// ---- hero -----------------------------------------------------------------------------

/** «9 жедел тапсырма» → { n: '9', text: 'жедел тапсырма' } */
const splitStat = (s) => {
  const m = String(s).match(/^(\d+)\s+(.*)$/)
  return m ? { n: m[1], text: m[2] } : { n: '', text: s }
}

export default function MissionsHero({ missionState, completedCount, onShowList }) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const h = t.account.missions.hero
  // First mission not completed yet — where «Продолжить» leads.
  const nextIndex = MISSIONS.findIndex((m) => missionState[m.id]?.status !== 'completed')
  const started = MISSIONS.some((m) => (missionState[m.id]?.status ?? 'not_started') !== 'not_started')
  const openMission = (mission) => navigate(`/account/missions/mission/${mission.id}`)

  const primary =
    started && nextIndex >= 0
      ? { label: h.continue(MISSIONS[nextIndex].number), onClick: () => openMission(MISSIONS[nextIndex]) }
      : { label: h.cta.replace(/\s*→\s*$/, ''), onClick: onShowList }

  return (
    <div className="mission-hero mission-hero--v2">
      <HeroBackground />

      <div className="mission-hero-grid">
        <div className="mission-hero-body">
          <span className="mission-hero-eyebrow">
            <Siren size={14} aria-hidden="true" />
            {h.eyebrow}
          </span>
          <h1 className="mission-hero-title">{h.title}</h1>
          <p className="mission-hero-lead">{h.lead}</p>
          <p className="mission-hero-sub">{h.sub}</p>

          <ul className="mission-hero-tiles">
            {[h.stat1, h.stat2, h.stat3].map((s, i) => {
              const { n, text } = splitStat(s)
              return (
                <li key={i} className="mission-hero-tile" style={{ '--i': i }}>
                  <span className="mission-hero-tile-num">{n}</span>
                  <span className="mission-hero-tile-text">{text}</span>
                </li>
              )
            })}
          </ul>

          <div className="mission-hero-actions">
            <button type="button" className="mission-hero-cta" onClick={primary.onClick}>
              {primary.label}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button type="button" className="mission-hero-secondary" onClick={onShowList}>
              <List size={16} aria-hidden="true" />
              {h.allMissions}
            </button>
          </div>
          {completedCount > 0 && <p className="mission-hero-done">{h.progressCount(completedCount, TOTAL_MISSIONS)}</p>}
        </div>

      </div>
    </div>
  )
}
