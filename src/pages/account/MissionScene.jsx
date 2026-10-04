import './missionScene.css'

// Animated scene of a mission — one per mission, drawn from its title, and
// driven by the operation's progress:
//   reached 0  the incident at full strength (briefing / stage 01 «оценка»)
//   reached 1  the danger zone is cordoned off (stage 02 «определение зоны»)
//   reached 2  forces arrive and do the mission's own action (stage 03)
//   reached 3  the hazard dies down (stage 04 «контроль»)
//   reached 4  resolved — everything calm, green mark
// `reached` = number of operation stages completed. Every change between
// states is a CSS transition, so progress plays as an animation.

// ---- shared pieces ----------------------------------------------------------------

function Sky() {
  return (
    <>
      <defs>
        <linearGradient id="ms-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dcebf9" />
          <stop offset="1" stopColor="#f6fafe" />
        </linearGradient>
        <linearGradient id="ms-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9d6e3" />
          <stop offset="1" stopColor="#e3eaf1" />
        </linearGradient>
        <linearGradient id="ms-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#c81f2e" />
          <stop offset="0.45" stopColor="#f2711c" />
          <stop offset="1" stopColor="#ffd34d" />
        </linearGradient>
        <linearGradient id="ms-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fb4e8" />
          <stop offset="1" stopColor="#3d86c6" />
        </linearGradient>
        <radialGradient id="ms-gas" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#c7d36a" stopOpacity="0.75" />
          <stop offset="1" stopColor="#c7d36a" stopOpacity="0" />
        </radialGradient>
        <filter id="ms-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      <rect x="0" y="0" width="640" height="190" fill="url(#ms-sky)" />
      <rect x="0" y="188" width="640" height="32" fill="url(#ms-ground)" />
      <line x1="0" y1="188" x2="640" y2="188" className="ms-ground-line" />
    </>
  )
}

function Building({ x, y, w, h, cols = 3, rows = 3, roof = false, className = '' }) {
  const winW = 9
  const winH = 11
  const gapX = (w - cols * winW) / (cols + 1)
  const gapY = (h - 14 - rows * winH) / (rows + 1)
  return (
    <g className={`ms-building ${className}`}>
      {roof && <path d={`M${x - 4},${y} L${x + w / 2},${y - 18} L${x + w + 4},${y} Z`} className="ms-roof" />}
      <rect x={x} y={y} width={w} height={h} />
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => (
          <rect
            key={`${r}-${c}`}
            className="ms-window"
            x={x + gapX + c * (winW + gapX)}
            y={y + gapY + r * (winH + gapY)}
            width={winW}
            height={winH}
          />
        )),
      )}
      <rect className="ms-door" x={x + w / 2 - 6} y={y + h - 16} width="12" height="16" />
    </g>
  )
}

/** Flame tongue; flickers by itself, size set by the scene state. */
function Flame({ x, y, s = 1, delay = 0 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        className="ms-flame"
        style={{ animationDelay: `${delay}s` }}
        d="M0,0 C-14,-8 -12,-26 -4,-36 C-4,-26 2,-24 4,-32 C10,-22 16,-12 10,-2 C8,2 4,2 0,0 Z"
      />
    </g>
  )
}

function Smoke({ x, y, dark = true, count = 4 }) {
  return (
    <g className={`ms-smoke${dark ? ' ms-smoke--dark' : ''}`} transform={`translate(${x} ${y})`}>
      {Array.from({ length: count }).map((_, i) => (
        <circle key={i} r={10 + i * 3} cx={(i % 2 ? 6 : -4) * i} cy="0" style={{ animationDelay: `${i * 0.7}s` }} filter="url(#ms-blur)" />
      ))}
    </g>
  )
}

function Person({ x, y, delay = 0, className = '', color }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={`ms-person ${className}`} style={{ animationDelay: `${delay}s` }}>
        <circle cy="-17" r="3.2" />
        <path d="M-3.5,-13 h7 l1.5,8 h-2.5 l-1,8 h-3 l-1,-8 h-2.5 z" style={color ? { fill: color } : undefined} />
      </g>
    </g>
  )
}

function FireTruck({ className = '' }) {
  return (
    <g className={`ms-truck ${className}`}>
      <rect x="0" y="-30" width="78" height="24" rx="2" className="ms-truck-body" />
      <path d="M78,-30 h18 l10,12 v12 h-28 z" className="ms-truck-body" />
      <path d="M82,-27 h11 l6,8 h-17 z" className="ms-truck-glass" />
      <line x1="6" y1="-34" x2="72" y2="-34" className="ms-truck-ladder" />
      <line x1="6" y1="-31" x2="72" y2="-31" className="ms-truck-ladder" />
      <rect x="84" y="-34" width="12" height="4" rx="1" className="ms-beacon" />
      <rect x="8" y="-24" width="14" height="12" className="ms-truck-panel" />
      <rect x="28" y="-24" width="14" height="12" className="ms-truck-panel" />
      <circle cx="20" cy="-5" r="6" className="ms-wheel" />
      <circle cx="62" cy="-5" r="6" className="ms-wheel" />
      <circle cx="94" cy="-5" r="6" className="ms-wheel" />
    </g>
  )
}

function Ambulance({ className = '' }) {
  return (
    <g className={`ms-ambulance ${className}`}>
      <rect x="0" y="-32" width="66" height="26" rx="3" className="ms-amb-body" />
      <path d="M66,-26 h14 l8,10 v10 h-22 z" className="ms-amb-body" />
      <path d="M69,-23 h9 l5,7 h-14 z" className="ms-truck-glass" />
      <rect x="0" y="-18" width="88" height="3" className="ms-amb-stripe" />
      <path d="M29,-28 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 z" className="ms-cross" />
      <rect x="70" y="-36" width="10" height="4" rx="1" className="ms-beacon ms-beacon--blue" />
      <circle cx="16" cy="-5" r="6" className="ms-wheel" />
      <circle cx="74" cy="-5" r="6" className="ms-wheel" />
    </g>
  )
}

/** Cordon of the danger zone: cones and striped tape between x1 and x2. */
function Cordon({ x1, x2, y = 188 }) {
  const cones = [x1, (x1 + x2) / 2, x2]
  return (
    <g className="ms-cordon ms-on1">
      <line x1={x1} y1={y - 12} x2={x2} y2={y - 12} className="ms-tape" />
      {cones.map((cx) => (
        <g key={cx} transform={`translate(${cx} ${y})`}>
          <path d="M-6,0 L-2,-16 h4 L6,0 Z" className="ms-cone" />
          <rect x="-4.5" y="-9" width="9" height="2.5" className="ms-cone-band" />
        </g>
      ))}
    </g>
  )
}

function Waves({ x, y, className = '', flip = false }) {
  return (
    <g className={`ms-waves ${className}`} transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`}>
      {[10, 18, 26].map((r, i) => (
        <path key={r} d={`M${r * 0.7},${-r * 0.7} A${r},${r} 0 0 1 ${r * 0.7},${r * 0.7}`} style={{ animationDelay: `${i * 0.35}s` }} />
      ))}
    </g>
  )
}

function DoneMark() {
  return (
    <g className="ms-done ms-on4" transform="translate(600 30)">
      <circle r="16" />
      <path d="M-7,0 l5,5 l9,-10" />
    </g>
  )
}

// ---- the nine scenes ----------------------------------------------------------------

const SCENES = {
  // 01 — Стабилизировать ЧС: паводок подтапливает посёлок; дамба из мешков, вода уходит.
  'stabilize-emergency': () => (
    <>
      <Building x={70} y={130} w={70} h={58} cols={2} rows={2} roof />
      <Building x={160} y={140} w={60} h={48} cols={2} rows={1} roof />
      <Building x={420} y={124} w={74} h={64} cols={3} rows={2} roof />
      <g className="ms-flood">
        <path className="ms-water-body" d="M0,170 C60,164 120,176 180,170 S300,164 360,170 S480,176 640,168 V220 H0 Z" />
        <path className="ms-water-wave" d="M0,170 C60,164 120,176 180,170 S300,164 360,170 S480,176 640,168" />
      </g>
      <Cordon x1={250} x2={390} />
      <g className="ms-levee ms-on2">
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} className="ms-sandbag" x={300 + (i % 5) * 16 - (i > 4 ? -8 : 0)} y={i > 4 ? 162 : 174} width="15" height="11" rx="5" style={{ transitionDelay: `${i * 0.12}s` }} />
        ))}
      </g>
      <g transform="translate(520 188)">
        <g className="ms-arrive ms-on2">
          <FireTruck />
        </g>
      </g>
      <Person x={290} y={188} className="ms-on2" />
      <Person x={384} y={188} className="ms-on2" delay={0.4} />
    </>
  ),

  // 02 — Ликвидировать пожар: горит здание; машина, ствол, вода; огонь гаснет.
  'extinguish-fire': () => (
    <>
      <Building x={60} y={96} w={120} h={92} cols={4} rows={4} className="ms-burning" />
      <Building x={196} y={136} w={60} h={52} cols={2} rows={2} />
      <g className="ms-fire">
        <Flame x={92} y={100} s={1.2} />
        <Flame x={126} y={98} s={1.5} delay={0.3} />
        <Flame x={160} y={102} s={1.1} delay={0.6} />
        <Flame x={110} y={140} s={0.8} delay={0.2} />
      </g>
      <Smoke x={120} y={64} />
      <Cordon x1={270} x2={360} />
      <g transform="translate(380 188)">
        <g className="ms-arrive ms-on2">
          <FireTruck />
        </g>
      </g>
      <g className="ms-on2">
        <Person x={300} y={188} color="#b0413e" />
        <path className="ms-hose" d="M380,180 C350,186 320,186 304,176" />
        <path className="ms-stream" d="M308,168 C270,110 210,96 150,112" />
      </g>
    </>
  ),

  // 03 — Локализовать аварию: на заводе утечка из ёмкости, облако газа; водяная завеса.
  'contain-accident': () => (
    <>
      <g className="ms-building">
        <rect x={50} y={112} width={110} height={76} />
        <rect x={74} y={70} width={14} height={42} />
        <rect x={110} y={84} width={12} height={28} />
      </g>
      <g className="ms-tank">
        <rect x={190} y={128} width={70} height={60} rx="30" />
        <line x1={190} y1={150} x2={260} y2={150} />
      </g>
      <g className="ms-leak">
        <circle className="ms-gas" cx="250" cy="120" r="60" fill="url(#ms-gas)" />
        <circle className="ms-gas ms-gas--2" cx="300" cy="110" r="70" fill="url(#ms-gas)" />
      </g>
      <Smoke x={82} y={56} dark={false} count={3} />
      <Cordon x1={340} x2={430} />
      <g className="ms-on2">
        <path className="ms-stream ms-stream--curtain" d="M470,176 C430,110 380,100 330,120" />
        <path className="ms-stream ms-stream--curtain" d="M470,176 C440,90 360,80 310,110" style={{ animationDelay: '0.4s' }} />
      </g>
      <g transform="translate(470 188)">
        <g className="ms-arrive ms-on2">
          <FireTruck />
        </g>
      </g>
      <Person x={450} y={188} className="ms-on2" color="#d6a72b" />
    </>
  ),

  // 04 — Провести эвакуацию: из здания по сигналу выходят люди к пункту сбора, автобус.
  'run-evacuation': () => (
    <>
      <Building x={50} y={86} w={110} h={102} cols={4} rows={4} />
      <g className="ms-alarm" transform="translate(150 96)">
        <circle r="5" className="ms-beacon" />
      </g>
      <Waves x={150} y={96} />
      <Cordon x1={176} x2={250} />
      <g className="ms-walkers">
        {[0, 1, 2, 3, 4].map((i) => (
          <Person key={i} x={170} y={188} className="ms-walker" delay={i * 0.6} />
        ))}
      </g>
      <g className="ms-assembly" transform="translate(470 188)">
        <line x1="0" y1="0" x2="0" y2="-54" className="ms-pole" />
        <path d="M0,-54 h26 l-6,8 l6,8 h-26 z" className="ms-flag" />
      </g>
      <g className="ms-gathered ms-on3">
        {[0, 1, 2, 3].map((i) => (
          <Person key={i} x={488 + i * 12} y={188} />
        ))}
      </g>
      <g transform="translate(530 188)">
        <g className="ms-bus ms-arrive ms-on2">
          <rect x="0" y="-36" width="96" height="30" rx="4" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={8 + i * 21} y="-30" width="15" height="11" className="ms-truck-glass" />
          ))}
          <circle cx="18" cy="-5" r="6" className="ms-wheel" />
          <circle cx="78" cy="-5" r="6" className="ms-wheel" />
        </g>
      </g>
    </>
  ),

  // 05 — Организовать реагирование: штаб с антенной направляет силы к очагу.
  'organize-response': () => (
    <>
      <g className="ms-hq" transform="translate(70 188)">
        <path d="M0,0 L0,-36 L40,-56 L80,-36 L80,0 Z" />
        <rect x="30" y="-24" width="20" height="24" className="ms-door" />
        <line x1="70" y1="-46" x2="70" y2="-92" className="ms-pole" />
      </g>
      <Waves x={140} y={96} />
      <g className="ms-incident" transform="translate(520 150)">
        <circle r="34" className="ms-incident-zone" />
        <circle r="8" className="ms-incident-core" />
      </g>
      <Cordon x1={460} x2={580} />
      <path className="ms-route ms-on1" d="M160,180 C260,150 360,190 470,170" />
      <g className="ms-convoy ms-on2">
        <g transform="translate(200 188)">
          <g className="ms-drive">
            <FireTruck />
          </g>
        </g>
        <g transform="translate(330 188)">
          <g className="ms-drive ms-drive--2">
            <Ambulance />
          </g>
        </g>
      </g>
      <Waves x={480} y={120} flip className="ms-on2" />
    </>
  ),

  // 06 — Защитить население: сирена оповещения, люди уходят в укрытие, дверь закрывается.
  'protect-population': () => (
    <>
      <Building x={40} y={110} w={90} h={78} cols={3} rows={3} />
      <g className="ms-siren" transform="translate(220 188)">
        <line x1="0" y1="0" x2="0" y2="-96" className="ms-pole" />
        <path d="M-10,-96 h20 l6,-12 h-32 z" className="ms-siren-head" />
      </g>
      <Waves x={232} y={-96 + 188 - 8} />
      <Waves x={208} y={-96 + 188 - 8} flip />
      <g className="ms-shelter" transform="translate(470 188)">
        <path d="M-70,0 C-70,-60 70,-60 70,0 Z" />
        <rect x="-16" y="-34" width="32" height="34" className="ms-shelter-door" />
        <rect x="-16" y="-34" width="32" height="34" className="ms-shelter-gate ms-on4" />
      </g>
      <Cordon x1={300} x2={380} />
      <g className="ms-walkers ms-walkers--shelter">
        {[0, 1, 2, 3].map((i) => (
          <Person key={i} x={150} y={188} className="ms-walker" delay={i * 0.7} />
        ))}
      </g>
    </>
  ),

  // 07 — Восстановить объект: разрушенное здание, кран поднимает плиты, стена восстанавливается.
  'restore-facility': () => (
    <>
      <g className="ms-ruins">
        <path d="M80,188 L80,120 L118,104 L130,140 L160,128 L170,188 Z" />
        <path d="M60,188 l30,-16 l26,10 l14,-8 l28,14 z" className="ms-rubble" />
      </g>
      <g className="ms-rebuilt">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x="80" y={170 - i * 20} width="90" height="18" className={`ms-on${[2, 3, 3, 4][i]}`} style={{ transitionDelay: `${i * 0.15}s` }} />
        ))}
      </g>
      <Cordon x1={190} x2={280} />
      <g className="ms-crane" transform="translate(330 188)">
        <line x1="0" y1="0" x2="0" y2="-150" className="ms-pole ms-pole--crane" />
        <line x1="-170" y1="-146" x2="40" y2="-146" className="ms-pole ms-pole--crane" />
        <g className="ms-hook ms-on2">
          <line x1="-130" y1="-146" x2="-130" y2="-96" className="ms-cable" />
          <rect x="-156" y="-96" width="52" height="12" className="ms-slab" />
        </g>
      </g>
      <Person x={220} y={188} className="ms-on2" color="#d6a72b" />
      <Person x={250} y={188} className="ms-on2" color="#d6a72b" delay={0.3} />
    </>
  ),

  // 08 — Организовать медпомощь: пострадавшие, скорая, полевой госпиталь, пульс выравнивается.
  'organize-medical-aid': () => (
    <>
      <g className="ms-tent" transform="translate(130 188)">
        <path d="M-80,0 L-60,-62 L60,-62 L80,0 Z" />
        <path d="M-6,-50 h4 v-4 h4 v4 h4 v4 h-4 v4 h-4 v-4 h-4 z" className="ms-cross" />
      </g>
      <g className="ms-casualties">
        <rect x="300" y="178" width="34" height="8" rx="4" className="ms-stretcher" />
        <circle cx="304" cy="176" r="4" className="ms-casualty" />
      </g>
      <Cordon x1={250} x2={360} />
      <g transform="translate(400 188)">
        <g className="ms-arrive ms-on2">
          <Ambulance />
        </g>
      </g>
      <Person x={290} y={188} className="ms-on2" color="#e4e9ef" />
      <g className="ms-monitor" transform="translate(500 60)">
        <rect x="0" y="0" width="110" height="56" rx="6" />
        <path className="ms-pulse ms-pulse--alarm" d="M8,30 h18 l6,-18 l8,34 l8,-26 l6,10 h48" />
        <path className="ms-pulse ms-pulse--steady" d="M8,30 h28 l5,-10 l6,18 l5,-8 h58" />
      </g>
    </>
  ),

  // 09 — Обеспечить связь: вышка повреждена, мобильный узел связи поднимает мачту, сигнал до домов.
  'ensure-communications': () => (
    <>
      <g className="ms-tower ms-tower--broken" transform="translate(110 188)">
        <path d="M-20,0 L0,-120 L20,0 M-14,-34 h28 M-9,-70 h18" />
        <path d="M0,-120 l18,-14" className="ms-tower-bent" />
      </g>
      <g className="ms-spark" transform="translate(122 66)">
        <path d="M0,0 l6,-10 l-2,8 l8,-2 l-8,12 l2,-8 z" />
      </g>
      <Cordon x1={150} x2={240} />
      <g transform="translate(280 188)">
        <g className="ms-arrive ms-on2">
          <rect x="0" y="-32" width="80" height="26" rx="3" className="ms-van" />
          <circle cx="16" cy="-5" r="6" className="ms-wheel" />
          <circle cx="64" cy="-5" r="6" className="ms-wheel" />
          <line x1="40" y1="-32" x2="40" y2="-110" className="ms-mast" />
          <circle cx="40" cy="-112" r="4" className="ms-beacon ms-beacon--blue" />
        </g>
      </g>
      <Waves x={320} y={78} className="ms-on3" />
      <Building x={470} y={140} w={50} h={48} cols={2} rows={1} roof className="ms-house" />
      <Building x={540} y={146} w={50} h={42} cols={2} rows={1} roof className="ms-house" />
      <path className="ms-link ms-on3" d="M330,80 C400,70 460,100 495,128" />
      <path className="ms-link ms-on3" d="M330,80 C430,60 520,100 565,134" />
    </>
  ),
}

export default function MissionScene({ missionId, reached = 0, caption = null }) {
  const Scene = SCENES[missionId] ?? SCENES['stabilize-emergency']
  const level = Math.max(0, Math.min(4, reached))
  const classes = ['ms-scene', `ms-mission-${missionId}`]
  for (let i = 1; i <= level; i++) classes.push(`ms-r${i}`)
  return (
    <div className={classes.join(' ')}>
      <svg className="ms-svg" viewBox="0 0 640 220" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <Sky />
        <Scene />
        <DoneMark />
      </svg>
      {caption && <span className="ms-caption">{caption}</span>}
    </div>
  )
}
