// 08 «Организовать медицинскую помощь»: ночь, место происшествия, полевой
// пункт. Intro: night, beacons in the distance → damaged vehicles at the
// scene → injured waiting → medics with stretchers, the field medical post
// lit up → ambulances. Correct answers move stretcher teams to the tent and
// raise the «вital signs» line; success: all in the tent, ambulances leave.
import { glow, ground, lamp, person, ring, vehicle, zone } from '../fx.js'
import { stretcher, tent } from '../props.js'
import { drawBackdrop, drawPost, introLerp, makeBackdrop, outcomeK, pulseK } from './common.js'

const HORIZON = 590
const GROUND = 690
const MOOD = 'night'

export default {
  id: 'organize-medical-aid',
  startThreat: 0.55,
  shots: {
    intro: [
      { t: 0, x: 800, y: 380, z: 1.0 },
      { t: 3.5, x: 420, y: 600, z: 1.6 },
      { t: 7, x: 820, y: 640, z: 1.7 },
      { t: 10, x: 1150, y: 600, z: 1.6 },
      { t: 12.5, x: 800, y: 615, z: 1.34 },
    ],
    idle: { x: 800, y: 615, z: 1.34 },
    outcome: [
      { t: 0, x: 800, y: 615, z: 1.34 },
      { t: 3, x: 1150, y: 600, z: 1.5 },
      { t: 6, x: 800, y: 595, z: 1.25 },
    ],
  },
  introDuration: 13,
  // Brief: the part of the scene kept left of the task panel.
  briefX: 900,
  captions: [{ t: 1, key: 'type' }, { t: 4, key: 'place' }, { t: 7.2, key: 'situation' }, { t: 10.2, key: 'task' }],
  focusPoint: { x: 1150, y: 600 },
  hotspots: [
    { id: 'injured', x: 420, y: GROUND + 20, z: 2.2 },
    { id: 'triage', x: 780, y: GROUND + 30, z: 2.0 },
    { id: 'post', x: 1150, y: GROUND - 40, z: 2.0 },
    { id: 'transport', x: 1400, y: GROUND + 60, z: 1.9 },
  ],
  setup() {
    return { bd: makeBackdrop(8, { horizon: HORIZON, starsN: 120 }), moved: 0 }
  },
  update(rd, dt) {
    const { state, data, particles: P } = rd
    const threat = state.phase === 'intro' && !state.reducedMotion ? Math.max(state.threat, 0.7) : state.threat
    data.threat = threat
    const target = state.outcome === 'success' ? 1 : state.phase === 'intro' ? 0 : Math.min(0.9, 1 - threat)
    data.moved += (target - data.moved) * Math.min(1, dt * 0.7)
    P.stream('smokeLight', 2 * threat, dt, 380, GROUND - 10, { spreadX: 40, wind: 12 })
  },
  draw(rd) {
    const { ctx, state, data, particles: P } = rd
    const t = state.t
    const threat = data.threat ?? state.threat
    const oc = outcomeK(state, 5)
    drawBackdrop(rd, data.bd, MOOD, { starA: 0.9 })
    rd.layer(1, () => {
      ground(ctx, 1600, GROUND - 40, { roadY: GROUND, roadH: 110, wet: true, color: '#121a26' })
      lamp(ctx, 620, GROUND - 40)
      lamp(ctx, 960, GROUND - 40)
      // the incident: damaged cars
      ctx.save()
      ctx.translate(380, GROUND + 40)
      ctx.rotate(-0.12)
      vehicle(ctx, 'police', 0, 0, { t, beacons: false, lights: false })
      ctx.restore()
      vehicle(ctx, 'police', 260, GROUND + 92, { t, lights: false })
      // field medical post
      tent(ctx, 1060, GROUND - 40, 190, 90, { color: '#55705a', cross: true, glowOn: 1 })
      glow(ctx, 1155, GROUND - 60, 220, '255,236,200', 0.25)
      // vital signs monitor line above the tent
      ctx.strokeStyle = `rgba(110,240,170,${0.8})`
      ctx.lineWidth = 2
      ctx.beginPath()
      const calm = 1 - threat
      for (let i = 0; i <= 120; i++) {
        const x = 1080 + i * 1.3
        const ph = (i / 120 + t * 0.6) % 1
        const spike = ph > 0.48 && ph < 0.52 ? (ph < 0.5 ? -20 : 14) * (0.5 + 0.5 * calm) : 0
        const y = GROUND - 170 + spike + (1 - calm) * Math.sin(i * 0.9 + t * 9) * 4
        if (i) ctx.lineTo(x, y)
        else ctx.moveTo(x, y)
      }
      ctx.stroke()
      // ambulances: arrive during intro, leave on success
      const amb = introLerp(state, 6, 10, 1800, 1400) + (state.outcome === 'success' ? oc * 500 : 0)
      vehicle(ctx, 'ambulance', amb, GROUND + 70, { t, flip: true, moving: state.phase === 'intro' ? state.phaseT > 6 && state.phaseT < 10 : oc > 0 && oc < 1 })
      vehicle(ctx, 'ambulance', amb + 160, GROUND + 76, { t, flip: true })
      // injured and stretcher teams
      const N = 4
      for (let i = 0; i < N; i++) {
        const k = Math.min(1, Math.max(0, data.moved * N - i))
        if (k <= 0) {
          ctx.fillStyle = '#4e6b8a'
          ctx.fillRect(400 + i * 40, GROUND + 14 + (i % 2) * 6, 26, 6)
          person(ctx, 420 + i * 40, GROUND + 18, { kind: 'medic', t, flip: i % 2 === 0, scale: 0.9 })
          continue
        }
        if (k >= 1) continue
        stretcher(ctx, 440 + i * 40 + (1100 - 440 - i * 40) * k, GROUND + 30 - 40 * k, t, person)
      }
      // triage point
      ctx.fillStyle = 'rgba(255,220,90,0.18)'
      ctx.beginPath()
      ctx.ellipse(780, GROUND + 30, 90, 20, 0, 0, Math.PI * 2)
      ctx.fill()
      person(ctx, 780, GROUND + 30, { kind: 'medic', t, pose: 'point' })
      zone(ctx, 440, GROUND + 30, 200, 50, t, { rgb: state.outcome === 'success' ? '96,200,255' : '255,110,64', a: Math.min(1, introLerp(state, 10, 11.5, 0, 1)) * (1 - 0.3 * oc) })
      for (const p of state.pulses) ring(ctx, 1150, GROUND - 10, p.t / p.life, p.kind === 'action' ? '110,240,170' : '255,150,70')
      if (pulseK(state) > 0) glow(ctx, 1155, GROUND - 60, 260, '110,240,170', 0.25 * pulseK(state))
      P.draw(ctx, 'near')
    })
    drawPost(rd, MOOD, { desaturate: state.outcome === 'fail' ? 0.3 * oc : 0 })
  },
}
