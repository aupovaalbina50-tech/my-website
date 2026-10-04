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
      <radialGradient id="ms-lamp" cx="0.5" cy="0.2" r="0.6">
        <stop offset="0" stopColor="#ffe6a8" stopOpacity="0.75" />
        <stop offset="1" stopColor="#ffe6a8" stopOpacity="0" />
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

// People drawn to scale with real proportions (feet at y = 0, ~34 units
// tall, facing right; `flip` mirrors). Outfits follow the services:
// firefighter — dark turnout gear with yellow-green reflective bands, helmet
// with rear brim and visor, breathing-apparatus cylinder; incident commander
// (РТП) — red helmet and radio; rescuer — orange; medic — blue with a red
// cross; hazmat — yellow suit, hood and mask; civilians in everyday clothes.
const OUTFITS = {
  fire: { coat: '#2b3a54', lit: '#3e5274', pants: '#2b3a54', band: '#d6ef4f', helmet: '#f1f1ec', visor: '#e0b347', scba: true, gloves: '#3b3026' },
  commander: { coat: '#2b3a54', lit: '#3e5274', pants: '#2b3a54', band: '#d6ef4f', helmet: '#d62b35', visor: null, radio: true, gloves: '#3b3026' },
  rescue: { coat: '#e2621c', lit: '#f27e36', pants: '#24355a', band: '#eef1f4', helmet: '#f1f1ec', visor: null, gloves: '#1d2026' },
  medic: { coat: '#2d68ad', lit: '#4280c7', pants: '#213d66', band: '#eef1f4', helmet: null, cross: true, gloves: '#e9eef3' },
  hazmat: { coat: '#e3bd25', lit: '#f0d24a', pants: '#e3bd25', band: null, helmet: null, hood: true, scba: true, gloves: '#2b2b2b' },
  police: { coat: '#2d3f63', lit: '#3d5480', pants: '#2d3f63', band: '#d6ef4f', helmet: null, cap: '#2d3f63', gloves: '#e0b08c' },
}
const SKIN = '#dfb08a'

function Arm({ pose, coat, gloves }) {
  switch (pose) {
    case 'hose': // both hands forward on the nozzle
      return (
        <g>
          <path d="M2,-24 h3.4 l8.6,4.6 l-1.6,2.8 l-8.4,-4.2 Z" fill={coat} />
          <circle cx="13" cy="-18.4" r="1.7" fill={gloves} />
          <path d="M12,-19.6 l9,-3.6 l0.8,2 l-9,3.6 Z" fill="#3b3f46" />
          <path d="M21,-23.4 l3,-1.2 l0.8,2 l-3,1.2 Z" fill="#9aa3ad" />
        </g>
      )
    case 'point':
      return (
        <g>
          <path d="M2,-24.5 h3.4 l9,-6 l1.6,2.6 l-9.2,6 Z" fill={coat} />
          <circle cx="15.2" cy="-29.6" r="1.6" fill={gloves} />
        </g>
      )
    case 'wave':
      return (
        <g className="ms-arm-wave">
          <path d="M2,-24.5 h3.4 l3,-11 l-3,-0.8 Z" fill={coat} />
          <circle cx="7" cy="-36.4" r="1.6" fill={gloves} />
        </g>
      )
    case 'carry': // load held in front at waist height
      return (
        <g>
          <path d="M2,-24 h3.4 l3.4,8 l-2.8,1.4 l-3.4,-7.4 Z" fill={coat} />
          <circle cx="7.6" cy="-15" r="1.6" fill={gloves} />
        </g>
      )
    case 'radio':
      return (
        <g>
          <path d="M2,-24.5 h3.4 l1,-6 l-3,-0.6 Z" fill={coat} />
          <rect x="3.6" y="-35" width="2.4" height="5" rx="0.6" fill="#22262c" />
          <line x1="4.8" y1="-35" x2="4.8" y2="-38.5" stroke="#22262c" strokeWidth="0.7" />
        </g>
      )
    default:
      return (
        <g>
          <path d="M2.4,-24.5 h3.2 l1.2,10 l-3,0.4 Z" fill={coat} />
          <circle cx="5.4" cy="-13.8" r="1.6" fill={gloves} />
        </g>
      )
  }
}

/**
 * Person. kind: fire | commander | rescue | medic | hazmat | police | civil.
 * pose: stand | hose | point | wave | carry | radio | walk.
 */
function Person({ x, y = 188, kind = 'civil', tone = '#4a6fa5', pose = 'stand', delay = 0, className = '', flip = false, s = 1 }) {
  const o = OUTFITS[kind] ?? {
    coat: tone,
    lit: tone,
    pants: '#3a404c',
    band: null,
    helmet: null,
    hair: '#3b2a20',
    gloves: SKIN,
  }
  const walking = pose === 'walk'
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <g className={`ms-person ${walking ? 'ms-person--walk' : ''} ${className}`} style={{ animationDelay: `${delay}s` }}>
        <ellipse cx="0" cy="0.6" rx="7.5" ry="1.6" fill="#000" opacity="0.28" />
        {/* legs (back, front), boots */}
        <g className="ms-leg ms-leg--back">
          <rect x="-3.6" y="-13" width="3.4" height="11.6" rx="1.2" fill={o.pants} />
          {o.band && <rect x="-3.6" y="-6.4" width="3.4" height="1.2" fill={o.band} />}
          <rect x="-4" y="-2.2" width="4.4" height="2.4" rx="0.8" fill="#1b1e22" />
        </g>
        <g className="ms-leg ms-leg--front">
          <rect x="0.2" y="-13" width="3.4" height="11.6" rx="1.2" fill={o.pants} />
          {o.band && <rect x="0.2" y="-6.4" width="3.4" height="1.2" fill={o.band} />}
          <rect x="0" y="-2.2" width="5" height="2.4" rx="0.8" fill="#1b1e22" />
        </g>
        {/* breathing apparatus on the back */}
        {o.scba && (
          <g>
            <rect x="-8.6" y="-25" width="3.8" height="11.5" rx="1.8" fill="#b8333a" />
            <rect x="-8.6" y="-25" width="1.4" height="11.5" rx="0.7" fill="#d9555c" />
          </g>
        )}
        {/* jacket: lit front half, shaded back half */}
        <path d="M-5.6,-25.4 Q0,-27.6 5.6,-25.4 L6.4,-11.6 H-6.4 Z" fill={o.coat} />
        <path d="M0,-26.4 Q3.6,-26.2 5.6,-25.4 L6.4,-11.6 H0 Z" fill={o.lit} opacity="0.9" />
        {o.band && (
          <>
            <rect x="-6.2" y="-18" width="12.4" height="1.5" fill={o.band} />
            <rect x="-6.4" y="-13.4" width="12.8" height="1.3" fill={o.band} />
          </>
        )}
        {o.cross && <path d="M1.4,-22.6 h1.6 v1.6 h1.6 v1.6 h-1.6 v1.6 h-1.6 v-1.6 h-1.6 v-1.6 h1.6 Z" fill="#e2343f" />}
        {o.radio && <rect x="-3.4" y="-23.6" width="2" height="3.4" rx="0.5" fill="#22262c" />}
        <Arm pose={walking ? 'stand' : pose} coat={o.lit} gloves={o.gloves} />
        {/* neck, head */}
        <rect x="-1.2" y="-28.4" width="2.4" height="2.4" fill={SKIN} />
        {o.hood ? (
          <g>
            <path d="M-4.4,-28 Q-4.6,-36.6 0.4,-36.6 Q5.2,-36.6 5,-28 Z" fill={o.coat} />
            <ellipse cx="2.4" cy="-31.6" rx="2.4" ry="2.2" fill="#2b2f36" />
            <circle cx="3.4" cy="-29" r="1.2" fill="#555b64" />
          </g>
        ) : (
          <g>
            <circle cx="0.4" cy="-31" r="3.4" fill={SKIN} />
            {o.helmet && (
              <g>
                <path d="M-3.8,-31.6 Q-3.8,-37.4 0.6,-37.4 Q5,-37.4 5,-31.6 Z" fill={o.helmet} />
                <path d="M-6.2,-31.2 Q-5,-32 -3.8,-31.6 H5.8 V-30.4 H-6.2 Z" fill={o.helmet} />
                <path d="M-3.6,-34.6 Q0.6,-36.8 4.8,-34.6" stroke="#000" strokeOpacity="0.15" strokeWidth="0.8" fill="none" />
                {o.visor && <path d="M2.6,-31.2 h3 l-0.6,2.6 h-2.4 Z" fill={o.visor} opacity="0.85" />}
              </g>
            )}
            {o.cap && <path d="M-3.4,-32.6 Q0.6,-36 4.4,-32.6 h2.6 v1 h-10 Z" fill={o.cap} />}
            {o.hair && <path d="M-3.4,-31.6 Q-3,-35 0.6,-34.8 Q3.8,-34.6 3.8,-32.4 Q1,-33.4 -1.4,-31.4 Z" fill={o.hair} />}
          </g>
        )}
      </g>
    </g>
  )
}

/** Two medics carrying a casualty on a stretcher. */
function StretcherTeam({ x, y = 188, className = '' }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={className}>
        <Person x={0} y={0} kind="medic" pose="carry" />
        <Person x={40} y={0} kind="medic" pose="carry" flip />
        <rect x="6" y="-16.4" width="28" height="3" rx="1.2" fill="#c9d1da" stroke="#8a96a3" strokeWidth="0.6" />
        <path d="M10,-17.6 h20 v-3 h-20 Z" fill="#3e6aa3" />
        <circle cx="9" cy="-19.6" r="2.6" fill={SKIN} />
      </g>
    </g>
  )
}

// ---- street props -------------------------------------------------------------------------

function StreetLamp({ x, lit = false }) {
  return (
    <g transform={`translate(${x} 183)`}>
      <rect x="-1.2" y="-58" width="2.4" height="58" fill="#4b5563" />
      <path d="M0,-58 q0,-6 8,-6 h4" stroke="#4b5563" strokeWidth="2.2" fill="none" />
      <path d="M9,-66 h8 l-1.6,4 h-4.8 Z" fill="#3b4250" />
      {lit && <ellipse cx="13" cy="-56" rx="16" ry="20" fill="url(#ms-lamp)" className="ms-lamp-glow" />}
    </g>
  )
}

function Hydrant({ x }) {
  return (
    <g transform={`translate(${x} 184)`}>
      <rect x="-3" y="-12" width="6" height="12" rx="1.5" fill="#c81f2e" />
      <path d="M-4,-12 q4,-5 8,0 Z" fill="#a51624" />
      <rect x="-5.5" y="-8" width="11" height="2.4" rx="1" fill="#a51624" />
    </g>
  )
}

function CarBody({ color = '#7a8a9e' }) {
  return (
    <g>
      <ellipse cx="22" cy="0.6" rx="26" ry="2.4" fill="#000" opacity="0.25" />
      <path d="M0,-6 v-8 q0,-3 3,-4 l8,-2 l7,-7 q2,-2 5,-2 h11 q3,0 5,2 l6,7 q4,1 4,4 v10 Z" fill={color} />
      <path d="M13,-21 l6,-6 h7 v6 Z M28,-21 v-6 h5 l5,6 Z" fill="url(#ms-glass)" />
      <rect x="44" y="-14" width="3" height="2" fill="#ffe28a" />
      <circle cx="10" cy="-5" r="4.6" fill="#22262c" />
      <circle cx="10" cy="-5" r="1.8" fill="#9aa3ad" />
      <circle cx="37" cy="-5" r="4.6" fill="#22262c" />
      <circle cx="37" cy="-5" r="1.8" fill="#9aa3ad" />
    </g>
  )
}

function Car({ x, color, flip = false }) {
  return (
    <g transform={`translate(${x} 188) scale(${flip ? -1 : 1} 1)`}>
      <CarBody color={color} />
    </g>
  )
}

function PoliceCar({ x, flip = false }) {
  return (
    <g transform={`translate(${x} 188) scale(${flip ? -1 : 1} 1)`}>
      <CarBody color="#eef2f6" />
      <rect x="2" y="-15" width="44" height="3" fill="#1f4fa8" />
      <text x="6" y="-8.5" className="ms-truck-text ms-truck-text--blue">102</text>
      <Beacon x={24} y={-30} color="blue" />
    </g>
  )
}

function PowerLine({ x1, x2 }) {
  return (
    <g>
      {[x1, x2].map((x) => (
        <g key={x} transform={`translate(${x} 183)`}>
          <rect x="-1.6" y="-84" width="3.2" height="84" fill="#6b5a48" />
          <rect x="-9" y="-80" width="18" height="2" fill="#6b5a48" />
        </g>
      ))}
      <path d={`M${x1 - 8},104 Q${(x1 + x2) / 2},116 ${x2 - 8},104 M${x1 + 8},104 Q${(x1 + x2) / 2},116 ${x2 + 8},104`} stroke="#3b4250" strokeWidth="0.8" fill="none" />
    </g>
  )
}

/** Inflatable rescue boat with two rescuers. */
function RescueBoat() {
  return (
    <g className="ms-boat">
      <path d="M-4,-6 h58 q8,0 8,6 q0,6 -8,6 h-58 q-6,0 -6,-6 q0,-6 6,-6 Z" fill="#e2621c" stroke="#a3410d" strokeWidth="0.8" />
      <rect x="-2" y="-2" width="54" height="2" fill="#f2c230" />
      <rect x="-12" y="-10" width="6" height="12" rx="1.5" fill="#3b4250" />
      <Person x={14} y={-4} kind="rescue" pose="carry" s={0.8} />
      <Person x={36} y={-4} kind="rescue" pose="point" s={0.8} />
    </g>
  )
}

/** Mobile command post: blue bus with «ШТАБ», mast and flag. */
function CommandBus() {
  return (
    <g className="ms-vehicle">
      <ellipse cx="60" cy="1" rx="64" ry="4" fill="url(#ms-shadow)" />
      <rect x="0" y="-48" width="120" height="40" rx="5" fill="url(#ms-blue-body)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={8 + i * 21} y="-42" width="16" height="13" fill="url(#ms-glass)" />
      ))}
      <rect x="0" y="-24" width="120" height="3" fill="#f3f3f3" />
      <text x="46" y="-13" className="ms-truck-text">ШТАБ</text>
      <line x1="20" y1="-48" x2="20" y2="-92" stroke="#4b5563" strokeWidth="2" />
      <path d="M20,-92 h16 v10 h-16 Z" fill="#1b4f8c" className="ms-flag" />
      <Beacon x={108} y={-50} color="blue" />
      {[22, 98].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="-7" r="7.5" fill="#22262c" />
          <circle cx={cx} cy="-7" r="3" fill="#9aa3ad" />
        </g>
      ))}
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
  // 01 — Стабилизировать ЧС: паводок под дождём; люди ждут на крыше, лодка спасателей,
  // дамба из мешков, откачка воды; вода уходит.
  'stabilize-emergency': {
    mood: 'overcast',
    trees: [250, 612],
    emitters: [
      { kind: 'rain', x: 330, y: -10, w: 720, rate: 340, levels: [1, 1, 0.7, 0.3, 0] },
      { kind: 'spray', x: 560, y: 150, tx: 626, ty: 178, rate: 40, levels: ACTION },
    ],
    art: () => (
      <>
        <PowerLine x1={20} x2={230} />
        <House x={40} />
        <House x={120} w={60} h={46} />
        <House x={430} w={62} h={44} warm={false} />
        <g className="ms-stranded">
          <Person x={147} y={120} kind="civil" tone="#a5544a" pose="wave" />
          <Person x={158} y={121} kind="civil" tone="#4a6fa5" pose="stand" s={0.8} />
        </g>
        <g className="ms-flood">
          <path className="ms-flood-body" d="M0,165 C70,160 140,170 210,165 S350,160 420,165 S560,170 640,163 V220 H0 Z" fill="url(#ms-flood)" />
          <path className="ms-flood-shine" d="M0,165 C70,160 140,170 210,165 S350,160 420,165 S560,170 640,163" />
          <path className="ms-flood-shine ms-flood-shine--2" d="M20,178 C90,174 150,182 220,178 S360,174 430,178" />
          <path className="ms-flood-shine ms-flood-shine--2" d="M200,192 C270,188 330,196 400,192 S540,188 620,192" />
        </g>
        <g transform="translate(206 178)" className="ms-car-sunk">
          <CarBody color="#8b2c2c" />
        </g>
        <g transform="translate(60 170)">
          <g className="ms-boat-move ms-on2">
            <RescueBoat />
          </g>
        </g>
        <Cordon x1={262} x2={392} />
        <g className="ms-levee">
          {Array.from({ length: 11 }).map((_, i) => {
            const row = i < 6 ? 0 : 1
            const col = row ? i - 6 : i
            return <rect key={i} className="ms-sandbag" x={290 + col * 15 + row * 7} y={row ? 162 : 173} width="16" height="11" rx="5" style={{ transitionDelay: `${i * 0.1}s` }} />
          })}
        </g>
        <Person x={282} kind="rescue" pose="carry" className="ms-on2" />
        <Person x={396} kind="rescue" pose="carry" className="ms-on2" delay={0.3} flip />
        <Person x={342} y={160} kind="commander" pose="radio" className="ms-on2" />
        <At x={520}>
          <FireTruck />
          <path d="M20,-20 C10,-6 -20,-4 -40,-8" className="ms-hose" />
        </At>
        <Person x={500} kind="fire" pose="stand" className="ms-on2" />
      </>
    ),
  },

  // 02 — Ликвидировать пожар: вечер, горит жилой дом, зеваки; АЦ, гидрант, звено со
  // стволом, РТП с рацией, звено ГДЗС входит в здание; пар.
  'extinguish-fire': {
    mood: 'dusk',
    trees: [20, 612],
    emitters: [
      { kind: 'fire', x: 116, y: 86, w: 86, rate: 110, levels: FADE_OUT },
      { kind: 'fire', x: 92, y: 126, w: 22, rate: 26, levels: [1, 1, 0.6, 0.1, 0] },
      { kind: 'fire', x: 140, y: 150, w: 22, rate: 22, levels: [1, 1, 0.5, 0, 0] },
      { kind: 'ember', x: 116, y: 80, w: 80, rate: 16, levels: FADE_OUT },
      { kind: 'smoke', x: 122, y: 72, w: 70, rate: 24, levels: [1, 1, 0.8, 0.2, 0] },
      { kind: 'smokeLight', x: 120, y: 80, w: 60, rate: 8, levels: [0, 0, 0.6, 1, 0.3] },
      { kind: 'steam', x: 118, y: 100, w: 60, rate: 22, levels: [0, 0, 1, 1, 0.2] },
      { kind: 'spray', x: 266, y: 168, tx: 118, ty: 104, rate: 90, levels: ACTION },
      { kind: 'spray', x: 266, y: 168, tx: 140, ty: 148, rate: 30, levels: ACTION },
    ],
    art: () => (
      <>
        <rect className="ms-fire-light" x="0" y="40" width="300" height="180" fill="url(#ms-fireglow)" />
        <StreetLamp x={186} lit />
        <StreetLamp x={470} lit />
        <Building x={60} w={110} h={104} floors={4} cols={4} burning />
        <Building x={196} w={60} h={62} floors={2} cols={2} warm />
        <Hydrant x={352} />
        <g className="ms-crowd">
          <Person x={560} kind="civil" tone="#7a5a9a" pose="point" flip />
          <Person x={576} kind="civil" tone="#a5544a" flip />
          <Person x={590} kind="civil" tone="#4a7a5a" pose="point" flip delay={0.4} />
        </g>
        <Cordon x1={250} x2={330} />
        <At x={370}>
          <FireTruck />
        </At>
        <g className="ms-on2">
          <path d="M352,182 C362,186 372,186 380,180" className="ms-hose" />
          <path d="M392,180 C350,194 310,192 290,180" className="ms-hose" />
          <path d="M266,168 Q196,40 118,104" className="ms-jet" />
          <path d="M266,168 Q204,92 140,148" className="ms-jet ms-jet--thin" />
          <Person x={288} kind="fire" pose="hose" flip />
          <Person x={306} kind="fire" pose="carry" flip delay={0.2} s={0.97} />
          <Person x={338} kind="commander" pose="radio" flip />
        </g>
        <g className="ms-on3">
          <Person x={178} kind="fire" pose="walk" flip className="ms-gdzs" />
          <Person x={192} kind="fire" pose="walk" flip delay={0.3} className="ms-gdzs" />
        </g>
      </>
    ),
  },

  // 03 — Локализовать аварию: утечка с ёмкости, облако газа, рабочие уходят; химзащита,
  // лафетный ствол, водяная завеса, замер газоанализатором.
  'contain-accident': {
    mood: 'day',
    trees: [612],
    emitters: [
      { kind: 'gas', x: 250, y: 140, w: 20, rate: 9, levels: [1, 1, 0.6, 0.25, 0] },
      { kind: 'smokeLight', x: 82, y: 50, w: 6, rate: 5, levels: [1, 1, 1, 1, 1] },
      { kind: 'spray', x: 440, y: 160, tx: 340, ty: 112, rate: 60, levels: ACTION },
      { kind: 'spray', x: 440, y: 160, tx: 312, ty: 150, rate: 50, levels: ACTION },
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
        <g transform="translate(296 150)">
          <path d="M0,0 l12,-20 l12,20 Z" fill="#f2c230" stroke="#333" strokeWidth="1" />
          <text x="12" y="-4" className="ms-sign-text">!</text>
        </g>
        <g className="ms-leaving">
          <Person x={160} kind="civil" tone="#4a6fa5" pose="walk" className="ms-walker-out" />
          <Person x={170} kind="civil" tone="#6b7a68" pose="walk" className="ms-walker-out" delay={0.5} />
        </g>
        <Cordon x1={330} x2={410} />
        <g className="ms-on2">
          <path d="M440,160 Q392,50 340,112" className="ms-jet" />
          <path d="M440,160 Q376,92 312,150" className="ms-jet ms-jet--thin" />
          <g transform="translate(440 188)">
            <path d="M-6,0 l4,-18 h4 l4,18 Z" fill="#4b5563" />
            <rect x="-3" y="-30" width="6" height="12" rx="2" fill="#6b7684" transform="rotate(-38 0 -18)" />
          </g>
          <Person x={424} kind="hazmat" pose="hose" flip />
          <Person x={456} kind="hazmat" pose="point" flip delay={0.3} />
          <Person x={418} kind="commander" pose="radio" />
        </g>
        <At x={490}>
          <FireTruck />
        </At>
      </>
    ),
  },

  // 04 — Провести эвакуацию: тревога, жители выходят, спасатель направляет, полиция
  // перекрывает улицу, пункт сбора, автобус.
  'run-evacuation': {
    mood: 'day',
    trees: [230, 620],
    emitters: [{ kind: 'smokeLight', x: 128, y: 64, w: 14, rate: 6, levels: [1, 1, 1, 0.5, 0] }],
    art: () => (
      <>
        <StreetLamp x={196} />
        <Building x={40} w={120} h={116} floors={4} cols={4} warm />
        <g className="ms-alarm">
          <Beacon x={150} y={100} color="red" />
        </g>
        <Waves x={152} y={100} />
        <Car x={256} color="#6d7f94" />
        <Cordon x1={176} x2={246} />
        <g className="ms-walkers">
          {['#4a6fa5', '#a5544a', '#5a8a5a', '#7a5a9a', '#3d6b8c', '#9a7a4a'].map((tone, i) => (
            <Person key={i} x={172} kind="civil" tone={tone} pose="walk" className="ms-walker" delay={i * 0.65} s={i === 4 ? 0.7 : 1} />
          ))}
        </g>
        <Person x={170} kind="rescue" pose="point" className="ms-on2" />
        <g transform="translate(470 189)">
          <line x1="0" y1="0" x2="0" y2="-56" stroke="#5b6b80" strokeWidth="2.5" />
          <path d="M0,-56 h28 l-6,8 l6,8 h-28 Z" fill="#15803d" className="ms-flag" />
        </g>
        <g className="ms-on3">
          {['#4a6fa5', '#a5544a', '#5a8a5a', '#7a5a9a'].map((tone, i) => (
            <Person key={i} x={488 + i * 12} kind="civil" tone={tone} s={i === 2 ? 0.72 : 1} />
          ))}
          <Person x={478} kind="rescue" pose="radio" />
        </g>
        <g className="ms-on1">
          <PoliceCar x={380} flip />
          <Person x={390} kind="police" pose="point" />
        </g>
        <At x={540}>
          <g className="ms-vehicle">
            <ellipse cx="48" cy="1" rx="52" ry="4" fill="url(#ms-shadow)" />
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

  // 05 — Организовать реагирование: оперативный штаб (командный автобус, палатка, РТП),
  // зеваки у очага; колонна к очагу, расчёт тушит, огонь стихает.
  'organize-response': {
    mood: 'day',
    trees: [250, 420],
    emitters: [
      { kind: 'smoke', x: 560, y: 128, w: 26, rate: 10, levels: [1, 1, 0.7, 0.2, 0] },
      { kind: 'fire', x: 556, y: 150, w: 30, rate: 40, levels: [1, 1, 0.6, 0.15, 0] },
      { kind: 'ember', x: 556, y: 140, w: 26, rate: 6, levels: [1, 1, 0.5, 0, 0] },
      { kind: 'steam', x: 556, y: 146, w: 26, rate: 14, levels: [0, 0, 1, 1, 0.2] },
      { kind: 'spray', x: 486, y: 166, tx: 552, ty: 148, rate: 50, levels: ACTION },
    ],
    art: () => (
      <>
        <g transform="translate(20 189)">
          <CommandBus />
        </g>
        <g transform="translate(150 189)">
          <path d="M0,0 L6,-34 H64 L70,0 Z" fill="#d6dccf" stroke="#7d8a76" strokeWidth="0.8" />
          <path d="M6,-34 H64 l6,-6 H12 Z" fill="#b8c2b0" />
          <rect x="20" y="-22" width="30" height="16" fill="#f4f1e6" stroke="#8a8a7a" strokeWidth="0.6" />
          <path d="M24,-18 q6,-4 10,2 t12,-2 M26,-11 h18" stroke="#c81f2e" strokeWidth="0.8" fill="none" />
        </g>
        <Person x={146} kind="commander" pose="radio" />
        <Person x={232} kind="rescue" pose="point" flip />
        <Person x={244} kind="fire" />
        <Waves x={44} y={96} color="#1b4f8c" />
        <StreetLamp x={330} />
        <Car x={344} color="#6d7f94" />
        <Hydrant x={448} />
        <Building x={520} w={78} h={56} floors={2} cols={3} warm burning />
        <g className="ms-crowd">
          <Person x={470} kind="civil" tone="#7a5a9a" pose="point" />
          <Person x={482} kind="civil" tone="#a5544a" />
        </g>
        <Cordon x1={460} x2={512} />
        <path className="ms-route ms-on1" d="M270,196 H460" />
        <g className="ms-on2">
          <g transform="translate(290 196)">
            <g className="ms-drive">
              <Ambulance />
            </g>
          </g>
          <g transform="translate(372 196)">
            <g className="ms-drive ms-drive--2">
              <FireTruck />
            </g>
          </g>
          <path d="M486,166 Q520,120 552,148" className="ms-jet" />
          <Person x={478} kind="fire" pose="hose" />
          <Person x={494} kind="fire" pose="hose" delay={0.2} s={0.97} />
        </g>
      </>
    ),
  },

  // 06 — Защитить население: сирена оповещения, облако вдалеке, жители идут в защитное
  // сооружение, спасатель у входа, полиция; дверь закрывается.
  'protect-population': {
    mood: 'overcast',
    trees: [180, 612],
    emitters: [{ kind: 'gas', x: 20, y: 60, w: 30, h: 30, rate: 3, levels: [1, 1, 0.6, 0.2, 0] }],
    art: () => (
      <>
        <StreetLamp x={140} />
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
            <rect x="-9" y="-9" width="18" height="18" fill="#f47c20" />
            <path d="M0,-6 l6,10 h-12 Z" fill="#1f4fa8" />
          </g>
        </g>
        <Cordon x1={300} x2={380} />
        <g className="ms-walkers ms-walkers--shelter">
          {['#4a6fa5', '#a5544a', '#5a8a5a', '#7a5a9a', '#9a7a4a'].map((tone, i) => (
            <Person key={i} x={150} kind="civil" tone={tone} pose="walk" className="ms-walker" delay={i * 0.75} s={i === 3 ? 0.72 : 1} />
          ))}
        </g>
        <Person x={432} kind="rescue" pose="point" className="ms-on2" flip />
        <g className="ms-on1">
          <PoliceCar x={250} />
        </g>
      </>
    ),
  },

  // 07 — Восстановить объект: разрушенное здание, пыль; спасатели разбирают завал, сварка,
  // кран, этажи восстанавливаются.
  'restore-facility': {
    mood: 'day',
    trees: [620],
    emitters: [
      { kind: 'dust', x: 120, y: 182, w: 90, rate: 9, levels: [1, 1, 1, 0.4, 0] },
      { kind: 'spark', x: 176, y: 150, rate: 26, levels: ACTION },
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
        <Cordon x1={200} x2={280} />
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
        <g className="ms-on2">
          <Person x={186} kind="rescue" pose="carry" />
          <Person x={230} kind="rescue" pose="point" flip />
          <Person x={260} kind="commander" pose="radio" />
          <g transform="translate(172 160)">
            <rect x="-2" y="-4" width="10" height="5" rx="1" fill="#3b4250" />
          </g>
        </g>
        <At x={420}>
          <g className="ms-vehicle">
            <ellipse cx="50" cy="1" rx="54" ry="4" fill="url(#ms-shadow)" />
            <rect x="0" y="-38" width="74" height="30" rx="3" fill="#e2621c" />
            <path d="M74,-38 h16 q6,0 8,5 l4,8 v17 h-28 Z" fill="#e2621c" />
            <path d="M78,-34 h10 q3,0 5,3 l3,6 h-18 Z" fill="url(#ms-glass)" />
            <rect x="0" y="-18" width="102" height="3" fill="#f3f3f3" />
            <text x="16" y="-23" className="ms-truck-text">ТЖМ</text>
            <Beacon x={86} y={-40} color="blue" />
            {[16, 60, 88].map((cx) => (
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

  // 08 — Организовать медпомощь: пострадавший, скорая, медики несут носилки в полевой
  // госпиталь, врач у палатки, ЭКГ выравнивается.
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
        <Person x={214} kind="medic" pose="point" flip className="ms-on2" />
        <g className="ms-casualties">
          <rect x="300" y="178" width="38" height="7" rx="3" fill="#9aa3ad" />
          <path d="M306,176 h26 v-4 h-26 Z" fill="#4a6fa5" />
          <circle cx="302" cy="174" r="3.8" fill="#dfb08a" />
          <Person x={288} kind="civil" tone="#8a5a4a" pose="wave" />
        </g>
        <Cordon x1={256} x2={366} />
        <StretcherTeam x={290} className="ms-stretcher ms-on3" />
        <At x={410}>
          <Ambulance />
        </At>
        <Person x={346} kind="medic" className="ms-on2" delay={0.3} flip />
        <Person x={396} kind="medic" pose="carry" className="ms-on2" />
        <g transform="translate(500 50)">
          <rect x="0" y="0" width="116" height="60" rx="6" fill="#0f2440" stroke="#5b6b80" />
          <path d="M6,12 H110 M6,48 H110" stroke="#1e3a5c" strokeWidth="0.6" />
          <path className="ms-pulse ms-pulse--alarm" d="M8,32 h18 l6,-20 l8,36 l8,-28 l6,12 h50" />
          <path className="ms-pulse ms-pulse--steady" d="M8,32 h30 l5,-11 l6,20 l5,-9 h60" />
        </g>
      </>
    ),
  },

  // 09 — Обеспечить связь: вышка повреждена, искрит; узел связи поднимает мачту,
  // связист на линии, техник на вышке, сигнал доходит до домов.
  'ensure-communications': {
    mood: 'overcast',
    trees: [40, 420],
    emitters: [{ kind: 'spark', x: 124, y: 72, rate: 30, levels: [1, 1, 0, 0, 0] }],
    art: () => (
      <>
        <PowerLine x1={430} x2={630} />
        <g transform="translate(110 189)">
          <path d="M-22,0 L-3,-118 M22,0 L3,-118 M-16,-36 H16 M-11,-70 H11 M-7,-100 H7 M-16,-36 L11,-70 M16,-36 L-11,-70" stroke="#5b6b80" strokeWidth="2" fill="none" />
          <path d="M3,-118 l18,-12" stroke="#c81f2e" strokeWidth="2.5" className="ms-tower-broken" />
          <path d="M3,-118 l0,-22" stroke="#5b6b80" strokeWidth="2.5" className="ms-tower-fixed ms-on4" />
          <path d="M-14,-6 l-10,6 h20 Z" fill="#7d8896" />
        </g>
        <Person x={116} y={120} kind="rescue" pose="radio" s={0.8} className="ms-on3" />
        <Cordon x1={150} x2={236} />
        <At x={280}>
          <g className="ms-vehicle">
            <ellipse cx="46" cy="1" rx="50" ry="4" fill="url(#ms-shadow)" />
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
        <Person x={262} kind="rescue" pose="radio" className="ms-on2" />
        <Person x={388} kind="rescue" pose="point" className="ms-on2" flip />
        <Waves x={318} y={66} color="#1b4f8c" className="ms-on3" />
        <House x={470} warm />
        <House x={548} w={58} h={42} warm={false} />
        <Person x={532} kind="civil" tone="#4a6fa5" pose="radio" className="ms-on4" />
        <path className="ms-link ms-on3" d="M326,68 C400,58 460,96 498,138" />
        <path className="ms-link ms-on3" d="M326,68 C440,48 540,96 576,140" />
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
