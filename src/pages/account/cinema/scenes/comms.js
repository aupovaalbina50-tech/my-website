// 09 «Обеспечить связь»: гроза, повреждённая вышка связи искрит, посёлок
// без связи. Intro: storm over the hills → the damaged tower, sparks →
// dark houses without signal → the mobile communications unit raising its
// mast → coverage zone. Correct answers restore links one by one (waves
// reach the houses, windows light up); success: full coverage.
import { glow, ground, lattice, makeRain, person, rain, ring, vehicle, zone } from '../fx.js'
import { house, waves } from '../props.js'
import { drawBackdrop, drawPost, introLerp, makeBackdrop, outcomeK, pulseK } from './common.js'

const HORIZON = 570
const GROUND = 690
const MOOD = 'storm'
const HOUSES = [150, 330, 1250, 1420]

export default {
  id: 'ensure-communications',
  startThreat: 0.6,
  shots: {
    intro: [
      { t: 0, x: 800, y: 360, z: 1.0 },
      { t: 3.5, x: 720, y: 400, z: 1.6 },
      { t: 7, x: 300, y: 600, z: 1.5 },
      { t: 10, x: 1000, y: 600, z: 1.6 },
      { t: 12.5, x: 800, y: 595, z: 1.32 },
    ],
    idle: { x: 800, y: 595, z: 1.32 },
    outcome: [
      { t: 0, x: 800, y: 595, z: 1.32 },
      { t: 3, x: 1000, y: 520, z: 1.4 },
      { t: 6, x: 800, y: 575, z: 1.22 },
    ],
  },
  introDuration: 13,
  // Brief: the part of the scene kept left of the task panel.
  briefX: 820,
  captions: [{ t: 1, key: 'type' }, { t: 4, key: 'place' }, { t: 7.2, key: 'situation' }, { t: 10.2, key: 'task' }],
  focusPoint: { x: 720, y: 400 },
  hotspots: [
    { id: 'tower', x: 720, y: GROUND - 300, z: 1.9 },
    { id: 'unit', x: 1000, y: GROUND - 80, z: 2.0 },
    { id: 'subscribers', x: 300, y: GROUND - 60, z: 1.9 },
    { id: 'zone', x: 800, y: GROUND + 40, z: 1.4 },
  ],
  setup() {
    return { bd: makeBackdrop(9, { horizon: HORIZON, starsN: 0, cloudsN: 16 }), rain: makeRain(360, 1600, 900), flash: 0, restored: 0 }
  },
  update(rd, dt) {
    const { state, data, particles: P } = rd
    const threat = state.phase === 'intro' && !state.reducedMotion ? Math.max(state.threat, 0.8) : state.threat
    data.threat = threat
    const target = state.outcome === 'success' ? 1 : state.phase === 'intro' ? 0 : Math.min(0.9, 1 - threat)
    data.restored += (target - data.restored) * Math.min(1, dt * 0.8)
    data.flash = Math.max(0, data.flash - dt * 3)
    if (Math.random() < dt * 0.15 * threat && state.quality !== 'lite') data.flash = 1
    if (threat > 0.2 && Math.random() < dt * 4 * threat) P.stream('spark', 40, 0.1, 760, GROUND - 330)
  },
  draw(rd) {
    const { ctx, state, data, particles: P } = rd
    const t = state.t
    const threat = data.threat ?? state.threat
    const oc = outcomeK(state, 5)
    drawBackdrop(rd, data.bd, MOOD, { starA: 0 })
    if (data.flash > 0) rd.screen(() => {
      ctx.fillStyle = `rgba(200,220,255,${data.flash * 0.28})`
      ctx.fillRect(0, 0, rd.vw, rd.vh)
    })
    rd.layer(1, () => {
      ground(ctx, 1600, GROUND - 40, { roadY: GROUND + 20, roadH: 90, wet: true, color: '#18212d' })
      lattice(ctx, 720, GROUND - 40, 380, 70, '#6a7888', threat * 0.5)
      glow(ctx, 760, GROUND - 330, 50, '255,226,150', threat * (Math.random() < 0.3 ? 0.9 : 0.2))
      HOUSES.forEach((x, i) => {
        const on = data.restored * HOUSES.length > i + 0.3
        house(ctx, x, GROUND - 40, 140, 90, { wall: '#3f4b5d', lit: on })
      })
      // mobile comms unit raising its mast
      vehicle(ctx, 'comms', 1000, GROUND + 4, { t, flip: true, lights: false })
      const mast = state.phase === 'intro' ? introLerp(state, 8, 11, 0, 1) : 1
      ctx.fillStyle = '#c3ccd6'
      ctx.fillRect(1030, GROUND - 60 - 200 * mast, 5, 200 * mast)
      glow(ctx, 1032, GROUND - 64 - 200 * mast, 18, '255,60,60', 0.8)
      if (mast > 0.95) {
        const a = 0.3 + data.restored * 0.7 + pulseK(state) * 0.5
        waves(ctx, 1032, GROUND - 270, t, a)
        // links to the houses
        HOUSES.forEach((x, i) => {
          if (data.restored * HOUSES.length <= i) return
          ctx.strokeStyle = 'rgba(120,210,255,0.35)'
          ctx.lineWidth = 1.5
          ctx.setLineDash([6, 8])
          ctx.lineDashOffset = -t * 30
          ctx.beginPath()
          ctx.moveTo(1032, GROUND - 260)
          ctx.quadraticCurveTo((1032 + x) / 2, GROUND - 360, x + 70, GROUND - 150)
          ctx.stroke()
          ctx.setLineDash([])
        })
      }
      person(ctx, 960, GROUND, { kind: 'rescuer', t, pose: 'point', flip: true })
      person(ctx, 700, GROUND - 40, { kind: 'rescuer', t })
      zone(ctx, 800, GROUND + 40, 680, 70, t, { rgb: data.restored > 0.95 ? '96,200,255' : '255,180,70', a: Math.min(1, introLerp(state, 10, 11.5, 0, 1)) * 0.8 })
      for (const p of state.pulses) ring(ctx, 1032, GROUND - 40, p.t / p.life, p.kind === 'action' ? '110,200,255' : '255,150,70')
      P.draw(ctx, 'near')
    })
    rd.screen(() => rain(ctx, data.rain, state.paused ? 0 : 1 / 60, rd.vw, rd.vh, 0.32 * (0.4 + threat * 0.6) * (state.outcome === 'success' ? 1 - oc * 0.7 : 1)))
    drawPost(rd, MOOD, { desaturate: state.outcome === 'fail' ? 0.3 * oc : 0 })
  },
}
