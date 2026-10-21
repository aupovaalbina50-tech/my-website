// 01 «Стабилизировать ЧС»: паводок под проливным дождём. Intro: storm over
// the valley → water rising between the houses → people waiting on a roof →
// the rescue boat and the sandbag line → hazard zone. Correct answers raise
// the barrier and lower the water; success: rain eases, water recedes.
import { glow, ground, makeRain, person, pool, rain, ring, vehicle, water, zone } from '../fx.js'
import { boat, house, sandbags } from '../props.js'
import { drawBackdrop, drawPost, introLerp, makeBackdrop, outcomeK, pulseK } from './common.js'

const HORIZON = 560
const GROUND = 660
const MOOD = 'storm'

export default {
  id: 'stabilize-emergency',
  startThreat: 0.5,
  shots: {
    intro: [
      { t: 0, x: 800, y: 330, z: 1.0 },
      { t: 3.5, x: 820, y: 480, z: 1.15 },
      { t: 7, x: 560, y: 560, z: 1.7 },
      { t: 10, x: 1030, y: 640, z: 1.6 },
      { t: 12.5, x: 800, y: 595, z: 1.37 },
    ],
    idle: { x: 800, y: 595, z: 1.37 },
    outcome: [
      { t: 0, x: 800, y: 595, z: 1.37 },
      { t: 3, x: 640, y: 560, z: 1.35 },
      { t: 6, x: 800, y: 555, z: 1.26 },
    ],
  },
  introDuration: 13,
  // Brief: the part of the scene kept left of the task panel.
  briefX: 620,
  captions: [{ t: 1, key: 'type' }, { t: 4, key: 'place' }, { t: 7.2, key: 'situation' }, { t: 10.2, key: 'task' }],
  focusPoint: { x: 560, y: 560 },
  hotspots: [
    { id: 'roof', x: 560, y: GROUND - 150, z: 2.1 },
    { id: 'barrier', x: 1050, y: GROUND + 10, z: 2.0 },
    { id: 'boat', x: 760, y: GROUND + 60, z: 2.0 },
    { id: 'zone', x: 700, y: GROUND + 40, z: 1.5 },
  ],
  setup() {
    return { bd: makeBackdrop(1, { horizon: HORIZON, starsN: 0, cloudsN: 16 }), rain: makeRain(420, 1600, 900), flash: 0 }
  },
  update(rd, dt) {
    const { state, data, particles: P } = rd
    const threat = state.phase === 'intro' && !state.reducedMotion ? Math.max(state.threat, introLerp(state, 0, 6, 0.25, 0.85)) : state.threat
    data.threat = threat
    data.flash = Math.max(0, data.flash - dt * 3)
    if (Math.random() < dt * 0.12 * threat && state.quality !== 'lite') data.flash = 1
    if (pulseK(state) > 0.2) P.stream('splash', 40, dt, 1050, GROUND - 4, { spreadX: 60 })
    P.stream('mist', 3 * threat, dt, 800, GROUND + 20, { spreadX: 700, layer: 'near', scale: 1.4 })
  },
  draw(rd) {
    const { ctx, state, data, particles: P } = rd
    const t = state.t
    const threat = data.threat ?? state.threat
    const oc = outcomeK(state, 5)
    const level = GROUND - 20 - threat * 90
    drawBackdrop(rd, data.bd, MOOD, { starA: 0, city: true })
    if (data.flash > 0) rd.screen(() => {
      ctx.fillStyle = `rgba(200,220,255,${data.flash * 0.25})`
      ctx.fillRect(0, 0, rd.vw, rd.vh)
    })
    rd.layer(0.7, () => {
      house(ctx, 160, HORIZON + 60, 140, 80, { wall: '#3a4556' })
      house(ctx, 1300, HORIZON + 60, 160, 90, { wall: '#364152', lit: false })
      P.draw(ctx, 'mid')
    })
    rd.layer(1, () => {
      ground(ctx, 1600, GROUND - 60, { road: false, color: '#1a2330' })
      house(ctx, 470, GROUND - 40, 190, 120, { wall: '#465265', lit: false })
      house(ctx, 760, GROUND - 40, 150, 100, { wall: '#3e4a5c' })
      house(ctx, 1200, GROUND - 40, 170, 110, { wall: '#424e60' })
      // people waiting on the roof (until rescued)
      const rescued = state.outcome === 'success' ? oc : 0
      if (rescued < 0.6) {
        person(ctx, 545, GROUND - 205, { kind: 'civil', t, pose: 'wave' })
        person(ctx, 570, GROUND - 200, { kind: 'civil2', t, scale: 0.85 })
      }
      // barrier of sandbags, raised by correct answers
      const built = Math.min(1, 0.35 + (1 - threat) * 0.8 + pulseK(state) * 0.1)
      sandbags(ctx, 960, GROUND + 6, 8, 3, built)
      person(ctx, 940, GROUND + 4, { kind: 'rescuer', t, walking: state.phase !== 'intro' })
      person(ctx, 1180, GROUND + 4, { kind: 'rescuer', t, flip: true })
      vehicle(ctx, 'rescue', 1380, GROUND + 6, { t, flip: true, lights: false })
      // water
      water(ctx, 1600, level, t, { lights: [{ x: 1350, rgb: '255,60,60', a: 0.3 }, { x: 1366, rgb: '70,140,255', a: 0.3 }] })
      const bx = introLerp(state, 7, 11, 200, 760) + Math.sin(t * 0.3) * 20
      boat(ctx, bx, level + 8, t)
      person(ctx, bx - 10, level - 4, { kind: 'rescuer', t, scale: 0.9 })
      if (rescued >= 0.6) person(ctx, bx + 20, level - 4, { kind: 'civil', t, scale: 0.85 })
      glow(ctx, bx + 50, level - 10, 40, '255,240,210', 0.4)
      zone(ctx, 700, GROUND + 40, 420, 60, t, { rgb: state.outcome === 'success' ? '96,200,255' : '255,110,64', a: Math.min(1, introLerp(state, 10, 11.5, 0, 1)) * (1 - 0.4 * oc) })
      for (const p of state.pulses) ring(ctx, 1050, GROUND, p.t / p.life, p.kind === 'action' ? '110,200,255' : '255,150,70')
      pool(ctx, 800, GROUND + 40, 600, 60, '120,160,210', 0.1)
      P.draw(ctx, 'near')
    })
    // rain in screen space
    const rainA = state.outcome === 'success' ? 0.38 * (1 - oc * 0.8) : 0.38
    rd.screen(() => rain(ctx, data.rain, state.paused ? 0 : 1 / 60, rd.vw, rd.vh, rainA * (0.5 + threat * 0.6)))
    drawPost(rd, MOOD, { desaturate: state.outcome === 'fail' ? 0.3 * oc : 0 })
  },
}
