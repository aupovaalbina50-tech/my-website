// Cinematic scene engine of the Missions section: one <canvas>, a world of
// WORLD_W × WORLD_H units seen through a moving camera. A scene draws its
// layers with a parallax factor (0 = sky, far away; 1 = foreground), so a
// camera move or zoom shifts near layers more than far ones — the depth of
// the shot comes from that. Particles, light and the colour grade are drawn
// by the scene with the helpers of fx.js.
//
// The controller lets the React side drive the story:
//   setPhase('intro' | 'idle' | 'outcome'), setThreat(0..1), pulse(kind),
//   setOutcome('success' | 'fail'), focus(hotspot | null), pause / resume,
//   replayIntro, setQuality('high' | 'lite'), dispose.
// The loop stops while the canvas is off screen or the tab is hidden, and
// everything is released on dispose().

import { createParticles } from './fx.js'

export const WORLD_W = 1600
export const WORLD_H = 900

const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const lerp = (a, b, k) => a + (b - a) * k

/** Camera on a keyframe track [{ t, x, y, z }] at time `t` (seconds). */
function cameraAt(track, t) {
  if (t <= track[0].t) return track[0]
  for (let i = 1; i < track.length; i++) {
    const a = track[i - 1]
    const b = track[i]
    if (t <= b.t) {
      const k = ease((t - a.t) / (b.t - a.t))
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) }
    }
  }
  return track[track.length - 1]
}

export function createCinema(canvas, scene, { quality = 'high', reducedMotion = false, onFrame } = {}) {
  const ctx = canvas.getContext('2d')
  const state = {
    phase: 'intro',
    phaseT: 0,
    t: 0,
    threat: scene.startThreat ?? 0.15,
    threatTarget: scene.startThreat ?? 0.15,
    outcome: null,
    outcomeT: 0,
    pulses: [],
    focus: null,
    // Framing offset of the idle and outcome shots (room for a panel, a
    // wide letterbox frame): x/y shift and a zoom factor.
    frame: { dx: 0, dy: 0, zk: 1 },
    paused: false,
    visible: true,
    quality,
    reducedMotion,
  }
  const cam = { ...scene.shots.intro[0] }
  let vw = 1
  let vh = 1
  let dpr = 1
  let raf = 0
  let last = 0
  let disposed = false
  const particles = createParticles(() => state.quality)
  const data = scene.setup ? scene.setup() : {}

  const resize = () => {
    const box = canvas.getBoundingClientRect()
    vw = Math.max(1, box.width)
    vh = Math.max(1, box.height)
    dpr = Math.min(window.devicePixelRatio || 1, state.quality === 'lite' ? 1 : 1.75)
    canvas.width = Math.round(vw * dpr)
    canvas.height = Math.round(vh * dpr)
  }

  // Base scale: the world covers the view (like background-size: cover).
  const baseScale = () => Math.max(vw / WORLD_W, vh / WORLD_H)

  const layerTransform = (p) => {
    const s = baseScale() * (1 + (cam.z - 1) * p)
    const cx = lerp(WORLD_W / 2, cam.x, p)
    const cy = lerp(WORLD_H / 2, cam.y, p)
    return { s, cx, cy }
  }

  const render = {
    ctx,
    state,
    data,
    particles,
    W: WORLD_W,
    H: WORLD_H,
    get vw() {
      return vw
    },
    get vh() {
      return vh
    },
    /** Draws `fn` in world units on a layer with parallax `p`. */
    layer(p, fn) {
      const { s, cx, cy } = layerTransform(p)
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (vw / 2 - cx * s), dpr * (vh / 2 - cy * s))
      fn()
    },
    /** Screen-space drawing (CSS px). */
    screen(fn) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      fn()
    },
    /** World point on layer p → CSS px of the view. */
    project(x, y, p = 1) {
      const { s, cx, cy } = layerTransform(p)
      return { x: vw / 2 + (x - cx) * s, y: vh / 2 + (y - cy) * s }
    },
  }

  const framed = (c) => ({ x: c.x + state.frame.dx, y: c.y + state.frame.dy, z: c.z * state.frame.zk })
  const targetCamera = () => {
    if (state.focus) return { x: state.focus.x, y: state.focus.y, z: state.focus.z ?? 1.9 }
    if (state.phase === 'intro') return cameraAt(scene.shots.intro, state.reducedMotion ? 99 : state.phaseT)
    if (state.phase === 'outcome') return framed(cameraAt(scene.shots.outcome ?? [scene.shots.idle], state.reducedMotion ? 99 : state.outcomeT))
    const idle = framed(scene.shots.idle)
    if (state.reducedMotion) return idle
    // A slow «breathing» drift keeps the idle shot alive.
    return { x: idle.x + Math.sin(state.t * 0.07) * 10, y: idle.y + Math.cos(state.t * 0.05) * 4, z: idle.z + Math.sin(state.t * 0.09) * 0.01 }
  }

  const step = (dt) => {
    state.t += dt
    state.phaseT += dt
    if (state.outcome) state.outcomeT += dt
    // Threat follows its target smoothly (a fire dies down, water recedes).
    state.threat += (state.threatTarget - state.threat) * clamp(dt * 0.9, 0, 1)
    state.pulses = state.pulses.filter((pl) => (pl.t += dt) < pl.life)
    const target = targetCamera()
    // Intro and outcome tracks are followed exactly; free moves are eased.
    const k = (state.phase === 'intro' || state.phase === 'outcome') && !state.focus ? 1 : clamp(dt * 2.2, 0, 1)
    cam.x = lerp(cam.x, target.x, k)
    cam.y = lerp(cam.y, target.y, k)
    cam.z = lerp(cam.z, target.z, k)
    scene.update?.(render, dt)
    particles.update(dt)
  }

  const draw = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    scene.draw(render)
    onFrame?.(render)
  }

  const loop = (now) => {
    if (disposed) return
    raf = 0
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60
    last = now
    if (!state.paused) step(dt)
    draw()
    if (!state.paused && state.visible && !document.hidden) raf = requestAnimationFrame(loop)
  }
  const kick = () => {
    if (!raf && !disposed) {
      last = 0
      raf = requestAnimationFrame(loop)
    }
  }

  const ro = new ResizeObserver(() => {
    resize()
    if (!raf) draw()
  })
  ro.observe(canvas)
  const io = new IntersectionObserver(([entry]) => {
    state.visible = entry.isIntersecting
    if (state.visible) kick()
  })
  io.observe(canvas)
  const onVisibility = () => !document.hidden && kick()
  document.addEventListener('visibilitychange', onVisibility)

  resize()
  // Warm the particle systems so smoke and fire are already there.
  for (let i = 0; i < 90; i++) {
    scene.update?.(render, 1 / 30)
    particles.update(1 / 30)
  }
  kick()

  return {
    state,
    setPhase(phase) {
      if (state.phase === phase) return
      state.phase = phase
      state.phaseT = 0
      kick()
    },
    replayIntro() {
      state.phase = 'intro'
      state.phaseT = 0
      state.focus = null
      state.outcome = null
      state.outcomeT = 0
      state.threatTarget = scene.startThreat ?? 0.15
      state.threat = state.threatTarget
      Object.assign(cam, scene.shots.intro[0])
      state.paused = false
      kick()
    },
    setThreat(v) {
      state.threatTarget = clamp(v, 0, 1)
      kick()
    },
    pulse(kind, x, y) {
      state.pulses.push({ kind, x, y, t: 0, life: kind === 'action' ? 3.2 : 1.6 })
      scene.onPulse?.(render, kind)
      kick()
    },
    /** `threat` overrides where the situation settles (e.g. partly controlled). */
    setOutcome(outcome, threat) {
      state.outcome = outcome
      state.outcomeT = 0
      state.phase = 'outcome'
      state.phaseT = 0
      state.focus = null
      state.threatTarget = threat ?? (outcome === 'success' ? 0 : Math.max(state.threatTarget, 0.55))
      kick()
    },
    /** Leaves the outcome (a new attempt) at the given threat level. */
    reset(threat) {
      state.outcome = null
      state.outcomeT = 0
      state.phase = 'idle'
      state.phaseT = 0
      state.focus = null
      state.pulses = []
      state.threatTarget = threat ?? scene.startThreat ?? 0.15
      kick()
    },
    setFrame(frame) {
      state.frame = { dx: 0, dy: 0, zk: 1, ...frame }
      kick()
    },
    focus(spot) {
      state.focus = spot
      kick()
    },
    pause() {
      state.paused = true
    },
    resume() {
      state.paused = false
      kick()
    },
    setQuality(q) {
      state.quality = q
      resize()
      kick()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      particles.clear()
      canvas.width = canvas.height = 0
    },
  }
}
