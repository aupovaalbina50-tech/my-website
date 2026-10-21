// 05 «Организовать реагирование»: оперативный штаб у пожара на складе.
// Intro: dusk, smoke column over a warehouse → the incident command post
// (command vehicle, tent, mast lights) → a convoy of forces on the access
// road → sectors on the scheme. Correct answers send units to their sectors
// (beam to the sector, unit moves); success: all sectors manned, fire down.
import { beam, glow, ground, person, ring, vehicle, zone, mistBand } from '../fx.js'
import { shed, tent } from '../props.js'
import { drawBackdrop, drawForeground, drawPost, drawTrees, introLerp, makeBackdrop, outcomeK, pulseK } from './common.js'

const HORIZON = 590
const GROUND = 690
const MOOD = 'dusk'

export default {
  id: 'organize-response',
  startThreat: 0.55,
  shots: {
    intro: [
      { t: 0, x: 800, y: 360, z: 1.0 },
      { t: 3.5, x: 520, y: 480, z: 1.4 },
      { t: 7, x: 1150, y: 620, z: 1.7 },
      { t: 10, x: 760, y: 640, z: 1.5 },
      { t: 12.5, x: 800, y: 605, z: 1.34 },
    ],
    idle: { x: 800, y: 605, z: 1.34 },
    outcome: [
      { t: 0, x: 800, y: 605, z: 1.34 },
      { t: 3, x: 520, y: 520, z: 1.4 },
      { t: 6, x: 800, y: 575, z: 1.25 },
    ],
  },
  introDuration: 13,
  // Brief: the part of the scene kept left of the task panel.
  briefX: 760,
  captions: [{ t: 1, key: 'type' }, { t: 4, key: 'place' }, { t: 7.2, key: 'situation' }, { t: 10.2, key: 'task' }],
  focusPoint: { x: 1150, y: 620 },
  hotspots: [
    { id: 'hq', x: 1160, y: GROUND - 30, z: 2.1 },
    { id: 'seat', x: 500, y: GROUND - 160, z: 1.9 },
    { id: 'sectors', x: 620, y: GROUND + 40, z: 1.6 },
    { id: 'convoy', x: 900, y: GROUND + 70, z: 1.9 },
  ],
  setup() {
    return { bd: makeBackdrop(5, { horizon: HORIZON }), sent: 0 }
  },
  update(rd, dt) {
    const { state, data, particles: P } = rd
    const threat = state.phase === 'intro' && !state.reducedMotion ? Math.max(state.threat, introLerp(state, 0, 5, 0.5, 0.9)) : state.threat
    data.threat = threat
    const target = state.outcome === 'success' ? 1 : state.phase === 'intro' ? 0 : Math.min(0.95, 1 - threat)
    data.sent += (target - data.sent) * Math.min(1, dt * 0.8)
    P.stream('smoke', 6 * threat, dt, 500, GROUND - 200, { spreadX: 90, wind: 26, scale: 1.4 })
    P.stream('fire', 50 * threat, dt, 500, GROUND - 168, { spreadX: 110, spreadY: 4, scale: 1.1 })
    P.stream('ember', 3 * threat, dt, 500, GROUND - 180, { spreadX: 80, wind: 30 })
    if (data.sent > 0.2) P.stream('steam', 5 * data.sent, dt, 500, GROUND - 170, { spreadX: 100, wind: 20 })
  },
  draw(rd) {
    const { ctx, state, data, particles: P } = rd
    const t = state.t
    const threat = data.threat ?? state.threat
    const oc = outcomeK(state, 5)
    drawBackdrop(rd, data.bd, MOOD, { glowRgb: '255,120,50', glowA: threat * 0.8, starA: 0.5, cloudLight: threat * 0.4 })
    drawTrees(rd, [[200, GROUND - 40, 120], [880, GROUND - 40, 110], [1480, GROUND - 40, 140]], 0.82, '#1c3428')
    rd.layer(0.9, () => mistBand(ctx, 1600, GROUND - 30, 70))
    rd.layer(1, () => {
      ground(ctx, 1600, GROUND - 40, { roadY: GROUND + 30, roadH: 90, color: '#18202c' })
      shed(ctx, 300, GROUND - 40, 420, 130, '#3c4757')
      glow(ctx, 500, GROUND - 170, 320, '255,120,40', 0.55 * threat)
      // command post: vehicle with mast lights, tent, commander
      vehicle(ctx, 'command', 1220, GROUND - 12, { t, flip: true })
      tent(ctx, 1020, GROUND - 40, 150, 70, { color: '#2f5d8a', glowOn: 1 })
      beam(ctx, 1260, GROUND - 120, Math.PI + 0.25, 520, 0.12, '230,240,255', 0.18)
      glow(ctx, 1260, GROUND - 120, 26, '240,246,255', 0.8)
      person(ctx, 1090, GROUND - 40, { kind: 'firefighter', t, pose: 'point', flip: true })
      person(ctx, 1130, GROUND - 40, { kind: 'police', t, flip: true })
      // sectors on the ground near the warehouse
      const secA = Math.min(1, introLerp(state, 9.5, 11, 0, 1))
      for (let i = 0; i < 3; i++) {
        const done = data.sent > (i + 1) / 3.2
        zone(ctx, 360 + i * 150, GROUND + 40, 66, 22, t + i, { rgb: done ? '96,200,255' : '255,180,70', a: secA * 0.9 })
      }
      // convoy arriving and then going to sectors
      const conv = introLerp(state, 5, 10, 1700, 860)
      const moving = state.phase === 'intro' && state.phaseT > 5 && state.phaseT < 10
      for (let i = 0; i < 3; i++) {
        const go = Math.min(1, Math.max(0, data.sent * 3 - i))
        const x = conv + i * 170 - go * (conv + i * 170 - (380 + i * 150))
        vehicle(ctx, i === 1 ? 'tanker' : i === 2 ? 'rescue' : 'fire', x, GROUND + 80, { t, flip: true, moving: moving || (go > 0 && go < 1) })
      }
      zone(ctx, 500, GROUND + 10, 330, 70, t, { rgb: state.outcome === 'success' ? '96,200,255' : '255,110,64', a: secA * 0.5 * (1 - 0.3 * oc) })
      for (const p of state.pulses) ring(ctx, 620, GROUND + 40, p.t / p.life, p.kind === 'action' ? '110,200,255' : '255,150,70')
      if (pulseK(state) > 0) beam(ctx, 1020, GROUND - 60, Math.PI + 0.05, 500, 0.06, '110,200,255', 0.35 * pulseK(state))
      P.draw(ctx, 'near')
    })
    drawForeground(rd, data.bd, 'street')
    drawPost(rd, MOOD, { desaturate: state.outcome === 'fail' ? 0.3 * oc : 0 })
  },
}
