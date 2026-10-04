import './missionScene.css'
import { useEffect, useRef } from 'react'
import { createParticleSystem } from './missionParticles.js'

// Animated, realistic scene of a mission — one per mission, drawn from its
// title — driven by the operation's progress (`reached` = stages completed):
//   0  the incident at full strength (briefing / stage 01 «оценка»)
//   1  the danger zone is cordoned off (stage 02)
//   2  forces arrive and do the mission's own action (stage 03)
//   3  the hazard dies down (stage 04 «контроль»)
//   4  resolved
// Layers: an SVG illustration (2.5D buildings, detailed vehicles, crews in
// uniform, light) + a canvas of particles on top (fire, smoke, steam, water
// spray, gas, sparks, dust, rain) whose strength follows the stage.

// ---- shared defs ----------------------------------------------------------------------

function Defs() {
  return (
    <defs>
      <linearGradient id="ms-sky-day" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#bcd6ee" />
        <stop offset="1" stopColor="#eef5fb" />
      </linearGradient>
      <linearGradient id="ms-sky-dusk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3a4d6b" />
        <stop offset="0.6" stopColor="#8a7d86" />
        <stop offset="1" stopColor="#d9a77f" />
      </linearGradient>
      <linearGradient id="ms-sky-overcast" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8e9aa8" />
        <stop offset="1" stopColor="#cfd6de" />
      </linearGradient>
      <linearGradient id="ms-asphalt" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5d6672" />
        <stop offset="1" stopColor="#434b55" />
      </linearGradient>
      <linearGradient id="ms-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e9edf1" />
        <stop offset="1" stopColor="#c9d1da" />
      </linearGradient>
      <linearGradient id="ms-wall-warm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e7d8c6" />
        <stop offset="1" stopColor="#c7b29a" />
      </linearGradient>
      <linearGradient id="ms-side" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#a8b3bf" />
        <stop offset="1" stopColor="#8995a3" />
      </linearGradient>
      <linearGradient id="ms-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#d8ebf8" />
        <stop offset="0.5" stopColor="#8fb3cf" />
        <stop offset="1" stopColor="#5f86a6" />
      </linearGradient>
      <linearGradient id="ms-glass-fire" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffd27a" />
        <stop offset="1" stopColor="#e2561f" />
      </linearGradient>
      <linearGradient id="ms-soot" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#1d1f24" stopOpacity="0.75" />
        <stop offset="1" stopColor="#1d1f24" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="ms-red" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e2343f" />
        <stop offset="1" stopColor="#a3141f" />
      </linearGradient>
      <linearGradient id="ms-white-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#d9e0e7" />
      </linearGradient>
      <linearGradient id="ms-blue-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2c6aa8" />
        <stop offset="1" stopColor="#173e66" />
      </linearGradient>
      <linearGradient id="ms-tank" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#9aa6b2" />
        <stop offset="0.35" stopColor="#f2f5f8" />
        <stop offset="1" stopColor="#8592a0" />
      </linearGradient>
      <linearGradient id="ms-flood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7d8f86" stopOpacity="0.9" />
        <stop offset="1" stopColor="#4f6258" stopOpacity="0.95" />
      </linearGradient>
      <radialGradient id="ms-fireglow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffb347" stopOpacity="0.85" />
        <stop offset="1" stopColor="#ff7a1a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="ms-beam-blue" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#5aa0ff" stopOpacity="0.8" />
        <stop offset="1" stopColor="#5aa0ff" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="ms-beam-red" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ff4d4d" stopOpacity="0.8" />
        <stop offset="1" stopColor="#ff4d4d" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="ms-shadow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#000" stopOpacity="0.35" />
        <stop offset="1" stopColor="#000" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

/** Sky, far skyline, trees, sidewalk and road. */
function Backdrop({ mood = 'day', trees = [] }) {
  const far = mood === 'dusk' ? '#5a6274' : mood === 'overcast' ? '#9ea9b5' : '#b9cadb'
  return (
    <g>
      <rect x="0" y="0" width="640" height="190" fill={`url(#ms-sky-${mood})`} />
      <path
        d="M0,170 V146 h22 v-12 h18 v18 h14 v-30 h26 v24 h18 v-16 h24 v26 h20 v-38 h22 v28 h30 v-14 h18 v22 h26 v-34 h20 v20 h24 v-10 h28 v26 h18 v-40 h24 v30 h22 v-18 h26 v24 h20 v-28 h22 v16 h30 v-12 h24 v22 h26 V170 Z"
        fill={far}
        opacity="0.55"
      />
      {trees.map((x) => (
        <g key={x} transform={`translate(${x} 182)`}>
          <rect x="-1.5" y="-10" width="3" height="12" fill="#5b4a3a" />
          <ellipse cx="0" cy="-20" rx="11" ry="13" fill={mood === 'dusk' ? '#3e5446' : '#5f8a5e'} />
          <ellipse cx="-4" cy="-24" rx="6" ry="7" fill={mood === 'dusk' ? '#4d6656' : '#79a477'} />
        </g>
      ))}
      <rect x="0" y="182" width="640" height="7" fill="#b7bec7" />
      <rect x="0" y="188" width="640" height="32" fill="url(#ms-asphalt)" />
      <line x1="0" y1="204" x2="640" y2="204" stroke="#e8e2c8" strokeWidth="1.5" strokeDasharray="18 14" opacity="0.8" />
    </g>
  )
}

function Shadow({ x, y = 189, w = 60 }) {
  return <ellipse cx={x} cy={y} rx={w / 2} ry="4" fill="url(#ms-shadow)" />
}

/** 2.5D building: front face, side face, parapet, framed windows. */
function Building({ x, w, h, floors = 3, cols = 3, depth = 14, warm = false, burning = false, className = '' }) {
  const top = 188 - h
  const floorH = h / floors
  const winW = Math.min(14, (w - 10) / cols - 6)
  const winH = Math.min(16, floorH - 10)
  const gapX = (w - cols * winW) / (cols + 1)
  return (
    <g className={`ms-bld ${burning ? 'ms-bld--burning' : ''} ${className}`}>
      <path d={`M${x + w},${top} l${depth},${-depth * 0.5} v${h} l${-depth},${depth * 0.5} Z`} fill="url(#ms-side)" />
      <path d={`M${x},${top} l${depth},${-depth * 0.5} h${w} l${-depth},${depth * 0.5} Z`} fill="#b7c1cc" />
      <rect x={x} y={top} width={w} height={h} fill={`url(#${warm ? 'ms-wall-warm' : 'ms-wall'})`} stroke="#7d8896" strokeWidth="0.8" />
      <rect x={x - 1} y={top - 3} width={w + 2} height="4" fill="#9aa5b2" />
      {Array.from({ length: floors }).map((_, f) =>
        Array.from({ length: cols }).map((__, c) => {
          const wx = x + gapX + c * (winW + gapX)
          const wy = top + f * floorH + (floorH - winH) / 2
          const onFire = burning && (f + c) % 2 === 0
          return (
            <g key={`${f}-${c}`}>
              {onFire && <rect x={wx - 1} y={wy - 14} width={winW + 2} height="14" fill="url(#ms-soot)" className="ms-soot" />}
              <rect x={wx - 1} y={wy - 1} width={winW + 2} height={winH + 2} fill="#6b7684" />
              <rect x={wx} y={wy} width={winW} height={winH} fill={onFire ? 'url(#ms-glass-fire)' : 'url(#ms-glass)'} className={onFire ? 'ms-win-fire' : 'ms-win'} />
              <line x1={wx + winW / 2} y1={wy} x2={wx + winW / 2} y2={wy + winH} stroke="#6b7684" strokeWidth="0.8" />
            </g>
          )
        }),
      )}
      <rect x={x + w / 2 - 7} y={188 - 18} width="14" height="18" fill="#5d6876" />
    </g>
  )
}

function House({ x, w = 54, h = 40, warm = true, className = '' }) {
  const top = 188 - h
  return (
    <g className={`ms-house ${className}`}>
      <path d={`M${x - 5},${top} L${x + w / 2},${top - 22} L${x + w + 5},${top} Z`} fill="#8b5a44" />
      <path d={`M${x + w / 2},${top - 22} L${x + w + 5},${top} l8,-4 L${x + w / 2 + 8},${top - 26} Z`} fill="#6e4635" />
      <rect x={x} y={top} width={w} height={h} fill={`url(#${warm ? 'ms-wall-warm' : 'ms-wall'})`} stroke="#8a7a68" strokeWidth="0.8" />
      <path d={`M${x + w},${top} l8,-4 v${h} l-8,4 Z`} fill="url(#ms-side)" />
      <rect x={x + 8} y={top + 10} width="12" height="12" fill="url(#ms-glass)" stroke="#6b5a48" strokeWidth="1" className="ms-win" />
      <rect x={x + w - 20} y={top + 10} width="12" height="12" fill="url(#ms-glass)" stroke="#6b5a48" strokeWidth="1" className="ms-win" />
      <rect x={x + w / 2 - 5} y={188 - 16} width="10" height="16" fill="#6b4a36" />
    </g>
  )
}

/** Light bar that really lights its surroundings. */
function Beacon({ x, y, color = 'blue' }) {
  return (
    <g className={`ms-beacon ms-beacon--${color}`}>
      <circle cx={x} cy={y} r="22" fill={`url(#ms-beam-${color})`} className="ms-beacon-glow" />
      <rect x={x - 4} y={y - 2} width="8" height="4" rx="1.5" fill={color === 'blue' ? '#5aa0ff' : '#ff4d4d'} />
    </g>
  )
}

/** Fire tanker (АЦ): cab, roller-door compartments, ladder, hose reel, beacons. */
function FireTruck() {
  return (
    <g className="ms-vehicle">
      <Shadow x={56} y={1} w={120} />
      <rect x="0" y="-40" width="82" height="32" rx="2" fill="url(#ms-red)" />
      {[6, 26, 46].map((cx) => (
        <g key={cx}>
          <rect x={cx} y="-36" width="16" height="20" fill="#b51824" />
          {[0, 4, 8, 12, 16].map((d) => (
            <line key={d} x1={cx + 1} y1={-35 + d} x2={cx + 15} y2={-35 + d} stroke="#8e111b" strokeWidth="0.6" />
          ))}
        </g>
      ))}
      <rect x="0" y="-15" width="82" height="3" fill="#f3f3f3" />
      <circle cx="72" cy="-26" r="6" fill="#30343a" stroke="#c7ccd2" strokeWidth="1.5" />
      <path d="M82,-40 h16 q6,0 9,5 l6,10 v17 h-31 Z" fill="url(#ms-red)" />
      <path d="M86,-36 h11 q3,0 5,3 l5,8 h-21 Z" fill="url(#ms-glass)" />
      <rect x="84" y="-15" width="29" height="3" fill="#f3f3f3" />
      <text x="90" y="-18" className="ms-truck-text">101</text>
      <g stroke="#cfd5db" strokeWidth="1.6">
        <line x1="4" y1="-44" x2="76" y2="-44" />
        <line x1="4" y1="-48" x2="76" y2="-48" />
        {[8, 18, 28, 38, 48, 58, 68].map((lx) => (
          <line key={lx} x1={lx} y1="-48" x2={lx} y2="-44" />
        ))}
      </g>
      <Beacon x={92} y={-43} color="blue" />
      <Beacon x={103} y={-43} color="red" />
      {[18, 62, 98].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="-7" r="8" fill="#22262c" />
          <circle cx={cx} cy="-7" r="3.4" fill="#9aa3ad" />
        </g>
      ))}
    </g>
  )
}

function Ambulance() {
  return (
    <g className="ms-vehicle">
      <Shadow x={46} y={1} w={96} />
      <rect x="0" y="-40" width="70" height="32" rx="4" fill="url(#ms-white-body)" stroke="#aab4be" strokeWidth="0.8" />
      <path d="M70,-32 h12 q5,0 8,5 l4,9 v10 h-24 Z" fill="url(#ms-white-body)" stroke="#aab4be" strokeWidth="0.8" />
      <path d="M73,-29 h8 q3,0 4,3 l3,6 h-15 Z" fill="url(#ms-glass)" />
      <rect x="0" y="-22" width="94" height="4" fill="#e2343f" />
      <path d="M30,-36 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 Z" fill="#e2343f" />
      <text x="48" y="-26" className="ms-truck-text ms-truck-text--red">103</text>
      <Beacon x={74} y={-35} color="blue" />
      {[16, 78].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="-7" r="7.5" fill="#22262c" />
          <circle cx={cx} cy="-7" r="3" fill="#9aa3ad" />
        </g>
      ))}
    </g>
  )
}

/** Person: firefighter (helmet, reflective stripes), medic, hazmat or civilian. */
function Person({ x, y = 188, kind = 'civil', tone = '#4a6fa5', delay = 0, className = '', flip = false }) {
  const suit = { fire: '#2f3b4c', medic: '#e9eef3', hazmat: '#e6c229', rescue: '#e36a1e', civil: tone }[kind]
  const helmet = { fire: '#f0f0f0', medic: null, hazmat: '#e6c229', rescue: '#f2c230', civil: null }[kind]
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      <g className={`ms-person ${className}`} style={{ animationDelay: `${delay}s` }}>
        <ellipse cx="0" cy="1" rx="6" ry="1.6" fill="#000" opacity="0.25" />
        <path d="M-3,-1 l0.6,-11 h4.8 l0.6,11 h-2.2 l-0.8,-8 l-0.8,8 Z" fill={kind === 'civil' ? '#3b3f47' : suit} />
        <path d="M-4.2,-12 q0,-8 4.2,-8 q4.2,0 4.2,8 Z" fill={suit} />
        <path d="M4,-18 l4,6 l-1.5,1 l-3.5,-4" fill={suit} />
        {(kind === 'fire' || kind === 'rescue') && (
          <>
            <rect x="-4.2" y="-14.5" width="8.4" height="1.4" fill="#e9f06a" />
            <rect x="-3" y="-4" width="6" height="1.2" fill="#e9f06a" />
          </>
        )}
        {kind === 'medic' && <path d="M-1,-17 h2 v2 h2 v2 h-2 v2 h-2 v-2 h-2 v-2 h2 Z" fill="#e2343f" />}
        <circle cy="-23" r="3.3" fill="#e2b896" />
        {helmet && <path d="M-4,-23 q0,-5.5 4,-5.5 q4,0 4,5.5 h1.5 v1 h-11 v-1 Z" fill={helmet} />}
      </g>
    </g>
  )
}

/** Cordon: traffic cones and striped barrier tape. */
function Cordon({ x1, x2, y = 189 }) {
  const n = Math.max(3, Math.round((x2 - x1) / 30) + 1)
  const cones = Array.from({ length: n }).map((_, i) => x1 + ((x2 - x1) * i) / (n - 1))
  return (
    <g className="ms-cordon ms-on1">
      <path d={`M${x1},${y - 13} Q${(x1 + x2) / 2},${y - 9} ${x2},${y - 13}`} className="ms-tape" />
      {cones.map((cx) => (
        <g key={cx} transform={`translate(${cx} ${y})`}>
          <path d="M-6,0 L-2,-17 h4 L6,0 Z" fill="#f2711c" />
          <rect x="-4.6" y="-10" width="9.2" height="2.6" fill="#fff" />
          <rect x="-7" y="-1.5" width="14" height="2" fill="#c7520f" />
        </g>
      ))}
    </g>
  )
}

function Waves({ x, y, color = '#e2343f', className = '', flip = false }) {
  return (
    <g className={`ms-waves ${className}`} transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      {[10, 18, 26].map((r, i) => (
        <path
          key={r}
          d={`M${r * 0.7},${-r * 0.7} A${r},${r} 0 0 1 ${r * 0.7},${r * 0.7}`}
          stroke={color}
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))}
    </g>
  )
}

function DoneMark() {
  return (
    <g className="ms-done ms-on4" transform="translate(608 26)">
      <circle r="15" />
      <path d="M-6.5,0 l4.5,4.5 l8.5,-9" />
    </g>
  )
}

/** Parked / arriving vehicle wrapper (position outside, animation inside). */
const At = ({ x, y = 188, className = 'ms-arrive ms-on2', children }) => (
  <g transform={`translate(${x} ${y})`}>
    <g className={className}>{children}</g>
  </g>
)

// ---- the nine scenes: art + particle emitters ------------------------------------------
// levels = strength per stage [0, 1, 2, 3, 4].

const FADE_OUT = [1, 1, 0.75, 0.3, 0]
const ACTION = [0, 0, 1, 1, 0]

const SCENES = {
  // 01 — Стабилизировать ЧС: паводок под дождём; дамба из мешков, откачка, вода уходит.
  'stabilize-emergency': {
    mood: 'overcast',
    trees: [250, 600],
    emitters: [
      { kind: 'rain', x: 330, y: -10, w: 720, rate: 340, levels: [1, 1, 0.7, 0.3, 0] },
      { kind: 'spray', x: 520, y: 150, tx: 600, ty: 176, rate: 40, levels: ACTION },
    ],
    art: () => (
      <>
        <House x={40} />
        <House x={120} w={60} h={46} />
        <House x={430} w={62} h={44} warm={false} />
        <g className="ms-flood">
          <path className="ms-flood-body" d="M0,165 C70,160 140,170 210,165 S350,160 420,165 S560,170 640,163 V220 H0 Z" fill="url(#ms-flood)" />
          <path className="ms-flood-shine" d="M0,165 C70,160 140,170 210,165 S350,160 420,165 S560,170 640,163" />
          <path className="ms-flood-shine ms-flood-shine--2" d="M20,178 C90,174 150,182 220,178 S360,174 430,178" />
          <path className="ms-flood-shine ms-flood-shine--2" d="M200,192 C270,188 330,196 400,192 S540,188 620,192" />
        </g>
        <Cordon x1={250} x2={392} />
        <g className="ms-levee">
          {Array.from({ length: 11 }).map((_, i) => {
            const row = i < 6 ? 0 : 1
            const col = row ? i - 6 : i
            return <rect key={i} className="ms-sandbag" x={290 + col * 15 + row * 7} y={row ? 162 : 173} width="16" height="11" rx="5" style={{ transitionDelay: `${i * 0.1}s` }} />
          })}
        </g>
        <At x={500}>
          <FireTruck />
          <path d="M20,-20 C10,-6 -20,-4 -40,-8" className="ms-hose" />
        </At>
        <Person x={300} kind="rescue" className="ms-on2" />
        <Person x={380} kind="rescue" className="ms-on2" delay={0.4} flip />
      </>
    ),
  },

  // 02 — Ликвидировать пожар: вечер, горит жилой дом; АЦ, звено со стволом, пар.
  'extinguish-fire': {
    mood: 'dusk',
    trees: [20, 600],
    emitters: [
      { kind: 'fire', x: 116, y: 86, w: 86, rate: 110, levels: FADE_OUT },
      { kind: 'fire', x: 92, y: 126, w: 22, rate: 26, levels: [1, 1, 0.6, 0.1, 0] },
      { kind: 'fire', x: 140, y: 150, w: 22, rate: 22, levels: [1, 1, 0.5, 0, 0] },
      { kind: 'ember', x: 116, y: 80, w: 80, rate: 16, levels: FADE_OUT },
      { kind: 'smoke', x: 122, y: 72, w: 70, rate: 24, levels: [1, 1, 0.8, 0.2, 0] },
      { kind: 'smokeLight', x: 120, y: 80, w: 60, rate: 8, levels: [0, 0, 0.6, 1, 0.3] },
      { kind: 'steam', x: 118, y: 100, w: 60, rate: 22, levels: [0, 0, 1, 1, 0.2] },
      { kind: 'spray', x: 304, y: 166, tx: 118, ty: 104, rate: 90, levels: ACTION, delay: 0 },
      { kind: 'spray', x: 304, y: 166, tx: 140, ty: 148, rate: 30, levels: ACTION },
    ],
    art: () => (
      <>
        <rect className="ms-fire-light" x="0" y="40" width="300" height="180" fill="url(#ms-fireglow)" />
        <Building x={60} w={110} h={104} floors={4} cols={4} burning />
        <Building x={196} w={60} h={62} floors={2} cols={2} warm />
        <Cordon x1={262} x2={350} />
        <At x={370}>
          <FireTruck />
        </At>
        <g className="ms-on2">
          <path d="M392,180 C360,192 330,190 310,178" className="ms-hose" />
          <path d="M304,166 Q220,40 118,104" className="ms-jet" />
          <path d="M304,166 Q228,92 140,148" className="ms-jet ms-jet--thin" />
          <Person x={306} kind="fire" />
          <Person x={330} kind="fire" delay={0.3} />
        </g>
      </>
    ),
  },

  // 03 — Локализовать аварию: утечка с ёмкости, облако газа; водяная завеса.
  'contain-accident': {
    mood: 'day',
    trees: [610],
    emitters: [
      { kind: 'gas', x: 250, y: 140, w: 20, rate: 9, levels: [1, 1, 0.6, 0.25, 0] },
      { kind: 'smokeLight', x: 82, y: 50, w: 6, rate: 5, levels: [1, 1, 1, 1, 1] },
      { kind: 'spray', x: 456, y: 162, tx: 340, ty: 112, rate: 60, levels: ACTION },
      { kind: 'spray', x: 456, y: 162, tx: 312, ty: 150, rate: 50, levels: ACTION },
    ],
    art: () => (
      <>
        <g>
          <rect x="72" y="52" width="16" height="78" fill="url(#ms-tank)" />
          <rect x="72" y="58" width="16" height="4" fill="#c81f2e" />
          <rect x="72" y="68" width="16" height="4" fill="#f3f3f3" />
        </g>
        <Building x={40} w={110} h={58} floors={2} cols={4} />
        <g>
          <rect x="190" y="118" width="74" height="70" rx="6" fill="url(#ms-tank)" stroke="#7d8896" strokeWidth="0.8" />
          <path d="M190,124 q37,-14 74,0" fill="#c2cad3" />
          <rect x="226" y="128" width="2" height="60" fill="#7d8896" />
          <circle cx="252" cy="142" r="3" fill="#333" />
          <path d="M150,170 h40 M264,170 h30" stroke="#6b7684" strokeWidth="4" />
        </g>
        <g transform="translate(300 150)">
          <path d="M0,0 l12,-20 l12,20 Z" fill="#f2c230" stroke="#333" strokeWidth="1" />
          <text x="12" y="-4" className="ms-sign-text">!</text>
        </g>
        <Cordon x1={330} x2={420} />
        <g className="ms-on2">
          <path d="M456,162 Q400,50 340,112" className="ms-jet" />
          <path d="M456,162 Q384,92 312,150" className="ms-jet ms-jet--thin" />
        </g>
        <At x={460}>
          <FireTruck />
        </At>
        <Person x={446} kind="hazmat" className="ms-on2" />
        <Person x={428} kind="hazmat" className="ms-on2" delay={0.3} />
      </>
    ),
  },

  // 04 — Провести эвакуацию: тревога в здании, люди выходят к пункту сбора, автобус.
  'run-evacuation': {
    mood: 'day',
    trees: [230, 620],
    emitters: [{ kind: 'smokeLight', x: 128, y: 64, w: 14, rate: 6, levels: [1, 1, 1, 0.5, 0] }],
    art: () => (
      <>
        <Building x={40} w={120} h={116} floors={4} cols={4} warm />
        <g className="ms-alarm">
          <Beacon x={150} y={100} color="red" />
        </g>
        <Waves x={152} y={100} />
        <Cordon x1={176} x2={250} />
        <g className="ms-walkers">
          {['#4a6fa5', '#a5544a', '#5a8a5a', '#7a5a9a', '#3d6b8c'].map((tone, i) => (
            <Person key={i} x={170} kind="civil" tone={tone} className="ms-walker" delay={i * 0.7} />
          ))}
        </g>
        <g transform="translate(470 189)">
          <line x1="0" y1="0" x2="0" y2="-56" stroke="#5b6b80" strokeWidth="2.5" />
          <path d="M0,-56 h28 l-6,8 l6,8 h-28 Z" fill="#15803d" className="ms-flag" />
        </g>
        <g className="ms-on3">
          {['#4a6fa5', '#a5544a', '#5a8a5a', '#7a5a9a'].map((tone, i) => (
            <Person key={i} x={490 + i * 12} kind="civil" tone={tone} />
          ))}
        </g>
        <Person x={250} kind="rescue" className="ms-on2" />
        <At x={540}>
          <g className="ms-vehicle">
            <Shadow x={48} y={1} w={100} />
            <rect x="0" y="-44" width="96" height="36" rx="5" fill="#f2b705" stroke="#9a7300" strokeWidth="0.8" />
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={8 + i * 21} y="-38" width="16" height="13" fill="url(#ms-glass)" />
            ))}
            <rect x="0" y="-20" width="96" height="3" fill="#1b4f8c" />
            {[18, 78].map((cx) => (
              <g key={cx}>
                <circle cx={cx} cy="-7" r="7.5" fill="#22262c" />
                <circle cx={cx} cy="-7" r="3" fill="#9aa3ad" />
              </g>
            ))}
          </g>
        </At>
      </>
    ),
  },

  // 05 — Организовать реагирование: оперативный штаб направляет силы к очагу.
  'organize-response': {
    mood: 'day',
    trees: [190],
    emitters: [
      { kind: 'smoke', x: 560, y: 130, w: 20, rate: 7, levels: [1, 1, 0.8, 0.3, 0] },
      { kind: 'fire', x: 560, y: 150, w: 18, rate: 30, levels: [1, 1, 0.7, 0.2, 0] },
    ],
    art: () => (
      <>
        <g transform="translate(40 189)">
          <path d="M0,0 V-40 L45,-60 L90,-40 V0 Z" fill="#c9d3c4" stroke="#6b7a68" strokeWidth="1" />
          <path d="M45,-60 L90,-40 l10,-5 L56,-64 Z" fill="#a8b5a3" />
          <rect x="35" y="-26" width="20" height="26" fill="#5d6876" />
          <line x1="80" y1="-48" x2="80" y2="-104" stroke="#5b6b80" strokeWidth="2.5" />
          <path d="M80,-104 h18 v10 h-18 Z" fill="#1b4f8c" />
        </g>
        <Waves x={122} y={86} color="#1b4f8c" />
        <Building x={520} w={78} h={56} floors={2} cols={3} warm burning />
        <Cordon x1={460} x2={512} />
        <path className="ms-route ms-on1" d="M150,196 H470" />
        <g className="ms-on2">
          <g transform="translate(190 196)">
            <g className="ms-drive">
              <FireTruck />
            </g>
          </g>
          <g transform="translate(330 196)">
            <g className="ms-drive ms-drive--2">
              <Ambulance />
            </g>
          </g>
        </g>
        <Person x={150} kind="rescue" />
      </>
    ),
  },

  // 06 — Защитить население: сирена оповещения, люди уходят в защитное сооружение.
  'protect-population': {
    mood: 'overcast',
    trees: [180, 610],
    emitters: [{ kind: 'gas', x: 20, y: 60, w: 30, h: 30, rate: 3, levels: [1, 1, 0.6, 0.2, 0] }],
    art: () => (
      <>
        <Building x={30} w={100} h={92} floors={3} cols={3} />
        <g transform="translate(222 189)">
          <line x1="0" y1="0" x2="0" y2="-100" stroke="#5b6b80" strokeWidth="3" />
          <path d="M-12,-100 h24 l7,-14 h-38 Z" fill="#6b7684" />
          <circle cx="0" cy="-107" r="5" fill="#3d4652" />
        </g>
        <Waves x={234} y={82} className="ms-siren-waves" />
        <Waves x={210} y={82} flip className="ms-siren-waves" />
        <g transform="translate(470 189)">
          <path d="M-80,0 C-80,-66 80,-66 80,0 Z" fill="#a9b39c" stroke="#6b7a68" strokeWidth="1" />
          <path d="M-60,-30 C-40,-48 40,-48 60,-30" fill="none" stroke="#8d9784" strokeWidth="1" />
          <rect x="-17" y="-36" width="34" height="36" fill="#3d4652" />
          <rect x="-17" y="-36" width="34" height="36" fill="#15803d" className="ms-on4" />
          <g transform="translate(30 -46)">
            <rect x="-9" y="-9" width="18" height="18" fill="#f2711c" />
            <path d="M0,-6 l6,10 h-12 Z" fill="#1b4fa3" />
          </g>
        </g>
        <Cordon x1={300} x2={380} />
        <g className="ms-walkers ms-walkers--shelter">
          {['#4a6fa5', '#a5544a', '#5a8a5a', '#7a5a9a'].map((tone, i) => (
            <Person key={i} x={150} kind="civil" tone={tone} className="ms-walker" delay={i * 0.8} />
          ))}
        </g>
        <Person x={386} kind="rescue" className="ms-on2" flip />
      </>
    ),
  },

  // 07 — Восстановить объект: разрушенное здание, пыль; кран, сварка, этажи восстанавливаются.
  'restore-facility': {
    mood: 'day',
    trees: [620],
    emitters: [
      { kind: 'dust', x: 120, y: 182, w: 90, rate: 9, levels: [1, 1, 1, 0.4, 0] },
      { kind: 'spark', x: 168, y: 140, rate: 26, levels: ACTION },
    ],
    art: () => (
      <>
        <g className="ms-ruins">
          <path d="M70,189 V112 L104,98 L118,136 L146,122 L172,189 Z" fill="url(#ms-wall)" stroke="#7d8896" strokeWidth="1" />
          <path d="M84,124 h12 v14 h-12 Z M120,150 h12 v14 h-12 Z" fill="#2f353d" />
          <path d="M50,189 l26,-14 l22,8 l18,-12 l26,10 l22,-6 l16,14 Z" fill="#a8977c" />
          <path d="M96,180 l18,-6 l8,4 M130,182 l10,-8" stroke="#6e5f4b" strokeWidth="2" />
        </g>
        <g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} className={`ms-on${[2, 3, 3, 4][i]}`} style={{ transitionDelay: `${i * 0.2}s` }}>
              <rect x="70" y={169 - i * 20} width="102" height="20" fill="url(#ms-wall)" stroke="#7d8896" strokeWidth="0.8" />
              {[0, 1, 2, 3].map((c) => (
                <rect key={c} x={80 + c * 23} y={174 - i * 20} width="12" height="10" fill="url(#ms-glass)" />
              ))}
            </g>
          ))}
        </g>
        <Cordon x1={190} x2={280} />
        <g transform="translate(340 189)">
          <path d="M-6,0 L0,-156 L6,0 Z" fill="none" stroke="#e0a100" strokeWidth="2" />
          {[20, 50, 80, 110, 140].map((yy) => (
            <line key={yy} x1="-5" y1={-yy} x2="5" y2={-yy + 12} stroke="#e0a100" strokeWidth="1.2" />
          ))}
          <path d="M-180,-150 H44 M-180,-146 H44" stroke="#e0a100" strokeWidth="2.5" />
          <rect x="22" y="-156" width="20" height="14" fill="#4b5563" />
          <g className="ms-hook ms-on2">
            <line x1="-150" y1="-146" x2="-150" y2="-98" stroke="#333" strokeWidth="1.2" />
            <rect x="-176" y="-98" width="52" height="11" fill="#9aa3ad" stroke="#6b7684" strokeWidth="0.8" />
          </g>
        </g>
        <Person x={216} kind="rescue" className="ms-on2" />
        <Person x={246} kind="rescue" className="ms-on2" delay={0.3} flip />
      </>
    ),
  },

  // 08 — Организовать медпомощь: пострадавший, скорая, полевой госпиталь, ЭКГ выравнивается.
  'organize-medical-aid': {
    mood: 'day',
    trees: [250],
    emitters: [],
    art: () => (
      <>
        <g transform="translate(120 189)">
          <path d="M-86,0 L-66,-66 L66,-66 L86,0 Z" fill="#e9eef1" stroke="#7d8896" strokeWidth="1" />
          <path d="M66,-66 L86,0 l10,-4 L76,-70 Z" fill="#c4ccd4" />
          <path d="M-20,0 L0,-40 L20,0 Z" fill="#c4ccd4" />
          <path d="M-5,-60 h10 v8 h8 v10 h-8 v8 h-10 v-8 h-8 v-10 h8 Z" fill="#e2343f" transform="translate(0 8) scale(0.8)" />
        </g>
        <g className="ms-casualties">
          <rect x="300" y="178" width="38" height="7" rx="3" fill="#9aa3ad" />
          <path d="M306,176 h26 v-4 h-26 Z" fill="#4a6fa5" />
          <circle cx="302" cy="174" r="3.8" fill="#e2b896" />
        </g>
        <Cordon x1={256} x2={366} />
        <At x={410}>
          <Ambulance />
        </At>
        <Person x={292} kind="medic" className="ms-on2" />
        <Person x={346} kind="medic" className="ms-on2" delay={0.3} flip />
        <g transform="translate(500 50)">
          <rect x="0" y="0" width="116" height="60" rx="6" fill="#0f2440" stroke="#5b6b80" />
          <path d="M6,12 H110 M6,48 H110" stroke="#1e3a5c" strokeWidth="0.6" />
          <path className="ms-pulse ms-pulse--alarm" d="M8,32 h18 l6,-20 l8,36 l8,-28 l6,12 h50" />
          <path className="ms-pulse ms-pulse--steady" d="M8,32 h30 l5,-11 l6,20 l5,-9 h60" />
        </g>
      </>
    ),
  },

  // 09 — Обеспечить связь: вышка повреждена, искрит; мобильный узел связи, мачта, сигнал.
  'ensure-communications': {
    mood: 'overcast',
    trees: [40, 420],
    emitters: [{ kind: 'spark', x: 124, y: 72, rate: 30, levels: [1, 1, 0, 0, 0] }],
    art: () => (
      <>
        <g transform="translate(110 189)">
          <path d="M-22,0 L-3,-118 M22,0 L3,-118 M-16,-36 H16 M-11,-70 H11 M-7,-100 H7 M-16,-36 L11,-70 M16,-36 L-11,-70" stroke="#5b6b80" strokeWidth="2" fill="none" />
          <path d="M3,-118 l18,-12" stroke="#c81f2e" strokeWidth="2.5" />
          <path d="M-14,-6 l-10,6 h20 Z" fill="#7d8896" />
        </g>
        <Cordon x1={150} x2={236} />
        <At x={280}>
          <g className="ms-vehicle">
            <Shadow x={46} y={1} w={96} />
            <rect x="0" y="-42" width="72" height="34" rx="3" fill="url(#ms-blue-body)" />
            <path d="M72,-34 h12 q5,0 8,5 l4,9 v12 h-24 Z" fill="url(#ms-blue-body)" />
            <path d="M75,-31 h8 q3,0 4,3 l3,6 h-15 Z" fill="url(#ms-glass)" />
            <rect x="0" y="-20" width="96" height="3" fill="#f3f3f3" />
            <g className="ms-mast">
              <rect x="34" y="-122" width="4" height="80" fill="#8a96a3" />
              <path d="M24,-124 h24 M28,-118 h16" stroke="#3d4652" strokeWidth="2" />
            </g>
            <ellipse cx="14" cy="-48" rx="9" ry="5" fill="#d9e0e7" stroke="#7d8896" />
            <Beacon x={80} y={-37} color="blue" />
            {[16, 78].map((cx) => (
              <g key={cx}>
                <circle cx={cx} cy="-7" r="7.5" fill="#22262c" />
                <circle cx={cx} cy="-7" r="3" fill="#9aa3ad" />
              </g>
            ))}
          </g>
        </At>
        <Waves x={318} y={66} color="#1b4f8c" className="ms-on3" />
        <House x={470} warm />
        <House x={548} w={58} h={42} warm={false} />
        <path className="ms-link ms-on3" d="M326,68 C400,58 460,96 498,138" />
        <path className="ms-link ms-on3" d="M326,68 C440,48 540,96 576,140" />
        <Person x={262} kind="rescue" className="ms-on2" />
      </>
    ),
  },
}

// ---- component ----------------------------------------------------------------------------

function useParticles(canvasRef, emitters, reached) {
  const systemRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !emitters.length) return undefined
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const system = createParticleSystem(canvas, emitters)
    systemRef.current = system
    system.resize()
    system.setReached(reached)
    system.prewarm(2.5)
    if (reduce) {
      system.drawOnce()
      return () => system.stop()
    }
    // Run only while the scene is on screen.
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? system.start() : system.stop()))
    io.observe(canvas)
    const ro = new ResizeObserver(() => system.resize())
    ro.observe(canvas)
    return () => {
      io.disconnect()
      ro.disconnect()
      system.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emitters])

  useEffect(() => {
    systemRef.current?.setReached(reached)
  }, [reached])
}

export default function MissionScene({ missionId, reached = 0, caption = null }) {
  const scene = SCENES[missionId] ?? SCENES['stabilize-emergency']
  const level = Math.max(0, Math.min(4, reached))
  const canvasRef = useRef(null)
  useParticles(canvasRef, scene.emitters, level)

  const classes = ['ms-scene', `ms-mission-${missionId}`, `ms-mood-${scene.mood}`]
  for (let i = 1; i <= level; i++) classes.push(`ms-r${i}`)
  const Art = scene.art
  return (
    <div className={classes.join(' ')}>
      <svg className="ms-svg" viewBox="0 0 640 220" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <Defs />
        <Backdrop mood={scene.mood} trees={scene.trees} />
        <Art />
        <DoneMark />
      </svg>
      <canvas ref={canvasRef} className="ms-canvas" aria-hidden="true" />
      <span className="ms-vignette" aria-hidden="true" />
      {caption && <span className="ms-caption">{caption}</span>}
    </div>
  )
}
