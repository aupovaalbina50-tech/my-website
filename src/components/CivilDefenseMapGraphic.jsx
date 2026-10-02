import { useLanguage } from '../i18n/LanguageContext.jsx'

// Kazakhstan's real border, simplified from public boundary data
// (johan/world.geo.json) and projected with an equirectangular
// (cos-latitude-corrected) projection into a 0-200 x 0-100 box.
const MAP_OUTLINE =
  'M116.8,85.2 L114.4,86.3 L109.0,90.6 L107.1,95.0 L105.6,95.0 L104.5,92.1 L99.2,91.9 L98.3,86.9 ' +
  'L96.3,86.9 L96.6,80.7 L91.6,76.3 L84.5,76.7 L79.6,77.6 L75.7,72.1 L72.3,69.8 L65.8,65.4 L65.1,64.9 ' +
  'L54.4,68.5 L54.5,91.0 L52.4,91.3 L49.5,86.6 L46.7,84.8 L42.0,86.1 L40.1,88.1 L39.9,86.7 L40.9,84.1 ' +
  'L40.1,82.0 L35.3,79.9 L33.5,74.4 L31.2,72.9 L31.0,70.9 L35.1,71.4 L35.2,67.0 L38.8,66.0 L42.4,66.9 ' +
  'L43.1,60.9 L42.4,57.2 L38.2,57.5 L34.7,56.0 L29.9,58.6 L26.0,59.9 L23.9,58.9 L24.3,55.8 L21.7,51.7 ' +
  'L18.6,51.9 L15.1,47.7 L17.5,43.1 L16.3,41.9 L19.6,35.1 L23.8,38.7 L24.4,34.2 L32.9,27.6 L39.4,27.4 ' +
  'L48.6,31.6 L53.5,34.1 L57.9,31.5 L64.5,31.4 L69.8,34.6 L71.0,32.8 L76.8,33.0 L77.9,30.1 L71.2,25.9 ' +
  'L75.1,23.0 L74.4,21.3 L78.3,19.7 L75.3,15.5 L77.3,13.4 L92.8,11.3 L94.8,9.8 L105.2,7.5 L109.0,5.0 ' +
  'L116.4,6.3 L117.7,12.7 L122.1,11.2 L127.4,13.3 L127.0,16.6 L131.0,16.2 L141.4,10.5 L139.9,12.4 ' +
  'L145.2,17.1 L154.5,32.6 L156.7,29.4 L162.4,33.0 L168.4,31.4 L170.7,32.5 L172.7,36.0 L175.6,37.2 ' +
  'L177.4,39.8 L182.7,39.0 L184.9,42.7 L181.8,46.8 L178.3,47.4 L178.1,53.5 L175.8,56.3 L167.6,54.2 ' +
  'L164.6,65.2 L162.4,66.5 L154.2,69.0 L158.0,79.6 L155.1,81.2 L155.4,84.7 L152.9,83.8 L150.8,81.6 ' +
  'L144.6,81.0 L137.7,80.8 L136.2,81.5 L130.3,78.9 L128.0,80.2 L127.3,83.8 L120.5,81.7 L117.7,82.5 Z'

// Lake Balkhash, roughly where it sits inside the real outline above.
const LAKE_PATH = 'M126.9,58.1 Q137.7,54 151.0,62.4 Q137.7,68 126.9,58.1 Z'

// Seats of the 20 regional emergency departments (ДЧС of every oblast and
// of the three cities of republican significance), in the same 0-200 x
// 0-100 projection as the outline, fitted to the country's extreme points
// (46.49°E → x 15.1, 87.31°E → x 184.9, 55.44°N → y 5.0, 40.57°N → y 95.0):
// x = 15.1 + (lon - 46.49) * 4.16, y = 5.0 + (55.44 - lat) * 6.05.
const DEPARTMENTS = [
  { key: 'astana', x: 118.9, y: 31.1, hub: true },
  { key: 'almaty', x: 141.8, y: 78.8, hub: true },
  { key: 'shymkent', x: 111.2, y: 84.4, hub: true },
  { key: 'kokshetau', x: 110.4, y: 18.1 },
  { key: 'petropavl', x: 109.4, y: 8.4 },
  { key: 'kostanay', x: 86.4, y: 18.5 },
  { key: 'pavlodar', x: 141.8, y: 24.1 },
  { key: 'semey', x: 155.5, y: 35.4 },
  { key: 'oskemen', x: 165.4, y: 38.2 },
  { key: 'karaganda', x: 125.8, y: 39.1 },
  { key: 'zhezkazgan', x: 103.4, y: 51.2 },
  { key: 'taldykorgan', x: 147.7, y: 68.0 },
  { key: 'konaev', x: 142.4, y: 75.0 },
  { key: 'taraz', x: 118.6, y: 80.9 },
  { key: 'turkestan', x: 105.6, y: 78.4 },
  { key: 'kyzylorda', x: 94.2, y: 69.1 },
  { key: 'aktobe', x: 59.5, y: 36.2 },
  { key: 'oral', x: 35.4, y: 30.5 },
  { key: 'atyrau', x: 37.7, y: 55.5 },
  { key: 'aktau', x: 34.7, y: 76.3 },
]

const DEPT_BY_KEY = Object.fromEntries(DEPARTMENTS.map((d) => [d.key, d]))

// Hazard symbols drawn like conventional signs on an engineering map:
// straight hairlines, square ends, no rounded "app icon" shapes. All on a
// 24-unit grid; `circles` are [cx, cy, r].
const HAZARD_SIGNS = {
  // Command post: a rotating beacon on its base with light rays.
  hq: {
    d: ['M6 18 H18 V21 H6 Z', 'M8 18 V13 A4 4 0 0 1 16 13 V18', 'M12 3 V6 M4.5 6.5 L6.5 8.5 M19.5 6.5 L17.5 8.5 M2 13 H5 M19 13 H22'],
  },
  // Coal mine: winding headframe over the shaft, with its sheave wheel.
  mines: {
    d: ['M2 21 H22', 'M6.5 21 L11 7.5 M17.5 21 L13 7.5', 'M8.4 15.5 H15.6 M9.7 11.5 H14.3', 'M12 7.5 V21'],
    circles: [[12, 5, 2.5]],
  },
  // Fire: a flame over a burning ground line.
  fires: {
    d: ['M12 3 C13 7 17 8.5 17 13 A5 5 0 0 1 7 13 C7 10.5 8.5 9 9.5 8 C9.8 9.8 10.7 10.6 11.5 11 C11.7 8 10.5 5.5 12 3 Z', 'M3 21 H21', 'M5 21 L7 18 M19 21 L17 18'],
  },
  // Earthquake: a seismograph trace.
  quake: {
    d: ['M2 12 H6 L7.5 7 L9.5 17 L11.5 3 L13.5 19 L15.5 8 L17 12 H22', 'M2 21 H22'],
  },
  // Mudflow / avalanche: a slope with debris flow lines.
  mudflow: {
    d: ['M2 20 L9 7 L13 13 L15 10 L22 20 Z', 'M6 17 C8 16 9 18 11 17 C13 16 14 18 16 17'],
  },
  // Flood: rising water level mark over water.
  flood: {
    d: ['M2 13 C4 11 6 11 8 13 C10 15 12 15 14 13 C16 11 18 11 20 13 L22 14', 'M2 18 C4 16 6 16 8 18 C10 20 12 20 14 18 C16 16 18 16 20 18 L22 19', 'M12 3 V9', 'M9 6 L12 9 L15 6'],
  },
  // Industry: a plant with saw-tooth roof and stack.
  industry: {
    d: ['M2 21 V11 L7 14 V11 L12 14 V11 L17 14 V4 H20 V21 Z', 'M5 17 H7 M10 17 H12 M15 17 H17'],
  },
  // Sea rescue: a lifebuoy.
  sea: {
    d: ['M5.6 5.6 L9.2 9.2 M18.4 5.6 L14.8 9.2 M5.6 18.4 L9.2 14.8 M18.4 18.4 L14.8 14.8'],
    circles: [
      [12, 12, 9],
      [12, 12, 4],
    ],
  },
}

function HazardSign({ risk, ...props }) {
  const sign = HAZARD_SIGNS[risk]
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" strokeLinejoin="miter" {...props}>
      {sign.d.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {sign.circles?.map(([cx, cy, r], i) => (
        <circle key={`c${i}`} cx={cx} cy={cy} r={r} />
      ))}
    </svg>
  )
}

// One badge per region's best-known hazard, so the map reads as "what the
// service there deals with most": coal mines in Karaganda, forest and
// steppe fires in the east and north, earthquakes in Almaty, mudflows in
// Zhetisu, spring floods on the Ural and Ishim, oil and heavy industry in
// Atyrau and Pavlodar, Caspian rescue at Aktau. `dx`/`dy` (viewBox units)
// were picked so each icon sits wholly inside the border, clear of the
// department dots and of the other icons.
const RISK_TONE = {
  hq: 'hq',
  mines: 'mine',
  fires: 'fire',
  quake: 'quake',
  mudflow: 'quake',
  flood: 'water',
  industry: 'industry',
  sea: 'water',
}

const SERVICE_BADGES = [
  { at: 'astana', risk: 'hq', dx: 7, dy: 0 },
  { at: 'karaganda', risk: 'mines', dx: 0, dy: 7 },
  { at: 'semey', risk: 'fires', dx: -1, dy: 7 },
  { at: 'oskemen', risk: 'fires', dx: 0, dy: 7 },
  { at: 'kostanay', risk: 'fires', dx: 0, dy: 7 },
  { at: 'almaty', risk: 'quake', dx: -7, dy: -6 },
  { at: 'taldykorgan', risk: 'mudflow', dx: 10, dy: -8 },
  { at: 'oral', risk: 'flood', dx: 0, dy: 7 },
  { at: 'petropavl', risk: 'flood', dx: -6, dy: 7 },
  { at: 'atyrau', risk: 'industry', dx: 0, dy: -7 },
  { at: 'pavlodar', risk: 'industry', dx: 0, dy: 7 },
  { at: 'aktau', risk: 'sea', dx: 7, dy: -3 },
]

// Each department linked to its neighbours, so the whole country reads as
// one connected response network.
const LINKS = [
  ['oral', 'aktobe'],
  ['oral', 'atyrau'],
  ['atyrau', 'aktau'],
  ['atyrau', 'aktobe'],
  ['aktobe', 'kostanay'],
  ['aktobe', 'kyzylorda'],
  ['kostanay', 'petropavl'],
  ['kostanay', 'kokshetau'],
  ['petropavl', 'kokshetau'],
  ['kokshetau', 'astana'],
  ['astana', 'pavlodar'],
  ['astana', 'karaganda'],
  ['pavlodar', 'semey'],
  ['semey', 'oskemen'],
  ['karaganda', 'semey'],
  ['karaganda', 'zhezkazgan'],
  ['karaganda', 'taldykorgan'],
  ['oskemen', 'taldykorgan'],
  ['zhezkazgan', 'kyzylorda'],
  ['kyzylorda', 'turkestan'],
  ['turkestan', 'shymkent'],
  ['shymkent', 'taraz'],
  ['taraz', 'almaty'],
  ['almaty', 'konaev'],
  ['konaev', 'taldykorgan'],
  ['aktau', 'kyzylorda'],
]

function CivilDefenseMapGraphic() {
  const { t } = useLanguage()
  return (
    <div className="kzmap" aria-hidden="true">
      <svg className="kzmap-svg" viewBox="0 0 200 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="kzmap-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.9" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="kzmap-fill" cx="58%" cy="45%" r="60%">
            <stop offset="0%" stopColor="rgba(64, 196, 255, 0.14)" />
            <stop offset="100%" stopColor="rgba(64, 196, 255, 0.02)" />
          </radialGradient>
        </defs>

        <path d={MAP_OUTLINE} className="kzmap-fill" />
        <path d={LAKE_PATH} className="kzmap-lake" />
        <path d={MAP_OUTLINE} className="kzmap-border" filter="url(#kzmap-glow)" />
        <path d={MAP_OUTLINE} className="kzmap-border-run" pathLength="100" filter="url(#kzmap-glow)" />

        {LINKS.map(([a, b], i) => {
          const from = DEPT_BY_KEY[a]
          const to = DEPT_BY_KEY[b]
          return (
            <g key={`${a}-${b}`} style={{ '--link-delay': `${(i * 0.37) % 6}s` }}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} className="kzmap-link" />
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                pathLength="100"
                className="kzmap-link-spark"
                filter="url(#kzmap-glow)"
              />
            </g>
          )
        })}

        {/* Thin dashed leader from each department to its hazard marker,
            as on an operational map. */}
        {SERVICE_BADGES.map(({ at, risk, dx, dy }) => {
          const d = DEPT_BY_KEY[at]
          return (
            <line
              key={`leader-${at}`}
              x1={d.x}
              y1={d.y}
              x2={d.x + dx}
              y2={d.y + dy}
              className={`kzmap-leader kzmap-leader-${RISK_TONE[risk]}`}
            />
          )
        })}

        {DEPARTMENTS.map((d, i) => (
          <g key={d.key} style={{ '--node-delay': `${(i * 0.29) % 4}s` }}>
            <circle cx={d.x} cy={d.y} r={d.hub ? 2.4 : 1.8} className="kzmap-node-ring" />
            <circle cx={d.x} cy={d.y} r={d.hub ? 1.1 : 0.8} className="kzmap-node" filter="url(#kzmap-glow)" />
          </g>
        ))}
      </svg>

      {SERVICE_BADGES.map(({ at, risk, dx, dy }, i) => {
        const d = DEPT_BY_KEY[at]
        const tone = RISK_TONE[risk]
        return (
          <span
            key={at}
            className={`kzmap-badge kzmap-badge-${tone}`}
            title={t.header.hero.mapRisks[risk]}
            style={{ left: `${(d.x + dx) / 2}%`, top: `${d.y + dy}%`, '--badge-delay': `${0.6 + i * 0.1}s` }}
          >
            <HazardSign risk={risk} className="kzmap-badge-icon" />
          </span>
        )
      })}
    </div>
  )
}

export default CivilDefenseMapGraphic
