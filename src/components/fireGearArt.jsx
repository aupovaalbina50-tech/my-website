// Fire-service equipment drawn as technical drawings: thin precise
// contours, dash-dot centre lines, dimension lines with end ticks and the
// designation (АЦ-3,0-40, Ми-8 МТВ, РС-50, ОП-5 …), as in an equipment
// manual: helmet, tanker, helicopter, boat, hydrant, extinguisher, axe,
// nozzle, fire bucket, radio and sprinkler. Shown faintly behind the site
// and down the sides of the hero.
//
// Each piece: `d` — outline paths, `circles` — [cx, cy, r], `center` —
// centre lines, `dims` — dimension lines and ticks, `labels` — [x, y, text].
export const SILHOUETTES = {
  // Firefighter helmet (КПС), side elevation.
  helmet: {
    viewBox: '0 0 120 84',
    d: [
      'M22 52 C22 30 38 14 60 14 C80 14 94 28 96 48',
      'M32 30 C42 19 72 17 88 31',
      'M50 21 H58 M47 25 H59',
      'M82 28 L88 26 L93 30 V36 L88 40 L82 38 Z',
      'M88 44 C96 46 100 54 98 62 L90 60 C92 54 90 49 84 47 Z',
      'M8 54 C30 48 80 48 104 52 L104 55 C80 52 30 53 10 58 Z',
      'M30 56 C36 66 54 70 66 64',
    ],
    center: ['M60 6 V70'],
    dims: ['M8 76 H104', 'M8 73 V79 M104 73 V79'],
    labels: [[56, 83, 'КАСКА КПС']],
  },

  // Fire tanker (АЦ-3,0-40) on a three-axle chassis, side elevation.
  truck: {
    viewBox: '0 0 200 96',
    d: [
      'M10 26 H146 V64 H10 Z',
      'M14 30 H142 V60 H14 Z',
      'M42 30 V60 M72 30 V60 M102 30 V60 M128 30 V60',
      'M10 48 H146',
      'M14 18 H140 M14 22 H140',
      'M22 18 V22 M34 18 V22 M46 18 V22 M58 18 V22 M70 18 V22 M82 18 V22 M94 18 V22 M106 18 V22 M118 18 V22 M130 18 V22',
      'M150 64 V30 Q150 26 154 26 H176 L188 42 V64',
      'M156 30 H171 V42 H156 Z',
      'M175 30 L184 42 H175 Z',
      'M153 45 V62 H172 V45 Z',
      'M158 26 V22 H170 V26',
      'M190 34 V44',
      'M186 56 H193 V64 H186',
      'M6 64 H192',
      'M22 64 Q22 53 34 53 H62 Q74 53 74 64',
      'M158 64 Q158 53 170 53 Q182 53 182 64',
    ],
    circles: [
      [34, 68, 9],
      [34, 68, 3.5],
      [62, 68, 9],
      [62, 68, 3.5],
      [170, 68, 9],
      [170, 68, 3.5],
    ],
    dims: ['M6 86 H192', 'M6 83 V89 M192 83 V89'],
    labels: [[99, 95, 'АЦ-3,0-40']],
  },

  // Fire hydrant pillar (ПГ) on its base, with the ground line.
  hydrant: {
    viewBox: '0 0 60 104',
    d: [
      'M22 14 Q30 6 38 14',
      'M28 8 H32 V4 H28 Z',
      'M18 14 H42 V18 H18 Z',
      'M21 18 V82 M39 18 V82',
      'M9 38 H21 V50 H9 Z M39 38 H51 V50 H39 Z',
      'M7 40 V48 M53 40 V48',
      'M21 30 H39 M21 60 H39',
      'M15 82 H45 V88 H15 Z',
      'M2 92 H58',
      'M8 92 L4 96 M16 92 L12 96 M24 92 L20 96 M32 92 L28 96 M40 92 L36 96 M48 92 L44 96 M56 92 L52 96',
    ],
    center: ['M30 1 V100'],
    labels: [[30, 103, 'ПГ']],
  },

  // Powder extinguisher (ОП-5) with valve, gauge, hose and data plate.
  extinguisher: {
    viewBox: '0 0 60 104',
    d: [
      'M18 30 Q18 22 30 22 Q42 22 42 30 V88 Q42 92 38 92 H22 Q18 92 18 88 Z',
      'M26 22 V14 H34 V22',
      'M30 14 L48 10 M34 16 L48 14',
      'M26 16 C12 18 8 34 10 52 L8 58 H12 L12 52',
      'M22 44 H38 V70 H22 Z',
      'M18 84 H42',
    ],
    circles: [[22, 12, 3]],
    center: ['M30 2 V98'],
    labels: [
      [30, 59, 'ОП-5'],
      [30, 102, 'ОП-5 (з)'],
    ],
  },

  // Fire axe (ТПН): blade, pick and handle with grip marks.
  axe: {
    viewBox: '0 0 64 124',
    d: [
      'M26 10 H36 L54 4 Q59 18 54 32 L36 26 H26 Z',
      'M26 12 L8 19 L26 23',
      'M29 26 L30 116 M34 26 L35 116',
      'M30 116 H35',
      'M30 96 H35 M30 100 H35 M30 104 H35 M30 108 H35',
    ],
    center: ['M31.5 2 V121'],
    labels: [[46, 70, 'ТПН']],
  },

  // Branch nozzle (РС-50) with its ГМ-50 coupling head.
  nozzle: {
    viewBox: '0 0 120 42',
    d: [
      'M6 12 H18 V28 H6 Z',
      'M9 8 V12 M15 8 V12 M9 28 V32 M15 28 V32',
      'M18 14 L94 17 V23 L18 26 Z',
      'M34 14.7 V25.3 M40 15 V25',
      'M94 17 H104 V23 H94',
    ],
    center: ['M1 20 H116'],
    dims: ['M6 37 H104', 'M6 34 V40 M104 34 V40'],
    labels: [[60, 10, 'РС-50']],
  },

  // Rescue helicopter (Ми-8 МТВ), side elevation.
  helicopter: {
    viewBox: '0 0 200 84',
    d: [
      'M30 40 C30 30 44 26 60 26 H120 C134 26 146 32 150 42 L152 50 H40 C34 50 30 46 30 40 Z',
      'M132 30 C140 31 146 36 148 42 H136 Z',
      'M64 32 H72 V38 H64 Z M80 32 H88 V38 H80 Z M96 32 H104 V38 H96 Z',
      'M112 30 V48 H124 V30',
      'M70 26 C72 18 112 18 118 26',
      'M94 18 V12',
      'M20 11 H170',
      'M90 9 H98 V13 H90 Z',
      'M34 34 L6 30 M34 44 L6 34',
      'M6 30 L2 18 H8 L11 31',
      'M5 14 V30',
      'M60 50 H100 V54 H60 Z',
      'M60 54 L54 62 M60 54 L66 62 M140 50 V62',
    ],
    circles: [
      [54, 64, 3],
      [66, 64, 3],
      [140, 64, 3],
    ],
    dims: ['M2 74 H170', 'M2 71 V77 M170 71 V77'],
    labels: [[86, 83, 'Ми-8 МТВ']],
  },

  // Conical fire bucket (ведро конусное) from a fire board.
  bucket: {
    viewBox: '0 0 60 84',
    d: ['M8 12 H52 V16 H8 Z', 'M10 16 L30 70 L50 16', 'M12 12 C12 0 48 0 48 12', 'M14 26 H46'],
    center: ['M30 2 V76'],
    labels: [[30, 82, 'ВЕДРО']],
  },

  // Hand-held radio (рация) with antenna, display and keypad.
  radio: {
    viewBox: '0 0 50 104',
    d: [
      'M10 30 H40 V92 H10 Z',
      'M16 30 V6 H20 V30',
      'M30 30 V24 H36 V30',
      'M15 36 H35 V48 H15 Z',
      'M15 56 H35 M15 60 H35 M15 64 H35 M15 68 H35',
      'M15 76 H21 V82 H15 Z M24 76 H30 V82 H24 Z M33 76 H35',
      'M8 46 V60',
    ],
    labels: [[25, 102, 'РАЦИЯ']],
  },

  // Sprinkler head (ороситель): thread, frame, glass bulb and deflector.
  sprinkler: {
    viewBox: '0 0 60 76',
    d: [
      'M24 2 H36 V14 H24 Z',
      'M24 5 H36 M24 8 H36 M24 11 H36',
      'M20 14 H40 V20 H20 Z',
      'M22 20 L26 50 M38 20 L34 50',
      'M30 22 C33 28 33 40 30 46 C27 40 27 28 30 22 Z',
      'M26 50 H34 M14 52 H46',
      'M14 56 L8 64 M22 56 L18 66 M30 56 V66 M38 56 L42 66 M46 56 L52 64',
    ],
    center: ['M30 0 V70'],
    labels: [[30, 75, 'ОРОСИТЕЛЬ']],
  },

  // Rescue boat (катер) on the water line.
  boat: {
    viewBox: '0 0 160 64',
    d: [
      'M10 30 H150 L138 48 H24 Z',
      'M10 30 L6 24 H40',
      'M70 30 V16 H110 L120 30',
      'M76 19 H86 V26 H76 Z M92 19 H104 V26 H92 Z',
      'M90 16 V8 M86 8 H94',
      'M20 38 H142',
      'M0 52 C10 48 20 56 30 52 C40 48 50 56 60 52 C70 48 80 56 90 52 C100 48 110 56 120 52 C130 48 140 56 150 52 L160 50',
    ],
    labels: [[80, 62, 'КАТЕР']],
  },
}

export function Silhouette({ kind }) {
  const art = SILHOUETTES[kind]
  return (
    <svg viewBox={art.viewBox} className="bg-sil-art">
      {art.center?.map((d, i) => (
        <path key={`m${i}`} d={d} className="sil-center" />
      ))}
      {art.dims?.map((d, i) => (
        <path key={`s${i}`} d={d} className="sil-dim" />
      ))}
      {art.d.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {art.circles?.map(([cx, cy, r], i) => (
        <circle key={`c${i}`} cx={cx} cy={cy} r={r} />
      ))}
      {art.labels?.map(([x, y, text], i) => (
        <text key={`t${i}`} x={x} y={y} className="sil-label">
          {text}
        </text>
      ))}
    </svg>
  )
}
