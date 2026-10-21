// 03 «Локализовать аварию»: утечка с ёмкости на промышленной площадке.
// Intro: wide plant at dusk with stacks → the leaking tank, a drifting gas
// cloud → workers leaving → hazmat crew and a water-curtain monitor → the
// danger zone. Correct answers strengthen the water curtain and shrink the
// cloud; success: the leak is shut off, the zone turns to «controlled».
import { glow, ground, lamp, person, pipe, ring, tank, vehicle, zone, mistBand } from '../fx.js'
import { shed, stack } from '../props.js'
import { drawBackdrop, drawForeground, drawPost, drawTrees, introLerp, makeBackdrop, outcomeK, pulseK } from './common.js'

const HORIZON = 580
const GROUND = 680
const MOOD = 'overcast'

export default {
  id: 'contain-accident',
  startThreat: 0.5,
  shots: {
    intro: [
      { t: 0, x: 800, y: 380, z: 1.0 },
      { t: 3.5, x: 760, y: 460, z: 1.15 },
      { t: 7, x: 690, y: 520, z: 1.85 },
      { t: 10, x: 980, y: 620, z: 1.6 },
      { t: 12.5, x: 800, y: 595, z: 1.37 },
    ],
    idle: { x: 800, y: 595, z: 1.37 },
    outcome: [
      { t: 0, x: 800, y: 595, z: 1.37 },
      { t: 3, x: 690, y: 540, z: 1.5 },
      { t: 6, x: 800, y: 575, z: 1.26 },
    ],
  },
  introDuration: 13,
  // Brief: the part of the scene kept left of the task panel.
  briefX: 760,
  captions: [{ t: 1, key: 'type' }, { t: 4, key: 'place' }, { t: 7.2, key: 'situation' }, { t: 10.2, key: 'task' }],
  focusPoint: { x: 690, y: 520 },
  hotspots: [
    { id: 'leak', x: 700, y: GROUND - 120, z: 2.2 },
    { id: 'curtain', x: 980, y: GROUND - 30, z: 2.0 },
    { id: 'zone', x: 760, y: GROUND + 40, z: 1.5 },
    { id: 'wind', x: 1150, y: GROUND - 180, z: 1.8 },
  ],
  setup() {
    return { bd: makeBackdrop(3, { horizon: HORIZON, starsN: 0, cloudsN: 12 }) }
  },
  update(rd, dt) {
    const { state, data, particles: P } = rd
    const threat = state.phase === 'intro' && !state.reducedMotion ? Math.max(state.threat, introLerp(state, 1, 7, 0.2, 0.9)) : state.threat
    data.threat = threat
    // gas leaking from the tank flange, drifting downwind
    P.stream('gas', 4.5 * threat, dt, 708, GROUND - 120, { spreadX: 6, spreadY: 6, scale: 0.7 + threat * 0.8 })
    // hissing jet at the flange
    if (threat > 0.15) P.stream('mist', 14 * threat, dt, 712, GROUND - 120, { vx: 90, vy: -10, scale: 0.4 })
    // water curtain from the monitor
    const curtain = state.phase === 'intro' ? (state.phaseT > 9.5 ? 0.5 : 0) : 0.4 + pulseK(state) * 0.6 + (state.outcome === 'success' ? 0.4 : 0)
    data.curtain = curtain
    if (curtain > 0) {
      for (let i = 0; i < 3; i++) P.stream('water', 32 * curtain, dt, 1000, GROUND - 40, { vx: -160 - i * 50 + (Math.random() - 0.5) * 40, vy: -330 - Math.random() * 60, scale: 1.1 })
      P.stream('mist', 6 * curtain, dt, 860, GROUND - 120, { spreadX: 60, spreadY: 50 })
    }
    P.stream('smokeLight', 1.2, dt, 1260, GROUND - 330, { layer: 'mid', scale: 0.8 })
  },
  draw(rd) {
    const { ctx, state, data, particles: P } = rd
    const t = state.t
    const threat = data.threat ?? state.threat
    const oc = outcomeK(state, 5)
    drawBackdrop(rd, data.bd, MOOD, { starA: 0, city: false })
    rd.layer(0.6, () => {
      shed(ctx, 80, HORIZON + 60, 360, 120)
      stack(ctx, 1260, HORIZON + 60, 300)
      stack(ctx, 1320, HORIZON + 60, 240, 20)
      shed(ctx, 1380, HORIZON + 60, 300, 100, '#36414f')
      P.draw(ctx, 'mid')
    })
    drawTrees(rd, [[1160, HORIZON + 60, 110], [40, HORIZON + 60, 130]], 0.82, '#1f3428')
    rd.layer(0.9, () => mistBand(ctx, 1600, GROUND - 30, 70))
    rd.layer(1, () => {
      ground(ctx, 1600, GROUND - 40, { roadY: GROUND + 10, roadH: 90, color: '#1b2230' })
      // pipe rack
      ctx.fillStyle = '#4a5564'
      for (let x = 420; x < 1200; x += 120) ctx.fillRect(x, GROUND - 160, 8, 120)
      pipe(ctx, 380, GROUND - 160, 1220, GROUND - 160, 10)
      pipe(ctx, 380, GROUND - 140, 1220, GROUND - 140, 7, '#6a7888')
      tank(ctx, 470, GROUND - 40, 130, 210, { label: 'Е-1' })
      tank(ctx, 620, GROUND - 40, 150, 250, { color: '#c2ccd6', label: 'Е-2' })
      tank(ctx, 1070, GROUND - 40, 120, 180, { label: 'Е-3' })
      // the damaged flange: a warning light while leaking
      const leak = threat > 0.1 ? 1 : 0
      glow(ctx, 712, GROUND - 120, 40, '255,90,60', 0.5 * leak * (0.6 + 0.4 * Math.sin(t * 6)))
      lamp(ctx, 380, GROUND - 40)
      lamp(ctx, 1240, GROUND - 40)
      // workers leaving during the intro
      const leave = introLerp(state, 3, 9, 0, 1)
      if (leave < 1) {
        person(ctx, 820 + leave * 420, GROUND + 30, { kind: 'civil', t, walking: true })
        person(ctx, 800 + leave * 440, GROUND + 36, { kind: 'civil3', t, walking: true })
      }
      // hazmat crew and the monitor
      const arrive = introLerp(state, 5, 9.5, -300, 1240)
      vehicle(ctx, 'hazmat', arrive, GROUND + 66, { t, moving: state.phase === 'intro' && state.phaseT > 5 && state.phaseT < 9.5 })
      vehicle(ctx, 'fire', 1420, GROUND + 70, { t, flip: true, lights: false })
      ctx.fillStyle = '#9aa6b4'
      ctx.fillRect(994, GROUND - 46, 14, 12)
      if (state.phase !== 'intro' || state.phaseT > 9.5) {
        person(ctx, 1020, GROUND - 30, { kind: 'hazmat', t, pose: 'hose', flip: true })
        person(ctx, 900, GROUND - 30, { kind: 'hazmat', t, pose: 'point', flip: true })
      }
      const zoneRgb = state.outcome === 'success' ? '96,200,255' : '255,110,64'
      zone(ctx, 760, GROUND + 40, 380 * (0.6 + threat * 0.5), 60, t, { rgb: zoneRgb, a: Math.min(1, introLerp(state, 10, 11.5, 0, 1)) * (1 - 0.3 * oc) })
      for (const p of state.pulses) ring(ctx, 760, GROUND + 30, p.t / p.life, p.kind === 'action' ? '110,200,255' : '255,150,70')
      P.draw(ctx, 'near')
    })
    drawForeground(rd, data.bd, 'street')
    drawPost(rd, MOOD, { desaturate: state.outcome === 'fail' ? 0.3 * oc : 0 })
  },
}
