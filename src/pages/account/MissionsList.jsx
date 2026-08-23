import { useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Lock, Siren } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { CATEGORIES } from '../../i18n/translations.js'
import { MISSIONS, TOTAL_MISSIONS } from '../../data/missions.js'
import { useMissionsProgress } from './useMissionsProgress.js'

const ALIGN = ['start', 'center', 'end']

function useRouteConnectors(count, deps) {
  const containerRef = useRef(null)
  const nodeRefs = useRef([])
  const [geo, setGeo] = useState({ pathD: '', width: 0, height: 0 })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const compute = () => {
      const containerRect = container.getBoundingClientRect()
      const points = nodeRefs.current
        .slice(0, count)
        .filter(Boolean)
        .map((el) => {
          const r = el.getBoundingClientRect()
          return {
            x: r.left + r.width / 2 - containerRect.left,
            y: r.top + r.height / 2 - containerRect.top,
          }
        })
      if (points.length < 2) return
      let d = `M ${points[0].x} ${points[0].y}`
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const curr = points[i]
        const midY = (prev.y + curr.y) / 2
        d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`
      }
      setGeo({ pathD: d, width: containerRect.width, height: containerRect.height })
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(container)
    window.addEventListener('resize', compute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', compute)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { containerRef, nodeRefs, geo }
}

function MissionStatusBadge({ state, l }) {
  if (state.status === 'completed') {
    return (
      <span className="mission-node-status mission-node-status--completed">
        <CheckCircle2 size={14} aria-hidden="true" />
        {l.statusCompleted}
        {state.score !== null && <span className="mission-node-score">{state.score}%</span>}
      </span>
    )
  }

  if (state.status === 'in_progress') {
    const percent = state.total > 0 ? Math.round((state.studied / state.total) * 100) : 0
    return (
      <span className="mission-node-status mission-node-status--in-progress">
        <span className="mission-node-status-ring" aria-hidden="true">
          <svg viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="8" className="mission-node-status-ring-track" />
            <circle
              cx="10"
              cy="10"
              r="8"
              className="mission-node-status-ring-fill"
              style={{ '--percent': percent }}
            />
          </svg>
        </span>
        {l.statusInProgress}
        <span className="mission-node-progress-text">{l.studiedProgress(state.studied, state.total)}</span>
      </span>
    )
  }

  return (
    <span className="mission-node-status mission-node-status--not-started">
      <Lock size={13} aria-hidden="true" />
      {l.statusNotStarted}
    </span>
  )
}

function MissionsList() {
  const { t, lang } = useLanguage()
  const m = t.account.missions
  const l = m.list
  const navigate = useNavigate()
  const { missionState, completedCount } = useMissionsProgress()
  const { containerRef, nodeRefs, geo } = useRouteConnectors(MISSIONS.length, [lang])

  const handleSelect = (mission) => {
    navigate(`/account/missions/mission/${mission.id}`, { state: { from: 'list' } })
  }

  return (
    <div className="mission-page mission-list-page">
      <div className="mission-list-head">
        <div className="mission-list-head-text">
          <span className="mission-eyebrow">
            <Siren size={14} aria-hidden="true" />
            {t.account.sidebar.missions}
          </span>
          <h1 className="mission-list-title">{l.title}</h1>
          <p className="mission-list-subtitle">{l.subtitle}</p>
        </div>
        <div className="mission-list-progress-badge">
          {m.hero.progressCount(completedCount, TOTAL_MISSIONS)}
        </div>
      </div>

      <div className="mission-route" ref={containerRef}>
        {geo.pathD && (
          <svg
            className="mission-route-svg"
            viewBox={`0 0 ${geo.width} ${geo.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path className="mission-route-line" d={geo.pathD} pathLength="1" />
          </svg>
        )}

        <ol className="mission-route-list">
          {MISSIONS.map((mission, i) => {
            const category = CATEGORIES.find((c) => c.key === mission.categoryKey)
            const state = missionState[mission.id]
            const Icon = mission.Icon
            return (
              <li
                key={mission.id}
                className={`mission-route-row mission-route-row--${ALIGN[i % 3]}`}
                style={{ '--i': i }}
              >
                <button
                  type="button"
                  ref={(el) => {
                    nodeRefs.current[i] = el
                  }}
                  className={`mission-node mission-node--${state.status}`}
                  onClick={() => handleSelect(mission)}
                >
                  <span className="mission-node-top">
                    <span className="mission-node-number">{mission.number}</span>
                    <span className="mission-node-icon" aria-hidden="true">
                      <Icon size={20} strokeWidth={1.75} />
                    </span>
                  </span>
                  <span className="mission-node-title">{mission.title[lang]}</span>
                  <span className="mission-node-category">{category?.[lang]}</span>
                  <MissionStatusBadge state={state} l={l} />
                  <span className="mission-node-meta">{l.previewMeta(mission.requiredTerms)}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="mission-list-footer">
        <h3 className="mission-list-footer-title">{l.footerTitle}</h3>
        <div className="mission-list-footer-steps">
          {l.footerSteps.map((step, i) => (
            <span className="mission-list-footer-step" key={step}>
              {i > 0 && (
                <span className="mission-list-footer-arrow" aria-hidden="true">
                  &rarr;
                </span>
              )}
              {step}
            </span>
          ))}
        </div>
        <span className="mission-list-footer-count">{l.footerCompleted(completedCount, TOTAL_MISSIONS)}</span>
      </div>
    </div>
  )
}

export default MissionsList
