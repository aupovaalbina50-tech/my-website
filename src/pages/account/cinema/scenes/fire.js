// 02 «Ликвидировать пожар»: evening, a residential block is on fire.
// Intro: wide shot of the district with a glow over the roofs → fire trucks
// arrive along the wet street with their beacons → the camera pushes in to
// the burning floors → the cordon / hazard zone is drawn. During the test
// every correct answer sends a surge of water and the fire visibly loses
// strength; the outcome either brings it under control (steam, zone turns
// blue) or leaves it burning at a reduced level.
import { building, glow, ground, lamp, person, pool, reflect, ring, vehicle, zone } from '../fx.js'
import { drawBackdrop, drawPost, introLerp, makeBackdrop, outcomeK, pulseK } from './common.js'

const HORIZON = 600
const GROUND = 690
const BURNING = [5, 6, 9, 10, 11, 14]
const MOOD = 'dusk'

export default {
  id: 'extinguish-fire',
  startThreat: 0.45,
  shots: {
    intro: [
      { t: 0, x: 820, y: 380, z: 1.0 },
      { t: 3.5, x: 760, y: 430, z: 1.12 },
      { t: 6.5, x: 560, y: 600, z: 1.45 },
      { t: 9.5, x: 770, y: 420, z: 1.85 },
      { t: 12.5, x: 790, y: 595, z: 1.42 },
    ],
    idle: { x: 790, y: 595, z: 1.42 },
    outcome: [
      { t: 0, x: 790, y: 595, z: 1.42 },
      { t: 2.5, x: 770, y: 450, z: 1.6 },
      { t: 6, x: 800, y: 595, z: 1.32 },
    ],
  },
  introDuration: 13,
  // Brief: the part of the scene kept left of the task panel.
  briefX: 700,
  captions: [
    { t: 1.2, key: 'type' },
    { t: 4.2, key: 'place' },
    { t: 7.4, key: 'situation' },
    { t: 10.2, key: 'task' },
  ],
  focusPoint: { x: 770, y: 400 },
  hotspots: [
    { id: 'seat', x: 770, y: 360, z: 2.1 },
    { id: 'water', x: 520, y: GROUND + 40, z: 2.0 },
    { id: 'command', x: 1110, y: GROUND + 30, z: 2.0 },
    { id: 'zone', x: 780, y: GROUND + 60, z: 1.6 },
  ],
  setup() {
    return { bd: makeBackdrop(2, { horizon: HORIZON }), arrive: 0 }
  },
  update(rd, dt) {
    const { state, particles: P } = rd
    const intro = state.phase === 'intro'
    // During the intro the fire grows from smouldering to full strength.
    const fire = intro && !state.reducedMotion ? Math.max(state.threat, introLerp(state, 0, 6, 0.45, 1)) : state.threat
    rd.data.fire = fire
    const water = state.phase !== 'intro' || state.phaseT > 8.5 ? 0.35 + pulseK(state) * 0.65 + outcomeK(state, 4) * (state.outcome === 'success' ? 0.6 : 0) : 0
    rd.data.water = water
    const wind = 18
    // flames and smoke from the burning windows
    const top = GROUND - 400
    BURNING.forEach((idx, i) => {
      if (i / BURNING.length > fire + 0.08) return
      const f = Math.floor(idx / 4)
      const c = idx % 4
      const x = 640 + c * 65 + 32
      const y = top + f * 72 + 34
      P.stream('fire', 46 * fire, dt, x, y + 8, { spreadX: 12, spreadY: 4, scale: 0.8 + fire * 0.7 })
      P.stream('smoke', 2.6 * fire, dt, x + 4, y - 30, { spreadX: 8, wind, scale: 0.8 + fire * 0.6 })
      P.stream('ember', 3 * fire, dt, x, y, { spreadX: 10, wind: wind * 2 })
    })
    // roof fire
    if (fire > 0.55) {
      P.stream('fire', 70 * (fire - 0.4), dt, 770, top - 6, { spreadX: 60, spreadY: 3, scale: 1.3 })
      P.stream('smoke', 5 * fire, dt, 780, top - 50, { spreadX: 60, wind: wind * 1.5, scale: 1.4 })
    }
    // water jets from two crews → steam where they hit
    if (water > 0.05) {
      for (const [sx, sy, tx, ty] of [[600, GROUND + 18, 700, top + 230], [960, GROUND + 22, 845, top + 160]]) {
        const n = 150 * water
        P.stream('water', n, dt, sx, sy, { vx: (tx - sx) * 1.05 + (Math.random() - 0.5) * 30, vy: (ty - sy) * 1.05 - 150 + (Math.random() - 0.5) * 30, scale: 1.2 })
        P.stream('steam', 5 * water * Math.max(fire, 0.35), dt, tx, ty, { spreadX: 20, wind })
      }
    }
    if (state.outcome === 'success') P.stream('steam', 8 * (1 - outcomeK(state, 6)), dt, 770, top + 140, { spreadX: 120, spreadY: 90, wind })
    P.stream('smokeLight', 1.5, dt, 300, HORIZON - 40, { spreadX: 60, layer: 'mid', scale: 0.7 })
  },
  draw(rd) {
    const { ctx, state, data, particles: P } = rd
    const t = state.t
    const fire = data.fire ?? state.threat
    const oc = outcomeK(state, 5)
    const success = state.outcome === 'success'
    drawBackdrop(rd, data.bd, MOOD, { glowRgb: '255,120,50', glowA: fire, starA: 0.6, cloudLight: fire * 0.5 })

    // mid layer: neighbouring blocks
    rd.layer(0.7, () => {
      building(ctx, { x: 120, y: HORIZON + 40, w: 220, h: 250, floors: 7, cols: 5, wall: '#273244', lit: 0.4 }, t)
      building(ctx, { x: 1150, y: HORIZON + 40, w: 260, h: 300, floors: 8, cols: 6, wall: '#253041', lit: 0.35 }, t)
      building(ctx, { x: 1440, y: HORIZON + 40, w: 200, h: 200, floors: 6, cols: 4, wall: '#222c3b', lit: 0.3 }, t)
      P.draw(ctx, 'mid')
    })

    // near layer: the burning block, street, trucks, crews
    rd.layer(1, () => {
      ground(ctx, 1600, GROUND - 40, { roadY: GROUND, roadH: 110, wet: true })
      // sidewalk
      ctx.fillStyle = '#1f2836'
      ctx.fillRect(-400, GROUND - 40, 2400, 40)
      building(ctx, { x: 640, y: GROUND - 40, w: 260, h: 360, depth: 34, floors: 5, cols: 4, wall: '#3a4658', side: '#232d3c', lit: 0.25, burning: BURNING }, t, fire)
      // balconies, parapet and the entrance
      ctx.fillStyle = 'rgba(14,20,30,0.55)'
      for (let f = 1; f < 5; f++) ctx.fillRect(640, GROUND - 400 + f * 72 - 4, 260, 5)
      ctx.fillStyle = '#2b3646'
      ctx.fillRect(636, GROUND - 408, 268, 10)
      ctx.fillStyle = '#121923'
      ctx.fillRect(750, GROUND - 92, 42, 52)
      lamp(ctx, 380, GROUND - 40)
      lamp(ctx, 1080, GROUND - 40)
      // fire light on the facade and street
      const fl = fire * (0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3))
      glow(ctx, 770, GROUND - 260, 380, '255,120,40', 0.55 * fl)
      pool(ctx, 770, GROUND + 50, 520, 70, '255,130,50', 0.45 * fl)
      reflect(ctx, 735, GROUND + 4, 90, '255,140,60', 0.35 * fl)
      reflect(ctx, 805, GROUND + 4, 80, '255,140,60', 0.3 * fl)

      // hydrant and hose lines
      ctx.fillStyle = '#b8212b'
      ctx.fillRect(505, GROUND - 58, 12, 22)
      ctx.strokeStyle = '#d9d2b8'
      ctx.lineWidth = 3
      const arrive = Math.min(1, introLerp(state, 3.2, 7.5, 0, 1))
      if (arrive > 0.85) {
        ctx.beginPath()
        ctx.moveTo(511, GROUND - 40)
        ctx.bezierCurveTo(540, GROUND + 30, 600, GROUND + 30, 600, GROUND + 18)
        ctx.moveTo(1000, GROUND + 30)
        ctx.bezierCurveTo(980, GROUND + 40, 960, GROUND + 30, 960, GROUND + 22)
        ctx.stroke()
      }

      // hazard zone around the building base
      const zoneA = Math.min(1, introLerp(state, 9, 10.5, 0, 1))
      const zoneRgb = success ? `${Math.round(255 - 159 * oc)},${Math.round(84 + 116 * oc)},${Math.round(64 + 191 * oc)}` : '255,110,64'
      zone(ctx, 780, GROUND + 60, 330, 64, t, { rgb: zoneRgb, a: zoneA * (state.phase === 'intro' && !state.reducedMotion ? 1 : 0.85) })

      // trucks arrive from the left during the intro
      const truck1 = introLerp(state, 3.2, 7.2, -340, 470)
      const truck2 = introLerp(state, 4.4, 8.2, -560, 1020)
      const moving = state.phase === 'intro' && state.phaseT > 3 && state.phaseT < 8.2
      const b1 = vehicle(ctx, 'fire', truck1, GROUND + 64, { t, moving })
      const b2 = vehicle(ctx, 'tanker', truck2, GROUND + 70, { t, moving, scale: 1.04 })
      vehicle(ctx, 'command', 1240, GROUND + 96, { t, flip: true, scale: 1.06, lights: false })
      vehicle(ctx, 'police', 1470, GROUND + 92, { t, flip: true, lights: false })
      // beacon reflections on the wet road
      for (const b of [b1, b2]) {
        if (!b) continue
        reflect(ctx, b.bx1, GROUND + 74, 60, '255,50,50', 0.4 * b.r)
        reflect(ctx, b.bx2, GROUND + 74, 60, '70,140,255', 0.4 * b.b)
      }

      // crews: two nozzle teams, the incident commander, a breathing-apparatus team
      if (arrive > 0.9) {
        person(ctx, 600, GROUND + 22, { kind: 'firefighter', t, pose: 'hose' })
        person(ctx, 586, GROUND + 24, { kind: 'firefighter', t })
        person(ctx, 960, GROUND + 26, { kind: 'firefighter', t, pose: 'hose', flip: true })
        person(ctx, 1110, GROUND + 30, { kind: 'firefighter', t, pose: 'point', flip: true })
        const enter = state.phase === 'intro' ? 0 : Math.min(1, (state.phaseT % 14) / 7)
        person(ctx, 700 + enter * 30, GROUND - 40, { kind: 'firefighter', t, walking: enter < 1 })
        person(ctx, 680 + enter * 30, GROUND - 40, { kind: 'firefighter', t, walking: enter < 1 })
      }
      // onlookers behind the cordon
      for (let i = 0; i < 6; i++) person(ctx, 1320 + i * 22, GROUND + 4 + (i % 2) * 6, { kind: ['civil', 'civil2', 'civil3'][i % 3], t, scale: 0.95 })
      // cordon tape
      ctx.strokeStyle = 'rgba(255,214,64,0.85)'
      ctx.lineWidth = 2
      ctx.setLineDash([10, 6])
      ctx.beginPath()
      ctx.moveTo(1290, GROUND - 4)
      ctx.lineTo(1290, GROUND + 70)
      ctx.stroke()
      ctx.setLineDash([])

      // correct answer: ring at the building base
      for (const p of state.pulses) if (p.kind === 'action') ring(ctx, 780, GROUND + 40, p.t / p.life, '110,200,255')
      for (const p of state.pulses) if (p.kind === 'error') ring(ctx, 780, GROUND + 40, p.t / p.life, '255,150,70')

      P.draw(ctx, 'near')
    })
    drawPost(rd, MOOD, { desaturate: state.outcome === 'fail' ? 0.35 * oc : 0 })
  },
}
