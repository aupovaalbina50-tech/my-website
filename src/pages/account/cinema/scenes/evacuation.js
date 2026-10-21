// 04 «Провести эвакуацию»: рассвет, жилой квартал, угроза — облако дыма
// за домами. Intro: quiet district at dawn → alarm, beacons → residents
// leave the entrances → the route to the assembly point and the buses →
// the danger zone. Correct answers move groups along the route; success:
// the block is empty, everyone at the assembly point.
import { building, glow, ground, lamp, person, ring, vehicle, zone, mistBand } from '../fx.js'
import { drawBackdrop, drawForeground, drawPost, drawTrees, introLerp, makeBackdrop, outcomeK, pulseK } from './common.js'

const HORIZON = 580
const GROUND = 690
const MOOD = 'dawn'
const PEOPLE = 16

export default {
  id: 'run-evacuation',
  startThreat: 0.6,
  shots: {
    intro: [
      { t: 0, x: 800, y: 380, z: 1.0 },
      { t: 3.5, x: 600, y: 520, z: 1.3 },
      { t: 7, x: 820, y: 640, z: 1.6 },
      { t: 10, x: 1220, y: 640, z: 1.6 },
      { t: 12.5, x: 820, y: 615, z: 1.34 },
    ],
    idle: { x: 820, y: 615, z: 1.34 },
    outcome: [
      { t: 0, x: 820, y: 615, z: 1.34 },
      { t: 3, x: 1220, y: 620, z: 1.45 },
      { t: 6, x: 820, y: 595, z: 1.25 },
    ],
  },
  introDuration: 13,
  // Brief: the part of the scene kept left of the task panel.
  briefX: 700,
  captions: [{ t: 1, key: 'type' }, { t: 4, key: 'place' }, { t: 7.2, key: 'situation' }, { t: 10.2, key: 'task' }],
  focusPoint: { x: 600, y: 520 },
  hotspots: [
    { id: 'exit', x: 560, y: GROUND - 60, z: 2.1 },
    { id: 'route', x: 880, y: GROUND + 40, z: 1.8 },
    { id: 'assembly', x: 1260, y: GROUND + 20, z: 2.0 },
    { id: 'zone', x: 520, y: GROUND + 30, z: 1.5 },
  ],
  setup() {
    return { bd: makeBackdrop(4, { horizon: HORIZON, starsN: 30 }), moved: 0 }
  },
  update(rd, dt) {
    const { state, data, particles: P } = rd
    const threat = state.phase === 'intro' && !state.reducedMotion ? Math.max(state.threat, introLerp(state, 0, 5, 0.4, 0.85)) : state.threat
    data.threat = threat
    // share of residents already at the assembly point
    const target = state.outcome === 'success' ? 1 : state.phase === 'intro' ? introLerp(state, 6, 12, 0, 0.15) : Math.min(0.95, 1 - threat)
    data.moved += (target - data.moved) * Math.min(1, dt * 0.8)
    P.stream('smoke', 3.5 * threat, dt, 260, HORIZON + 40, { spreadX: 60, wind: 22, layer: 'mid', scale: 1.4 })
  },
  draw(rd) {
    const { ctx, state, data, particles: P } = rd
    const t = state.t
    const threat = data.threat ?? state.threat
    const oc = outcomeK(state, 5)
    drawBackdrop(rd, data.bd, MOOD, { starA: 0.25, glowRgb: '255,140,70', glowA: threat * 0.5 })
    rd.layer(0.6, () => P.draw(ctx, 'mid'))
    rd.layer(0.75, () => {
      building(ctx, { x: 120, y: HORIZON + 80, w: 240, h: 220, floors: 6, cols: 6, wall: '#2c384a', lit: 0.2 }, t)
      building(ctx, { x: 1340, y: HORIZON + 80, w: 220, h: 200, floors: 6, cols: 5, wall: '#2a3546', lit: 0.25 }, t)
    })
    drawTrees(rd, [[90, HORIZON + 80, 150], [800, HORIZON + 80, 130], [1300, HORIZON + 82, 140]], 0.82, '#22402f')
    rd.layer(0.9, () => mistBand(ctx, 1600, GROUND - 30, 70))
    rd.layer(1, () => {
      ground(ctx, 1600, GROUND - 40, { roadY: GROUND + 20, roadH: 100 })
      building(ctx, { x: 380, y: GROUND - 40, w: 360, h: 300, depth: 30, floors: 5, cols: 6, wall: '#3a4659', lit: 0.5, balconies: true }, t)
      // entrances
      ctx.fillStyle = 'rgba(255,220,160,0.65)'
      ctx.fillRect(470, GROUND - 92, 40, 52)
      ctx.fillRect(610, GROUND - 92, 40, 52)
      glow(ctx, 490, GROUND - 66, 70, '255,210,150', 0.35)
      glow(ctx, 630, GROUND - 66, 70, '255,210,150', 0.35)
      lamp(ctx, 820, GROUND - 40)
      // route arrows to the assembly point
      const routeA = Math.min(1, introLerp(state, 8, 10, 0, 1))
      ctx.strokeStyle = `rgba(110,220,255,${0.55 * routeA})`
      ctx.lineWidth = 4
      ctx.setLineDash([18, 14])
      ctx.lineDashOffset = -t * 40
      ctx.beginPath()
      ctx.moveTo(560, GROUND + 50)
      ctx.quadraticCurveTo(900, GROUND + 80, 1200, GROUND + 40)
      ctx.stroke()
      ctx.setLineDash([])
      // assembly point and buses
      ctx.fillStyle = 'rgba(96,200,255,0.18)'
      ctx.beginPath()
      ctx.ellipse(1270, GROUND + 30, 150, 30, 0, 0, Math.PI * 2)
      ctx.fill()
      vehicle(ctx, 'bus', 1290, GROUND + 4, { t, flip: true, beacons: false, lights: true })
      vehicle(ctx, 'police', 900, GROUND + 104, { t, flip: true })
      vehicle(ctx, 'rescue', 300, GROUND + 100, { t })
      person(ctx, 760, GROUND + 40, { kind: 'rescuer', t, pose: 'point' })
      person(ctx, 1120, GROUND + 30, { kind: 'police', t, flip: true })
      // residents: walking from the entrances along the route
      const alarm = state.phase !== 'intro' || state.phaseT > 4
      for (let i = 0; i < PEOPLE; i++) {
        const share = i / PEOPLE
        const k = Math.min(1, Math.max(0, (data.moved - share * 0.8) * 3))
        const startX = i % 2 ? 490 : 630
        const walking = alarm && k > 0 && k < 1
        const along = alarm ? Math.min(1, k + (walking ? ((t * 0.04 + share) % 0.15) : 0)) : 0
        const x = startX + (1180 + (i % 5) * 26 - startX) * along
        const y = GROUND - 40 + 80 * Math.sin(Math.min(1, along) * Math.PI * 0.5) - (along >= 1 ? 30 - (i % 3) * 8 : 0)
        person(ctx, x, y, { kind: ['civil', 'civil2', 'civil3'][i % 3], t: t + i, walking, scale: i % 4 === 0 ? 0.75 : 0.95 })
      }
      const zoneRgb = state.outcome === 'success' ? '96,200,255' : '255,110,64'
      zone(ctx, 520, GROUND + 30, 300, 56, t, { rgb: zoneRgb, a: Math.min(1, introLerp(state, 10, 11.5, 0, 1)) * (1 - 0.4 * oc) })
      for (const p of state.pulses) ring(ctx, 900, GROUND + 50, p.t / p.life, p.kind === 'action' ? '110,200,255' : '255,150,70')
      if (pulseK(state) > 0) glow(ctx, 1270, GROUND + 20, 120, '96,200,255', 0.3 * pulseK(state))
      P.draw(ctx, 'near')
    })
    drawForeground(rd, data.bd, 'street')
    drawPost(rd, MOOD, { desaturate: state.outcome === 'fail' ? 0.3 * oc : 0 })
  },
}
