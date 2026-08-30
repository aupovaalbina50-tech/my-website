import { Flame, LifeBuoy, Radio, Hospital, AlertTriangle, ShieldCheck } from 'lucide-react'
import { CATEGORIES } from '../i18n/translations'

// Stylised, simplified silhouette of Kazakhstan (illustrative HUD backdrop,
// not surveyed geography) — wide east-west landmass with a Caspian-coast
// notch on the southwest, drawn in a 0-200 x 0-100 box.
const MAP_OUTLINE =
  'M20,20 L45,10 L75,8 L100,14 L125,8 L148,13 L168,22 L184,36 L176,48 L188,58 ' +
  'L172,68 L154,62 L145,76 L122,70 L112,84 L90,78 L78,88 L60,82 L44,86 L34,72 ' +
  'L40,60 L26,64 L30,50 L15,46 L24,36 L12,28 Z'

// Balkhash-lake-style accent inside the landmass, purely decorative.
const LAKE_PATH = 'M120,52 Q140,48 152,56 Q140,64 122,60 Q116,56 120,52 Z'

const HAZARD_KEYS = ['emergencies', 'fire_safety', 'rescue_ops', 'disaster_medicine', 'alerting_comms']
const HAZARD_ICONS = [AlertTriangle, Flame, LifeBuoy, Hospital, Radio]

const NODE_POSITIONS = [
  { x: 50, y: 17 },
  { x: 81.4, y: 39.8 },
  { x: 69.4, y: 76.7 },
  { x: 30.6, y: 76.7 },
  { x: 18.6, y: 39.8 },
]

function CivilDefenseMapGraphic({ lang, centerLabel }) {
  const nodes = HAZARD_KEYS.map((key, i) => {
    const category = CATEGORIES.find((c) => c.key === key)
    return {
      key,
      label: category?.[lang] || key,
      Icon: HAZARD_ICONS[i],
      ...NODE_POSITIONS[i],
    }
  })

  return (
    <div className="kzmap" role="img" aria-label={centerLabel}>
      <p className="kzmap-tag kzmap-tag-top">CIVIL PROTECTION</p>

      <svg className="kzmap-outline" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path d={MAP_OUTLINE} className="kzmap-outline-fill" />
        <path d={MAP_OUTLINE} className="kzmap-outline-stroke" />
        <path d={LAKE_PATH} className="kzmap-lake" />
      </svg>

      <svg className="kzmap-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {nodes.map((n, i) => (
          <g key={n.key} style={{ '--line-delay': `${0.55 + i * 0.12}s`, '--pulse-delay': `${i * 1.6}s` }}>
            <line x1="50" y1="50" x2={n.x} y2={n.y} className="kzmap-line" />
            <line x1="50" y1="50" x2={n.x} y2={n.y} className="kzmap-line-pulse" />
          </g>
        ))}
      </svg>

      <div className="kzmap-node kzmap-node-center" style={{ left: '50%', top: '50%' }}>
        <span className="kzmap-node-inner">
          <span className="kzmap-badge kzmap-badge-center" aria-hidden="true">
            <ShieldCheck size={22} strokeWidth={2} aria-hidden="true" />
          </span>
        </span>
      </div>

      {nodes.map((n, i) => (
        <div
          key={n.key}
          className="kzmap-node"
          style={{ left: `${n.x}%`, top: `${n.y}%`, '--node-delay': `${0.85 + i * 0.1}s` }}
        >
          <span className="kzmap-node-inner">
            <span className="kzmap-badge" aria-hidden="true">
              <n.Icon size={16} strokeWidth={2} aria-hidden="true" />
            </span>
            <span className="kzmap-node-label">{n.label}</span>
          </span>
        </div>
      ))}

      <p className="kzmap-tag kzmap-tag-online">
        <span className="kzmap-tag-dot" aria-hidden="true" />
        SYSTEM ONLINE
      </p>
      <p className="kzmap-tag kzmap-tag-langs">KZ / RU / EN</p>
    </div>
  )
}

export default CivilDefenseMapGraphic
