import { useState } from 'react'
import { Siren } from 'lucide-react'
import SiteSectionLayout from '../components/SiteSectionLayout.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { EMERGENCY_HAZARDS } from '../data/emergencyHazards'

// Eight satellite nodes evenly spaced on a circle around the center node
// (percentage coordinates in a 0-100 square, starting at the top and going
// clockwise), paired 1:1 with EMERGENCY_HAZARDS by index.
const NODE_POSITIONS = [
  { x: 50, y: 13 },
  { x: 76.2, y: 23.8 },
  { x: 87, y: 50 },
  { x: 76.2, y: 76.2 },
  { x: 50, y: 87 },
  { x: 23.8, y: 76.2 },
  { x: 13, y: 50 },
  { x: 23.8, y: 23.8 },
]

const CENTER = { x: 50, y: 50 }

function TermMapPage() {
  const { lang, t } = useLanguage()
  const [hoveredId, setHoveredId] = useState(null)
  const [selectedId, setSelectedId] = useState(null)

  return (
    <SiteSectionLayout activeSection="termMap">
      <section id="term-map" className="section-term-map">
        <div className="section-kicker" aria-hidden="true"></div>
        <h1 className="section-title">{t.termMap.title}</h1>
        <p className="section-lead">{t.termMap.lead}</p>

        <div className="term-map-canvas">
          <div className="term-map-network" onMouseLeave={() => setHoveredId(null)}>
            <svg
              className="term-map-network-lines"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {EMERGENCY_HAZARDS.map((hazard, i) => {
                const pos = NODE_POSITIONS[i]
                const isActive = hoveredId === hazard.id || selectedId === hazard.id
                return (
                  <line
                    key={hazard.id}
                    x1={CENTER.x}
                    y1={CENTER.y}
                    x2={pos.x}
                    y2={pos.y}
                    className={`term-map-edge${isActive ? ' active' : ''}`}
                  />
                )
              })}
            </svg>

            <div
              className="term-map-node term-map-node-center"
              style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%` }}
              title={t.termMap.centerLabelFull}
            >
              <span className="term-map-node-icon" aria-hidden="true">
                <Siren size={28} strokeWidth={1.75} />
              </span>
              <span className="term-map-node-center-label">{t.termMap.centerLabel}</span>
            </div>

            {EMERGENCY_HAZARDS.map((hazard, i) => {
              const pos = NODE_POSITIONS[i]
              const label = hazard.name[lang]
              const isSelected = selectedId === hazard.id
              const isDimmed = hoveredId !== null && hoveredId !== hazard.id

              return (
                <button
                  key={hazard.id}
                  type="button"
                  className={`term-map-node term-map-node-satellite${isSelected ? ' selected' : ''}${isDimmed ? ' dimmed' : ''}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  onMouseEnter={() => setHoveredId(hazard.id)}
                  onFocus={() => setHoveredId(hazard.id)}
                  onBlur={() => setHoveredId(null)}
                  onClick={() => setSelectedId((prev) => (prev === hazard.id ? null : hazard.id))}
                  aria-pressed={isSelected}
                >
                  <span className="term-map-node-circle">
                    <span className="term-map-node-icon" aria-hidden="true">
                      <hazard.Icon size={26} strokeWidth={1.75} />
                    </span>
                  </span>
                  <span className="term-map-node-label">{label}</span>
                  <span className="term-map-node-tooltip" role="tooltip">
                    {label}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="term-map-hint">{t.termMap.hint}</p>
        </div>
      </section>
    </SiteSectionLayout>
  )
}

export default TermMapPage
