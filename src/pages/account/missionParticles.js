// Particle engine for the mission scenes: fire, embers, smoke, steam, water
// spray, mist, gas, sparks, dust. Drawn on a <canvas> laid over the SVG
// scene, in the same 640×220 coordinates. Each scene lists emitters; an
// emitter's strength follows the operation stage (`levels[reached]`), so a
// fire really dies down as the user answers, and steam replaces smoke.
//
// Cheap enough for one scene on screen: soft sprites are pre-rendered once,
// particles are capped, and the loop stops when the canvas is off screen.

export const SCENE_W = 640
export const SCENE_H = 220
const MAX_PARTICLES = 900

const rand = (a, b) => a + Math.random() * (b - a)
const pick = ([a, b]) => rand(a, b)

// ---- soft round sprites, one per colour ----------------------------------------

const spriteCache = new Map()

function sprite(rgb, hard = 0.0) {
  const key = `${rgb}|${hard}`
  if (spriteCache.has(key)) return spriteCache.get(key)
  const size = 64
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, `rgba(${rgb},1)`)
  grad.addColorStop(Math.max(0.05, hard), `rgba(${rgb},0.85)`)
  grad.addColorStop(1, `rgba(${rgb},0)`)
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  spriteCache.set(key, c)
  return c
}

// ---- particle kinds ---------------------------------------------------------------
// life in seconds, size in scene px, velocities in px/s, `blend` lighter =
// additive light (fire, sparks). `color(t)` picks the sprite by age 0..1.

const FIRE_COLORS = ['255,244,190', '255,205,90', '255,140,40', '230,70,30', '160,40,30']
const KINDS = {
  fire: {
    life: [0.45, 0.95],
    size: [7, 15],
    vx: [-9, 9],
    vy: [-70, -40],
    grow: -0.55,
    alpha: 0.95,
    blend: 'lighter',
    wobble: 26,
    color: (t) => FIRE_COLORS[Math.min(FIRE_COLORS.length - 1, Math.floor(t * FIRE_COLORS.length))],
  },
  ember: {
    life: [0.9, 1.8],
    size: [1.2, 2.4],
    vx: [-14, 18],
    vy: [-90, -50],
    grow: -0.3,
    alpha: 1,
    blend: 'lighter',
    wobble: 40,
    hard: 0.5,
    color: () => '255,190,90',
  },
  smoke: {
    life: [2.8, 4.6],
    size: [12, 18],
    vx: [4, 14],
    vy: [-30, -18],
    grow: 2.4,
    alpha: 0.55,
    wobble: 10,
    color: () => '52,55,62',
  },
  smokeLight: {
    life: [2.2, 3.6],
    size: [10, 14],
    vx: [6, 14],
    vy: [-26, -16],
    grow: 2.2,
    alpha: 0.32,
    wobble: 10,
    color: () => '170,176,186',
  },
  steam: {
    life: [1.4, 2.4],
    size: [8, 12],
    vx: [-6, 10],
    vy: [-34, -20],
    grow: 2.6,
    alpha: 0.5,
    wobble: 14,
    color: () => '245,248,252',
  },
  spray: {
    life: [2, 2],
    size: [1.8, 3.4],
    gravity: 300,
    alpha: 1,
    hard: 0.45,
    color: () => '170,210,245',
    splash: 'mist',
  },
  mist: {
    life: [0.5, 1.1],
    size: [3, 6],
    vx: [-30, 30],
    vy: [-30, 5],
    grow: 1.6,
    alpha: 0.45,
    color: () => '225,240,252',
  },
  gas: {
    life: [4, 6.5],
    size: [18, 30],
    vx: [4, 16],
    vy: [-8, 2],
    grow: 1.4,
    alpha: 0.3,
    wobble: 6,
    color: () => '196,208,92',
  },
  spark: {
    life: [0.25, 0.6],
    size: [1, 2],
    vx: [-60, 60],
    vy: [-80, -10],
    gravity: 260,
    alpha: 1,
    blend: 'lighter',
    hard: 0.6,
    color: () => '255,226,120',
  },
  dust: {
    life: [1.6, 2.8],
    size: [5, 9],
    vx: [-12, 12],
    vy: [-14, -4],
    grow: 1.8,
    alpha: 0.32,
    color: () => '168,150,122',
  },
  rain: {
    life: [0.75, 0.85],
    size: [0.9, 1.4],
    vx: [-40, -40],
    vy: [280, 320],
    alpha: 0.6,
    streak: 11,
    color: () => '214,226,238',
  },
}

/**
 * Emitter: { kind, x, y, w = 0 (spread along x), h = 0, rate (per s at full
 * strength), levels: [r0, r1, r2, r3, r4] strength per stage,
 * tx/ty (spray target), delay (s) }.
 */
export function createParticleSystem(canvas, emitters) {
  const ctx = canvas.getContext('2d')
  let particles = []
  let reached = 0
  let raf = 0
  let last = 0
  let running = false
  const debt = new Map()
  let elapsed = 0

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.max(1, Math.round(rect.width * dpr))
    canvas.height = Math.max(1, Math.round(rect.height * dpr))
    // Same "xMidYMax meet" fit as the SVG.
    const scale = Math.min(canvas.width / SCENE_W, canvas.height / SCENE_H)
    const ox = (canvas.width - SCENE_W * scale) / 2
    const oy = canvas.height - SCENE_H * scale
    ctx.setTransform(scale, 0, 0, scale, ox, oy)
  }

  function spawn(e) {
    const k = KINDS[e.kind]
    const p = {
      kind: e.kind,
      x: e.x + (e.w ? rand(-e.w / 2, e.w / 2) : 0),
      y: e.y + (e.h ? rand(-e.h / 2, e.h / 2) : 0),
      age: 0,
      life: pick(k.life),
      size: pick(k.size),
      phase: Math.random() * Math.PI * 2,
    }
    if (e.kind === 'spray') {
      // Ballistic arc that lands on the target point.
      const t = rand(0.75, 0.95)
      const tx = e.tx + rand(-8, 8)
      const ty = e.ty + rand(-6, 6)
      p.vx = (tx - p.x) / t
      p.vy = (ty - p.y - 0.5 * k.gravity * t * t) / t
      p.life = t
      p.target = { x: tx, y: ty }
    } else {
      p.vx = pick(k.vx ?? [0, 0])
      p.vy = pick(k.vy ?? [0, 0])
    }
    particles.push(p)
  }

  function step(dt) {
    elapsed += dt
    for (const e of emitters) {
      if (e.delay && elapsed < e.delay) continue
      const strength = e.levels?.[reached] ?? 1
      if (strength <= 0) continue
      const want = (debt.get(e) ?? 0) + e.rate * strength * dt
      const n = Math.floor(want)
      debt.set(e, want - n)
      for (let i = 0; i < n && particles.length < MAX_PARTICLES; i++) spawn(e)
    }
    const born = []
    particles = particles.filter((p) => {
      const k = KINDS[p.kind]
      p.age += dt
      if (p.age >= p.life) {
        if (k.splash && p.target) {
          for (let i = 0; i < 2; i++) born.push({ kind: k.splash, x: p.target.x, y: p.target.y })
        }
        return false
      }
      if (k.gravity) p.vy += k.gravity * dt
      const wob = k.wobble ? Math.sin(p.phase + p.age * 7) * k.wobble * dt : 0
      p.x += p.vx * dt + wob
      p.y += p.vy * dt
      return true
    })
    for (const b of born) if (particles.length < MAX_PARTICLES) spawn(b)
  }

  function draw() {
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    for (const p of particles) {
      const k = KINDS[p.kind]
      const t = p.age / p.life
      const size = Math.max(0.3, p.size * (1 + (k.grow ?? 0) * t))
      // Fade in quickly, out slowly.
      const a = k.alpha * Math.min(1, t * 6) * (1 - t) ** (p.kind === 'fire' ? 0.6 : 1.2)
      if (a <= 0.01) continue
      ctx.globalCompositeOperation = k.blend ?? 'source-over'
      ctx.globalAlpha = a
      if (k.streak) {
        ctx.strokeStyle = `rgba(${k.color(t)},1)`
        ctx.lineWidth = size
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - p.vx * 0.03, p.y - k.streak)
        ctx.stroke()
      } else {
        ctx.drawImage(sprite(k.color(t), k.hard ?? 0), p.x - size, p.y - size, size * 2, size * 2)
      }
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  function frame(now) {
    if (!running) return
    const dt = Math.min(0.05, (now - last) / 1000 || 0)
    last = now
    step(dt)
    draw()
    raf = requestAnimationFrame(frame)
  }

  // Warm up so a scene opens already burning instead of starting empty.
  function prewarm(seconds = 2) {
    for (let t = 0; t < seconds; t += 1 / 30) step(1 / 30)
  }

  return {
    resize,
    setReached(value) {
      reached = Math.max(0, Math.min(4, value))
    },
    start() {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(frame)
    },
    stop() {
      running = false
      cancelAnimationFrame(raf)
    },
    prewarm,
    drawOnce: draw,
  }
}
