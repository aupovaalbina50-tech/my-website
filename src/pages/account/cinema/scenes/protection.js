// 06 «Защитить население»: сигнал оповещения, облако с промзоны вдали.
// Intro: overcast town → a cloud drifts from the industrial area on the
// horizon → sirens sound («Внимание всем!») → residents move to the
// protective structure, a rescuer at the entrance → the threat zone.
// Correct answers bring groups inside; success: the door closes, the zone
// around the town is marked protected.
import { ground, person, ring, vehicle, zone } from '../fx.js'
import { house, shelter, siren, stack } from '../props.js'
import { drawBackdrop, drawPost, introLerp, makeBackdrop, outcomeK } from './common.js'

const HORIZON = 570
const GROUND = 690
const MOOD = 'overcast'

export default {
  id: 'protect-population',
  startThreat: 0.6,
  shots: {
    intro: [
      { t: 0, x: 800, y: 380, z: 1.0 },
      { t: 3.5, x: 280, y: 480, z: 1.5 },
      { t: 6.5, x: 1150, y: 520, z: 1.6 },
      { t: 9.5, x: 920, y: 640, z: 1.7 },
      { t: 12.5, x: 800, y: 605, z: 1.34 },
    ],
    idle: { x: 800, y: 605, z: 1.34 },
    outcome: [
      { t: 0, x: 800, y: 605, z: 1.34 },
      { t: 3, x: 920, y: 620, z: 1.6 },
      { t: 6, x: 800, y: 575, z: 1.25 },
    ],
  },
  introDuration: 13,
  // Brief: the part of the scene kept left of the task panel.
  briefX: 860,
  captions: [{ t: 1, key: 'type' }, { t: 4, key: 'place' }, { t: 7.2, key: 'situation' }, { t: 10.2, key: 'task' }],
  focusPoint: { x: 920, y: 620 },
  hotspots: [
    { id: 'siren', x: 1150, y: GROUND - 220, z: 2.0 },
    { id: 'shelter', x: 940, y: GROUND - 40, z: 2.1 },
    { id: 'cloud', x: 260, y: HORIZON - 40, z: 1.8 },
    { id: 'zone', x: 700, y: GROUND + 40, z: 1.5 },
  ],
  setup() {
    return { bd: makeBackdrop(6, { horizon: HORIZON, starsN: 0, cloudsN: 12 }), inside: 0 }
  },
  update(rd, dt) {
    const { state, data, particles: P } = rd
    const threat = state.phase === 'intro' && !state.reducedMotion ? Math.max(state.threat, introLerp(state, 0, 6, 0.3, 0.85)) : state.threat
    data.threat = threat
    const target = state.outcome === 'success' ? 1 : state.phase === 'intro' ? introLerp(state, 9, 12.5, 0, 0.12) : Math.min(0.9, 1 - threat)
    data.inside += (target - data.inside) * Math.min(1, dt * 0.8)
    P.stream('gas', 4 * threat, dt, 240, HORIZON - 30, { spreadX: 40, layer: 'mid', scale: 1.6 })
  },
  draw(rd) {
    const { ctx, state, data, particles: P } = rd
    const t = state.t
    const threat = data.threat ?? state.threat
    const oc = outcomeK(state, 5)
    drawBackdrop(rd, data.bd, MOOD, { starA: 0, city: false })
    rd.layer(0.5, () => {
      stack(ctx, 200, HORIZON + 30, 160, 18)
      stack(ctx, 250, HORIZON + 30, 120, 14)
      P.draw(ctx, 'mid')
    })
    rd.layer(1, () => {
      ground(ctx, 1600, GROUND - 40, { roadY: GROUND + 20, roadH: 90, color: '#1c2531' })
      house(ctx, 120, GROUND - 40, 170, 100, { wall: '#465265' })
      house(ctx, 330, GROUND - 40, 150, 90, { wall: '#3e4a5c' })
      house(ctx, 1330, GROUND - 40, 170, 100, { wall: '#424e60' })
      const alarm = state.phase !== 'intro' || state.phaseT > 6
      siren(ctx, 1150, GROUND - 40, t, alarm && state.outcome !== 'success' ? 1 : 0)
      shelter(ctx, 940, GROUND - 40, state.outcome === 'success' ? 1 - Math.min(1, oc * 1.6) : 1)
      person(ctx, 1010, GROUND - 40, { kind: 'rescuer', t, pose: 'point', flip: true })
      vehicle(ctx, 'police', 640, GROUND + 100, { t })
      // residents walking from the houses into the shelter
      const N = 14
      for (let i = 0; i < N; i++) {
        const share = i / N
        const k = Math.min(1, Math.max(0, (data.inside - share * 0.85) * 3))
        if (k >= 1) continue
        const startX = 200 + (i % 3) * 120
        const walking = alarm && k > 0
        const x = startX + (930 - startX) * (alarm ? Math.max(k, Math.min(0.25, ((t * 0.03 + share) % 0.25))) : 0)
        person(ctx, x, GROUND - 30 + (i % 4) * 8, { kind: ['civil', 'civil2', 'civil3'][i % 3], t: t + i, walking, scale: i % 5 === 0 ? 0.75 : 0.95 })
      }
      const zoneRgb = state.outcome === 'success' ? '96,200,255' : '255,110,64'
      zone(ctx, 700, GROUND + 40, 640, 64, t, { rgb: zoneRgb, a: Math.min(1, introLerp(state, 10, 11.5, 0, 1)) * (0.7 + 0.3 * threat) * (1 - 0.3 * oc) })
      for (const p of state.pulses) ring(ctx, 940, GROUND, p.t / p.life, p.kind === 'action' ? '110,200,255' : '255,150,70')
      P.draw(ctx, 'near')
    })
    drawPost(rd, MOOD, { desaturate: state.outcome === 'fail' ? 0.3 * oc : 0 })
  },
}
