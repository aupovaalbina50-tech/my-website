// 07 «Восстановить объект»: частичное обрушение здания, пыль, завал.
// Intro: overcast morning, a damaged building with a collapsed section →
// dust settling → rescuers on the rubble, cutting sparks → the crane and
// the safety perimeter. Correct answers clear the rubble and raise the
// shored section; success: dust gone, structure secured.
import { building, ground, lamp, person, ring, seeded, vehicle, zone, mistBand } from '../fx.js'
import { crane, rubble } from '../props.js'
import { drawBackdrop, drawForeground, drawPost, drawTrees, introLerp, makeBackdrop, outcomeK, pulseK } from './common.js'

const HORIZON = 580
const GROUND = 690
const MOOD = 'overcast'

export default {
  id: 'restore-facility',
  startThreat: 0.55,
  shots: {
    intro: [
      { t: 0, x: 800, y: 360, z: 1.0 },
      { t: 3.5, x: 700, y: 480, z: 1.3 },
      { t: 7, x: 640, y: 600, z: 1.9 },
      { t: 10, x: 1000, y: 460, z: 1.4 },
      { t: 12.5, x: 800, y: 595, z: 1.34 },
    ],
    idle: { x: 800, y: 595, z: 1.34 },
    outcome: [
      { t: 0, x: 800, y: 595, z: 1.34 },
      { t: 3, x: 660, y: 520, z: 1.45 },
      { t: 6, x: 800, y: 565, z: 1.25 },
    ],
  },
  introDuration: 13,
  // Brief: the part of the scene kept left of the task panel.
  briefX: 680,
  captions: [{ t: 1, key: 'type' }, { t: 4, key: 'place' }, { t: 7.2, key: 'situation' }, { t: 10.2, key: 'task' }],
  focusPoint: { x: 640, y: 600 },
  hotspots: [
    { id: 'rubble', x: 640, y: GROUND - 60, z: 2.1 },
    { id: 'cutting', x: 560, y: GROUND - 90, z: 2.3 },
    { id: 'crane', x: 1050, y: GROUND - 300, z: 1.6 },
    { id: 'zone', x: 680, y: GROUND + 40, z: 1.5 },
  ],
  setup() {
    return { bd: makeBackdrop(7, { horizon: HORIZON, starsN: 0, cloudsN: 12 }) }
  },
  update(rd, dt) {
    const { state, data, particles: P } = rd
    const threat = state.phase === 'intro' && !state.reducedMotion ? Math.max(state.threat, introLerp(state, 0, 4, 1, 0.6)) : state.threat
    data.threat = threat
    P.stream('dust', 9 * threat, dt, 650, GROUND - 60, { spreadX: 130, spreadY: 30, scale: 1.2 })
    const cutting = state.phase !== 'intro' || state.phaseT > 7
    if (cutting && state.outcome !== 'success') P.stream('spark', 50 * (0.4 + pulseK(state)), dt, 560, GROUND - 92, { spreadX: 3 })
  },
  draw(rd) {
    const { ctx, state, data, particles: P } = rd
    const t = state.t
    const threat = data.threat ?? state.threat
    const oc = outcomeK(state, 5)
    const cleared = 1 - threat
    drawBackdrop(rd, data.bd, MOOD, { starA: 0 })
    drawTrees(rd, [[200, GROUND - 40, 120], [1500, GROUND - 40, 140]], 0.82, '#22392c')
    rd.layer(0.9, () => mistBand(ctx, 1600, GROUND - 30, 70))
    rd.layer(1, () => {
      ground(ctx, 1600, GROUND - 40, { roadY: GROUND + 20, roadH: 90, color: '#1d2430' })
      // the damaged building: right part stands, left section collapsed
      building(ctx, { x: 720, y: GROUND - 40, w: 220, h: 320, depth: 30, floors: 6, cols: 4, wall: '#4a5466', lit: 0.1 }, t)
      const shored = Math.min(1, cleared * 1.2)
      ctx.fillStyle = '#525c6c'
      ctx.beginPath()
      ctx.moveTo(500, GROUND - 40)
      ctx.lineTo(500, GROUND - 40 - 120 - 140 * shored)
      ctx.lineTo(600, GROUND - 40 - 160 - 120 * shored)
      ctx.lineTo(720, GROUND - 40 - 320)
      ctx.lineTo(720, GROUND - 40)
      ctx.closePath()
      ctx.fill()
      // shoring props
      ctx.strokeStyle = '#c9a24a'
      ctx.lineWidth = 5
      for (let i = 0; i < Math.round(shored * 4); i++) {
        ctx.beginPath()
        ctx.moveTo(470 + i * 40, GROUND - 40)
        ctx.lineTo(520 + i * 40, GROUND - 160 - i * 20)
        ctx.stroke()
      }
      rubble(ctx, 470, GROUND - 40, 330 * (0.45 + 0.55 * threat), 90 * (0.4 + 0.6 * threat), seeded(77))
      crane(ctx, 1080, GROUND - 40, 440, Math.sin(t * 0.2) * 0.04 - 0.3 * cleared, 180 + 60 * Math.sin(t * 0.4))
      lamp(ctx, 380, GROUND - 40)
      vehicle(ctx, 'rescue', 300, GROUND + 70, { t })
      vehicle(ctx, 'ambulance', 1320, GROUND + 70, { t, flip: true, lights: false })
      const arrive = state.phase === 'intro' ? introLerp(state, 5, 8, 0, 1) : 1
      if (arrive > 0.5) {
        person(ctx, 560, GROUND - 90, { kind: 'rescuer', t, pose: 'hose' })
        person(ctx, 640, GROUND - 100, { kind: 'rescuer', t, pose: 'point' })
        person(ctx, 700, GROUND - 60, { kind: 'rescuer', t, walking: true })
        person(ctx, 860, GROUND + 30, { kind: 'firefighter', t, flip: true })
      }
      zone(ctx, 680, GROUND + 40, 340, 60, t, { rgb: state.outcome === 'success' ? '96,200,255' : '255,180,70', a: Math.min(1, introLerp(state, 10, 11.5, 0, 1)) * (1 - 0.3 * oc) })
      for (const p of state.pulses) ring(ctx, 640, GROUND - 20, p.t / p.life, p.kind === 'action' ? '110,200,255' : '255,150,70')
      P.draw(ctx, 'near')
    })
    drawForeground(rd, data.bd, 'street')
    drawPost(rd, MOOD, { desaturate: state.outcome === 'fail' ? 0.3 * oc : 0 })
  },
}
