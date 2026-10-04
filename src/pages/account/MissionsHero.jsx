import './missionsHero.css'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, List, Medal, Siren } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { MISSIONS, TOTAL_MISSIONS } from '../../data/missions.js'
import { Silhouette } from '../../components/fireGearArt.jsx'

// Missions hero — «Сынаққа дайынсыз ба?». Left: the call to action and the
// path in three figures. Right: the route of the 9 missions to the final
// goal, coloured by the user's real progress (useMissionsProgress); each
// stop opens its mission. Background in the style of an МЧС field tablet:
// topographic contours, an emblem-radar (eight-pointed star in range
// rings) and technical drawings of fire equipment.

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
          <path className="mission-hero-star" d={starPath(40, 20)} />
          <circle className="mission-hero-star-ring" r="14" />
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

// ---- route of the 9 missions ------------------------------------------------------

// Serpentine route, bottom to top, in a 360×420 box: three rows of three
// stops, then the final goal at the summit.
const STOPS = [
  { x: 60, y: 372 },
  { x: 180, y: 386 },
  { x: 300, y: 362 },
  { x: 304, y: 262 },
  { x: 182, y: 282 },
  { x: 58, y: 256 },
  { x: 62, y: 156 },
  { x: 180, y: 176 },
  { x: 298, y: 150 },
]
const GOAL = { x: 180, y: 52 }
const ROUTE_POINTS = [...STOPS, GOAL]
const ROUTE_D = ROUTE_POINTS.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')
const pct = (v, total) => `${(v / total) * 100}%`

function MissionRoute({ missionState, nextIndex, onOpen, tr, lang }) {
  const done = MISSIONS.filter((m) => missionState[m.id]?.status === 'completed').length
  const allDone = done === TOTAL_MISSIONS
  // The lit part of the route ends at the last completed stop.
  const litUntil = MISSIONS.reduce((last, m, i) => (missionState[m.id]?.status === 'completed' ? i : last), -1)
  const litD = litUntil >= 0 ? ROUTE_POINTS.slice(0, (allDone ? ROUTE_POINTS.length : litUntil + 1)).map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ') : ''

  return (
    <div className="mh-route">
      <div className="mh-route-head">
        <span className="mh-route-title">{tr.routeTitle}</span>
        <span className="mh-route-count">
          <strong>{done}</strong> / {TOTAL_MISSIONS}
        </span>
      </div>
      <div className="mh-route-map">
        <svg viewBox="0 0 360 420" className="mh-route-svg" aria-hidden="true">
          <path d={ROUTE_D} className="mh-route-path" />
          {litD && <path d={litD} className="mh-route-path mh-route-path--lit" />}
        </svg>
        {MISSIONS.map((mission, i) => {
          const status = missionState[mission.id]?.status ?? 'not_started'
          const isNext = i === nextIndex
          const { Icon } = mission
          return (
            <button
              key={mission.id}
              type="button"
              className={`mh-stop mh-stop--${status}${isNext ? ' mh-stop--next' : ''}`}
              style={{ left: pct(STOPS[i].x, 360), top: pct(STOPS[i].y, 420), '--i': i }}
              onClick={() => onOpen(mission)}
              aria-label={`${mission.number}. ${mission.title[lang]} — ${tr.stopStatus[status]}`}
            >
              <span className="mh-stop-circle">
                {status === 'completed' ? <Check size={18} strokeWidth={3} aria-hidden="true" /> : <Icon size={18} strokeWidth={1.9} aria-hidden="true" />}
              </span>
              <span className="mh-stop-number">{mission.number}</span>
              <span className="mh-stop-tip" role="tooltip">
                <strong>{mission.title[lang]}</strong>
                <span>{tr.stopStatus[status]}</span>
              </span>
            </button>
          )
        })}
        <div
          className={`mh-goal${allDone ? ' mh-goal--reached' : ''}`}
          style={{ left: pct(GOAL.x, 360), top: pct(GOAL.y, 420) }}
          title={tr.goal}
        >
          <span className="mh-goal-circle">
            <Medal size={26} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="mh-goal-label">{tr.goal}</span>
        </div>
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
  const { t, lang } = useLanguage()
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

        <MissionRoute missionState={missionState} nextIndex={nextIndex} onOpen={openMission} tr={h} lang={lang} />
      </div>
    </div>
  )
}
