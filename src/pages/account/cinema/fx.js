// Drawing helpers of the mission scenes: particle systems (smoke, fire,
// embers, sparks, steam, gas, dust, water jets, rain), light (additive
// glows, beams, beacons), and the objects the scenes are built from —
// buildings, industrial plant, vehicles, people, roads, water, the hazard
// zone. Everything is drawn in world units; see engine.js for the camera.

const rand = (a, b) => a + Math.random() * (b - a)

/** Deterministic random numbers, so a scene looks the same every time. */
export function seeded(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---- soft sprites ----------------------------------------------------------------

const sprites = new Map()

/** A soft round sprite of one colour; `core` = how hard the centre is. */
export function sprite(rgb, core = 0) {
  const key = `${rgb}|${core}`
  if (sprites.has(key)) return sprites.get(key)
  const size = 96
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, `rgba(${rgb},1)`)
  if (core > 0) grad.addColorStop(core, `rgba(${rgb},0.8)`)
  grad.addColorStop(0.55, `rgba(${rgb},0.35)`)
  grad.addColorStop(1, `rgba(${rgb},0)`)
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  sprites.set(key, c)
  return c
}

// Smoke puffs: irregular, made of several overlapping blobs.
const puffs = new Map()
function puff(rgb, variant) {
  const key = `${rgb}|${variant}`
  if (puffs.has(key)) return puffs.get(key)
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const r = seeded(variant * 97 + 13)
  for (let i = 0; i < 9; i++) {
    const x = size / 2 + (r() - 0.5) * size * 0.45
    const y = size / 2 + (r() - 0.5) * size * 0.45
    const rad = size * (0.18 + r() * 0.22)
    const grad = g.createRadialGradient(x, y, 0, x, y, rad)
    grad.addColorStop(0, `rgba(${rgb},${0.35 + r() * 0.25})`)
    grad.addColorStop(1, `rgba(${rgb},0)`)
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
  }
  puffs.set(key, c)
  return c
}

// ---- particles -----------------------------------------------------------------

const KINDS = {
  smoke: { life: [4.5, 7.5], size: [16, 34], grow: 30, vy: [-70, -42], vx: [-4, 8], drag: 0.12, alpha: 0.55, rgb: '38,40,46', puff: true },
  smokeLight: { life: [4, 7], size: [20, 44], grow: 24, vy: [-40, -22], vx: [-4, 6], drag: 0.15, alpha: 0.4, rgb: '120,126,136', puff: true },
  steam: { life: [2.5, 4.5], size: [20, 40], grow: 30, vy: [-34, -20], vx: [-4, 6], drag: 0.2, alpha: 0.42, rgb: '226,234,242', puff: true },
  gas: { life: [5, 9], size: [40, 80], grow: 18, vy: [-6, 2], vx: [6, 16], drag: 0.1, alpha: 0.3, rgb: '196,214,96', puff: true },
  dust: { life: [3, 6], size: [24, 50], grow: 20, vy: [-12, -4], vx: [-8, 10], drag: 0.3, alpha: 0.45, rgb: '150,128,104', puff: true },
  mist: { life: [3, 5], size: [30, 60], grow: 16, vy: [-6, 0], vx: [-6, 6], drag: 0.3, alpha: 0.22, rgb: '205,222,238', puff: true },
  fire: { life: [0.35, 0.85], size: [8, 18], grow: -8, vy: [-110, -55], vx: [-12, 12], drag: 0.6, alpha: 0.62, additive: true, fire: true },
  ember: { life: [1.2, 2.8], size: [2.2, 4], grow: 0, vy: [-110, -50], vx: [-20, 26], drag: 0.2, alpha: 1, additive: true, rgb: '255,170,70' },
  spark: { life: [0.35, 0.8], size: [1.4, 2.4], grow: 0, vy: [-160, -40], vx: [-120, 120], gravity: 420, alpha: 1, additive: true, rgb: '255,226,150', streak: true },
  water: { life: [0.7, 1.15], size: [2.2, 3.6], grow: 0, vy: [0, 0], vx: [0, 0], gravity: 300, alpha: 0.75, rgb: '206,230,252', streak: true, solid: true },
  splash: { life: [0.25, 0.45], size: [1.4, 2.6], grow: 0, vy: [-70, -20], vx: [-40, 40], gravity: 380, alpha: 0.8, rgb: '200,224,246' },
}

const FIRE_RGB = ['255,206,110', '255,146,46', '232,92,28', '150,44,18']

export function createParticles(quality) {
  const list = []
  const cap = () => (quality() === 'lite' ? 520 : 1600)

  return {
    list,
    /** Emits one particle of `kind` at (x, y); `o` overrides velocity etc. */
    emit(kind, x, y, o = {}) {
      if (list.length >= cap()) return
      const k = KINDS[kind]
      list.push({
        kind,
        k,
        x,
        y,
        px: x,
        py: y,
        vx: o.vx ?? rand(...k.vx) + (o.wind ?? 0),
        vy: o.vy ?? rand(...k.vy),
        size: (o.size ?? rand(...k.size)) * (o.scale ?? 1),
        life: rand(...k.life) * (o.lifeScale ?? 1),
        age: 0,
        alpha: (o.alpha ?? 1) * k.alpha,
        layer: o.layer ?? 'near',
        variant: (Math.random() * 6) | 0,
        seed: Math.random() * 10,
      })
    },
    /** Emits `rate`/s particles over dt, around a point or along a span. */
    stream(kind, rate, dt, x, y, o = {}) {
      const scale = quality() === 'lite' ? 0.4 : 1
      let n = rate * dt * scale
      while (n > 0) {
        if (n < 1 && Math.random() > n) break
        n -= 1
        this.emit(kind, x + rand(-(o.spreadX ?? 0), o.spreadX ?? 0), y + rand(-(o.spreadY ?? 0), o.spreadY ?? 0), o)
      }
    },
    update(dt) {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]
        p.age += dt
        if (p.age >= p.life) {
          list.splice(i, 1)
          continue
        }
        p.px = p.x
        p.py = p.y
        const k = p.k
        if (k.gravity) p.vy += k.gravity * dt
        if (k.drag) {
          p.vx *= 1 - k.drag * dt
          p.vy *= 1 - k.drag * dt * 0.5
        }
        // Turbulence for smoke-like particles.
        if (k.puff) p.vx += Math.sin(p.age * 1.3 + p.seed) * 6 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.size = Math.max(0.5, p.size + k.grow * dt)
      }
    },
    /** Draws the particles of a layer ('far' | 'mid' | 'near'). */
    draw(ctx, layer = 'near', tint = 1) {
      for (const p of list) {
        if (p.layer !== layer) continue
        const k = p.k
        const t = p.age / p.life
        let a = p.alpha
        if (k.puff) a *= Math.min(1, t * 5) * (1 - t) ** 1.2
        else if (k.fire) a *= 1 - t
        else a *= 1 - t * t
        if (a <= 0.01) continue
        ctx.globalAlpha = a * tint
        ctx.globalCompositeOperation = k.additive ? 'lighter' : 'source-over'
        if (k.streak) {
          ctx.lineCap = 'round'
          ctx.strokeStyle = `rgb(${k.rgb})`
          ctx.lineWidth = p.size
          ctx.beginPath()
          ctx.moveTo(p.px - (p.x - p.px) * 3, p.py - (p.y - p.py) * 3)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
          continue
        }
        const img = k.fire
          ? sprite(FIRE_RGB[Math.min(3, Math.floor(t * 4))], 0.25)
          : k.puff
            ? puff(k.rgb, p.variant)
            : sprite(k.rgb, 0.3)
        const s = p.size * (k.puff ? 2.2 : 1.6)
        // Flames are tongues: taller than wide.
        if (k.fire) ctx.drawImage(img, p.x - s * 0.4, p.y - s, s * 0.8, s * 1.7)
        else ctx.drawImage(img, p.x - s / 2, p.y - s / 2, s, s)
      }
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
    },
    clear() {
      list.length = 0
    },
  }
}

// ---- light ---------------------------------------------------------------------

// Glow sprites: a light falloff (bright core, long soft tail), cached per colour.
const glows = new Map()
function glowSprite(rgb) {
  if (glows.has(rgb)) return glows.get(rgb)
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, `rgba(${rgb},0.9)`)
  grad.addColorStop(0.25, `rgba(${rgb},0.45)`)
  grad.addColorStop(0.6, `rgba(${rgb},0.12)`)
  grad.addColorStop(1, `rgba(${rgb},0)`)
  g.fillStyle = grad
  g.fillRect(0, 0, size, size)
  glows.set(rgb, c)
  return c
}

/** Additive round glow. */
export function glow(ctx, x, y, r, rgb, a = 1) {
  if (a <= 0.003 || r <= 0) return
  const prevA = ctx.globalAlpha
  ctx.globalCompositeOperation = 'lighter'
  ctx.globalAlpha = Math.min(1, a)
  ctx.drawImage(glowSprite(rgb), x - r, y - r, r * 2, r * 2)
  ctx.globalAlpha = prevA
  ctx.globalCompositeOperation = 'source-over'
}

/** Flat elliptical light pool on the ground (wet asphalt). */
export function pool(ctx, x, y, rx, ry, rgb, a = 1) {
  if (a <= 0) return
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, ry / rx)
  glow(ctx, 0, 0, rx, rgb, a)
  ctx.restore()
}

/** A cone of light (headlight, searchlight) from (x, y) at `angle`. */
export function beam(ctx, x, y, angle, length, spread, rgb, a = 0.5) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  const g = ctx.createLinearGradient(0, 0, length, 0)
  g.addColorStop(0, `rgba(${rgb},${a})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, -2)
  ctx.lineTo(length, -length * spread)
  ctx.lineTo(length, length * spread)
  ctx.lineTo(0, 2)
  ctx.fill()
  ctx.restore()
}

/** Red/blue emergency strobe intensity at time t (0..1). */
export function strobe(t, offset = 0, rate = 2.2) {
  const ph = ((t + offset) * rate) % 1
  return ph < 0.12 || (ph > 0.22 && ph < 0.32) ? 1 : 0.08
}

// ---- sky and landscape ---------------------------------------------------------

export function sky(ctx, W, H, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, H)
  stops.forEach(([o, c]) => g.addColorStop(o, c))
  ctx.fillStyle = g
  ctx.fillRect(-W, -H, W * 3, H * 3)
}

export function makeStars(r, n, W, maxY) {
  return Array.from({ length: n }, () => ({ x: r() * W, y: r() * maxY, s: 0.6 + r() * 1.4, tw: r() * 6 }))
}

export function stars(ctx, list, t, a = 1) {
  ctx.fillStyle = '#dbe8ff'
  for (const s of list) {
    ctx.globalAlpha = a * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.6 + s.tw)))
    ctx.fillRect(s.x, s.y, s.s, s.s)
  }
  ctx.globalAlpha = 1
}

/** Layered cloud bands (overcast / storm). */
export function makeClouds(r, n, W, y0, y1) {
  return Array.from({ length: n }, () => ({ x: r() * W * 1.3 - W * 0.15, y: y0 + r() * (y1 - y0), w: 180 + r() * 320, h: 40 + r() * 70, v: 3 + r() * 6, a: 0.25 + r() * 0.35 }))
}

export function clouds(ctx, list, t, W, rgb = '60,72,92', light = 0) {
  for (const c of list) {
    const x = ((c.x + t * c.v) % (W * 1.4)) - W * 0.2
    ctx.globalAlpha = c.a
    ctx.drawImage(puff(rgb, (c.w | 0) % 6), x - c.w / 2, c.y - c.h, c.w, c.h * 2)
    if (light > 0) {
      ctx.globalAlpha = c.a * light
      ctx.globalCompositeOperation = 'lighter'
      ctx.drawImage(puff('255,140,60', (c.w | 0) % 6), x - c.w / 2, c.y - c.h * 0.4, c.w, c.h * 1.4)
      ctx.globalCompositeOperation = 'source-over'
    }
  }
  ctx.globalAlpha = 1
}

/** Distant mountain ridge (Zailiysky Alatau style). */
export function ridge(ctx, r, W, baseY, height, color, snow = false) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(-200, baseY)
  let x = -200
  const pts = []
  while (x < W + 200) {
    const y = baseY - height * (0.35 + r() * 0.65)
    pts.push([x, y])
    x += 60 + r() * 120
  }
  pts.forEach(([px, py]) => ctx.lineTo(px, py))
  ctx.lineTo(W + 200, baseY)
  ctx.closePath()
  ctx.fill()
  if (snow) {
    ctx.fillStyle = 'rgba(220,232,246,0.35)'
    pts.forEach(([px, py]) => {
      ctx.beginPath()
      ctx.moveTo(px - 22, py + 26)
      ctx.lineTo(px, py)
      ctx.lineTo(px + 22, py + 26)
      ctx.fill()
    })
  }
}

/** A row of distant city blocks with lit windows. */
export function makeSkyline(r, W, baseY, { count = 34, minH = 60, maxH = 240 } = {}) {
  const list = []
  let x = -120
  while (x < W + 120 && list.length < count * 2) {
    const w = 40 + r() * 70
    const h = minH + r() * (maxH - minH)
    const lit = Array.from({ length: Math.floor(h / 14) * Math.floor(w / 12) }, () => r() < 0.28)
    list.push({ x, w, h, lit, top: r() < 0.25 ? 'antenna' : r() < 0.4 ? 'step' : 'flat' })
    x += w + 4 + r() * 18
  }
  return { list, baseY }
}

export function skyline(ctx, s, color, windowRgb = '255,214,140', windowA = 0.55) {
  for (const b of s.list) {
    const y = s.baseY - b.h
    ctx.fillStyle = color
    ctx.fillRect(b.x, y, b.w, b.h)
    if (b.top === 'step') ctx.fillRect(b.x + b.w * 0.2, y - 14, b.w * 0.6, 14)
    if (b.top === 'antenna') ctx.fillRect(b.x + b.w * 0.5, y - 26, 2, 26)
    const cols = Math.floor(b.w / 12)
    ctx.fillStyle = `rgba(${windowRgb},${windowA})`
    b.lit.forEach((on, i) => {
      if (!on) return
      const cx = i % cols
      const cy = Math.floor(i / cols)
      ctx.fillRect(b.x + 4 + cx * 12, y + 8 + cy * 14, 5, 6)
    })
  }
}

// ---- ground ----------------------------------------------------------------------

/** Ground plane with a road; `wet` adds the glossy band for reflections. */
export function ground(ctx, W, y, { color = '#141c27', road = true, roadY = y + 70, roadH = 90, wet = false } = {}) {
  const g = ctx.createLinearGradient(0, y, 0, y + 400)
  g.addColorStop(0, color)
  g.addColorStop(1, '#070b11')
  ctx.fillStyle = g
  ctx.fillRect(-W, y, W * 3, 900)
  if (!road) return
  const rg = ctx.createLinearGradient(0, roadY, 0, roadY + roadH)
  rg.addColorStop(0, wet ? '#1d2735' : '#202834')
  rg.addColorStop(1, wet ? '#121a26' : '#171e28')
  ctx.fillStyle = rg
  ctx.fillRect(-W, roadY, W * 3, roadH)
  ctx.fillStyle = 'rgba(210,220,232,0.35)'
  for (let x = -W; x < W * 2; x += 90) ctx.fillRect(x, roadY + roadH / 2 - 2, 46, 4)
  ctx.fillStyle = 'rgba(160,170,184,0.25)'
  ctx.fillRect(-W, roadY, W * 3, 3)
}

/** Mirrored, blurred-looking reflection of lights on wet ground. */
export function reflect(ctx, x, y, h, rgb, a = 0.5) {
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, `rgba(${rgb},${a})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.globalCompositeOperation = 'lighter'
  ctx.fillStyle = g
  ctx.fillRect(x - 6, y, 12, h)
  ctx.globalCompositeOperation = 'source-over'
}

// ---- structures ------------------------------------------------------------------

/**
 * Multi-storey building with a side face (2.5D). `fire` (0..1) lights the
 * burning windows orange and flickers them; `damage` scorches the facade.
 */
export function building(ctx, b, t = 0, fire = 0) {
  const { x, y, w, h, depth = 26, floors = 5, cols = 4, wall = '#2a3646', side = '#1c2532', lit = 0.3, burning = [] } = b
  const top = y - h
  // side face
  ctx.fillStyle = side
  ctx.beginPath()
  ctx.moveTo(x + w, top)
  ctx.lineTo(x + w + depth, top - depth * 0.45)
  ctx.lineTo(x + w + depth, y - depth * 0.45)
  ctx.lineTo(x + w, y)
  ctx.closePath()
  ctx.fill()
  // roof
  ctx.fillStyle = '#334255'
  ctx.beginPath()
  ctx.moveTo(x, top)
  ctx.lineTo(x + depth, top - depth * 0.45)
  ctx.lineTo(x + w + depth, top - depth * 0.45)
  ctx.lineTo(x + w, top)
  ctx.closePath()
  ctx.fill()
  // front
  const fg = ctx.createLinearGradient(x, top, x, y)
  fg.addColorStop(0, wall)
  fg.addColorStop(1, shade(wall, -0.35))
  ctx.fillStyle = fg
  ctx.fillRect(x, top, w, h)
  // floors and windows
  const fh = h / floors
  const cw = w / cols
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const wx = x + c * cw + cw * 0.22
      const wy = top + f * fh + fh * 0.22
      const ww = cw * 0.56
      const wh = fh * 0.5
      const idx = f * cols + c
      const burn = burning.includes(idx) ? fire : 0
      if (burn > 0.05) {
        const fl = 0.75 + 0.25 * Math.sin(t * 13 + idx * 1.7) * Math.sin(t * 7.3 + idx)
        ctx.fillStyle = `rgba(255,${120 + 70 * fl},${30 + 20 * fl},${0.55 + 0.45 * burn})`
        ctx.fillRect(wx, wy, ww, wh)
        glow(ctx, wx + ww / 2, wy + wh / 2, ww * 2.4, '255,120,40', 0.5 * burn * fl)
      } else {
        const on = ((idx * 7919) % 100) / 100 < lit
        ctx.fillStyle = on ? 'rgba(255,214,150,0.55)' : 'rgba(120,150,180,0.18)'
        ctx.fillRect(wx, wy, ww, wh)
      }
    }
  }
  // soot above burning windows
  if (fire > 0.05) {
    for (const idx of burning) {
      const f = Math.floor(idx / cols)
      const c = idx % cols
      const sx = x + c * cw + cw * 0.5
      const sy = top + f * fh
      const sg = ctx.createLinearGradient(0, sy + fh * 0.3, 0, sy - fh * 0.9)
      sg.addColorStop(0, `rgba(10,10,12,${0.55 * Math.max(fire, 0.4)})`)
      sg.addColorStop(1, 'rgba(10,10,12,0)')
      ctx.fillStyle = sg
      ctx.fillRect(sx - cw * 0.45, sy - fh * 0.9, cw * 0.9, fh * 1.2)
    }
  }
}

/** Darkens (k < 0) or lightens (k > 0) a #rrggbb colour. */
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v) => Math.round(Math.min(255, Math.max(0, k < 0 ? v * (1 + k) : v + (255 - v) * k)))
  const r = f(n >> 16)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

/** Vertical storage tank with a shiny cylinder shading. */
export function tank(ctx, x, y, w, h, { color = '#b9c4cf', label = '' } = {}) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0)
  g.addColorStop(0, shade(color, -0.55))
  g.addColorStop(0.35, shade(color, 0.15))
  g.addColorStop(0.55, color)
  g.addColorStop(1, shade(color, -0.6))
  ctx.fillStyle = g
  ctx.fillRect(x, y - h, w, h)
  ctx.beginPath()
  ctx.ellipse(x + w / 2, y - h, w / 2, w * 0.12, 0, 0, Math.PI * 2)
  ctx.fillStyle = shade(color, 0.05)
  ctx.fill()
  ctx.strokeStyle = 'rgba(30,40,52,0.5)'
  ctx.lineWidth = 1.5
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(x, y - (h * i) / 4)
    ctx.lineTo(x + w, y - (h * i) / 4)
    ctx.stroke()
  }
  if (label) {
    ctx.fillStyle = 'rgba(20,30,44,0.7)'
    ctx.font = 'bold 14px Montserrat, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(label, x + w / 2, y - h * 0.55)
  }
}

/** Pipe rack between two points with flanges. */
export function pipe(ctx, x1, y1, x2, y2, w = 8, color = '#7d8a99') {
  ctx.strokeStyle = color
  ctx.lineWidth = w
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = w * 0.25
  ctx.beginPath()
  ctx.moveTo(x1, y1 - w * 0.25)
  ctx.lineTo(x2, y2 - w * 0.25)
  ctx.stroke()
}

/** Lattice tower (power / radio mast). */
export function lattice(ctx, x, y, h, w, color = '#5c6b7c', broken = 0) {
  ctx.strokeStyle = color
  ctx.lineWidth = 2.5
  const top = y - h
  const bend = broken * 60
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y)
  ctx.lineTo(x - 3 + bend, top)
  ctx.moveTo(x + w / 2, y)
  ctx.lineTo(x + 3 + bend, top)
  ctx.stroke()
  ctx.lineWidth = 1.2
  const steps = 10
  for (let i = 0; i < steps; i++) {
    const k1 = i / steps
    const k2 = (i + 1) / steps
    const lx1 = x - (w / 2) * (1 - k1) + bend * k1
    const rx1 = x + (w / 2) * (1 - k1) + bend * k1
    const lx2 = x - (w / 2) * (1 - k2) + bend * k2
    const rx2 = x + (w / 2) * (1 - k2) + bend * k2
    const y1 = y - h * k1
    const y2 = y - h * k2
    ctx.beginPath()
    ctx.moveTo(lx1, y1)
    ctx.lineTo(rx2, y2)
    ctx.moveTo(rx1, y1)
    ctx.lineTo(lx2, y2)
    ctx.moveTo(lx2, y2)
    ctx.lineTo(rx2, y2)
    ctx.stroke()
  }
}

/** Street lamp with a sodium light pool. */
export function lamp(ctx, x, gy, h = 120, on = 1) {
  ctx.strokeStyle = '#2a3442'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(x, gy)
  ctx.lineTo(x, gy - h)
  ctx.lineTo(x + 26, gy - h - 6)
  ctx.stroke()
  ctx.fillStyle = '#ffd38a'
  ctx.fillRect(x + 20, gy - h - 6, 14, 4)
  glow(ctx, x + 27, gy - h, 60, '255,196,110', 0.5 * on)
  pool(ctx, x + 27, gy + 10, 110, 22, '255,186,100', 0.32 * on)
}

// ---- vehicles --------------------------------------------------------------------

const VEHICLES = {
  fire: { body: '#c8202b', w: 150, h: 46, cab: 40, stripe: '#f2f2f2', ladder: true },
  tanker: { body: '#c8202b', w: 136, h: 48, cab: 38, stripe: '#f2f2f2', tank: true },
  ambulance: { body: '#eef2f6', w: 112, h: 50, cab: 34, stripe: '#d12a33', cross: true },
  command: { body: '#1d4e86', w: 150, h: 54, cab: 36, stripe: '#e8eef6', mast: true },
  rescue: { body: '#e86d1a', w: 128, h: 48, cab: 36, stripe: '#1d2a3a' },
  police: { body: '#f2f5f8', w: 92, h: 30, cab: 0, stripe: '#1e5aa8', car: true },
  bus: { body: '#d9a426', w: 170, h: 56, cab: 0, stripe: '#2a3646', bus: true },
  hazmat: { body: '#e3c22b', w: 128, h: 48, cab: 36, stripe: '#20262f' },
  comms: { body: '#2a5b8c', w: 140, h: 50, cab: 36, stripe: '#e8eef6', dish: true },
}

/**
 * Side view of an emergency vehicle at (x, groundY), facing right unless
 * `flip`. Beacons strobe red/blue, headlights cast a beam forward.
 */
export function vehicle(ctx, type, x, gy, { flip = false, t = 0, beacons = true, lights = true, scale = 1, moving = false } = {}) {
  const v = VEHICLES[type]
  ctx.save()
  ctx.translate(x, gy)
  ctx.scale(flip ? -scale : scale, scale)
  const { w, h, cab } = v
  const wheelR = v.car ? 8 : 11
  const bodyY = -wheelR - h + 4
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.beginPath()
  ctx.ellipse(0, 1, w * 0.6, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  const left = -w / 2
  const g = ctx.createLinearGradient(0, bodyY, 0, bodyY + h)
  g.addColorStop(0, shade(v.body, 0.12))
  g.addColorStop(1, shade(v.body, -0.35))
  ctx.fillStyle = g
  if (v.car) {
    ctx.beginPath()
    ctx.moveTo(left, -wheelR)
    ctx.lineTo(left, bodyY + 12)
    ctx.lineTo(left + 22, bodyY + 10)
    ctx.lineTo(left + 34, bodyY - 4)
    ctx.lineTo(left + 66, bodyY - 4)
    ctx.lineTo(left + 80, bodyY + 10)
    ctx.lineTo(w / 2, bodyY + 14)
    ctx.lineTo(w / 2, -wheelR)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(40,60,90,0.85)'
    ctx.fillRect(left + 36, bodyY - 1, 28, 10)
    ctx.fillStyle = v.stripe
    ctx.fillRect(left, bodyY + 18, w, 5)
  } else {
    // box body + cab
    ctx.fillRect(left, bodyY, w - cab, h)
    ctx.beginPath()
    ctx.moveTo(w / 2 - cab, bodyY + 6)
    ctx.lineTo(w / 2 - 10, bodyY + 6)
    ctx.lineTo(w / 2, bodyY + 24)
    ctx.lineTo(w / 2, bodyY + h)
    ctx.lineTo(w / 2 - cab, bodyY + h)
    ctx.closePath()
    ctx.fill()
    // windscreen
    ctx.fillStyle = 'rgba(52,78,112,0.9)'
    ctx.beginPath()
    ctx.moveTo(w / 2 - cab + 6, bodyY + 10)
    ctx.lineTo(w / 2 - 12, bodyY + 10)
    ctx.lineTo(w / 2 - 4, bodyY + 24)
    ctx.lineTo(w / 2 - cab + 6, bodyY + 24)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(w / 2 - cab + 8, bodyY + 12, 6, 10)
    // stripe and shutters
    ctx.fillStyle = v.stripe
    ctx.fillRect(left, bodyY + h * 0.62, w, 4)
    if (!v.bus) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      for (let i = 0; i < 3; i++) ctx.fillRect(left + 8 + i * ((w - cab - 16) / 3), bodyY + 8, (w - cab - 16) / 3 - 6, h * 0.48)
    } else {
      ctx.fillStyle = 'rgba(52,78,112,0.85)'
      for (let i = 0; i < 6; i++) ctx.fillRect(left + 10 + i * 24, bodyY + 10, 18, 16)
    }
    if (v.cross) {
      ctx.fillStyle = '#d12a33'
      ctx.fillRect(left + 30, bodyY + 14, 8, 22)
      ctx.fillRect(left + 23, bodyY + 21, 22, 8)
    }
    if (v.ladder) {
      ctx.fillStyle = '#9aa6b4'
      ctx.fillRect(left - 6, bodyY - 8, w - cab + 4, 5)
      for (let i = 0; i < 9; i++) ctx.fillRect(left - 2 + i * 12, bodyY - 11, 2, 9)
    }
    if (v.tank) {
      ctx.fillStyle = shade(v.body, -0.15)
      ctx.beginPath()
      ctx.roundRect(left + 4, bodyY - 6, w - cab - 10, 10, 5)
      ctx.fill()
    }
    if (v.mast) {
      ctx.fillStyle = '#c3ccd6'
      ctx.fillRect(left + 20, bodyY - 30, 3, 30)
      ctx.fillRect(left + 14, bodyY - 32, 15, 3)
    }
    if (v.dish) {
      ctx.fillStyle = '#d7dee6'
      ctx.beginPath()
      ctx.ellipse(left + 34, bodyY - 12, 14, 8, -0.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // wheels
  const wheels = v.car ? [left + 18, w / 2 - 18] : v.bus ? [left + 28, w / 2 - 30] : [left + 22, left + 48, w / 2 - 22]
  for (const wx of wheels) {
    ctx.fillStyle = '#0c0f14'
    ctx.beginPath()
    ctx.arc(wx, -wheelR, wheelR, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#8b96a3'
    ctx.beginPath()
    ctx.arc(wx, -wheelR, wheelR * 0.42, 0, Math.PI * 2)
    ctx.fill()
    if (moving) {
      ctx.strokeStyle = 'rgba(20,24,30,0.9)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      const a = t * 12
      ctx.moveTo(wx + Math.cos(a) * wheelR * 0.4, -wheelR + Math.sin(a) * wheelR * 0.4)
      ctx.lineTo(wx - Math.cos(a) * wheelR * 0.4, -wheelR - Math.sin(a) * wheelR * 0.4)
      ctx.stroke()
    }
  }
  // headlight + beam
  if (lights) {
    glow(ctx, w / 2 - 2, -wheelR - 12, 16, '255,244,214', 0.9)
    beam(ctx, w / 2, -wheelR - 12, 0.06, 260, 0.16, '255,240,210', 0.16)
    glow(ctx, left + 2, -wheelR - 12, 9, '255,40,40', 0.7)
  }
  ctx.restore()
  // beacons (unflipped coordinates so the glow stays round)
  if (beacons) {
    const by = gy + (bodyY - 4) * scale
    const bx1 = x + (flip ? -1 : 1) * (v.car ? -8 : w / 2 - cab + 8) * scale
    const bx2 = bx1 + (flip ? -1 : 1) * 14 * scale
    const r = strobe(t, x * 0.001)
    const b = strobe(t, x * 0.001 + 0.5)
    ctx.fillStyle = '#ff3b3b'
    ctx.fillRect(bx1 - 4, by - 3, 7, 5)
    ctx.fillStyle = '#3b8bff'
    ctx.fillRect(bx2 - 4, by - 3, 7, 5)
    glow(ctx, bx1, by, 70 * scale, '255,40,40', 0.75 * r)
    glow(ctx, bx2, by, 70 * scale, '60,140,255', 0.75 * b)
    return { r, b, bx1, bx2, by }
  }
  return null
}

// ---- people ----------------------------------------------------------------------

const OUTFIT = {
  firefighter: { coat: '#2b2f36', band: '#e6d24a', helmet: '#d8d8d8' },
  rescuer: { coat: '#e86d1a', band: '#f0f0f0', helmet: '#f2f2f2' },
  medic: { coat: '#f0f3f6', band: '#d12a33', helmet: null },
  hazmat: { coat: '#e3c22b', band: '#2b2f36', helmet: '#e3c22b' },
  police: { coat: '#24364f', band: '#cfd8e3', helmet: '#24364f' },
  civil: { coat: '#5a6b82', band: null, helmet: null },
  civil2: { coat: '#8a5a4a', band: null, helmet: null },
  civil3: { coat: '#4e6b55', band: null, helmet: null },
}

/** Small human figure (~34 units tall) with a walk cycle. */
export function person(ctx, x, gy, { kind = 'civil', t = 0, walking = false, flip = false, scale: s0 = 1, pose = 'stand' } = {}) {
  // Figures are drawn a little larger than true scale so they read on screen.
  const scale = s0 * 1.45
  const o = OUTFIT[kind] ?? OUTFIT.civil
  ctx.save()
  ctx.translate(x, gy)
  ctx.scale(flip ? -scale : scale, scale)
  const ph = walking ? Math.sin(t * 8) : 0
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.beginPath()
  ctx.ellipse(0, 0, 9, 2.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1a1f27'
  ctx.lineWidth = 3.2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-1.5, -14)
  ctx.lineTo(-1.5 + ph * 5, 0)
  ctx.moveTo(1.5, -14)
  ctx.lineTo(1.5 - ph * 5, 0)
  ctx.stroke()
  ctx.fillStyle = o.coat
  ctx.beginPath()
  ctx.roundRect(-5, -27, 10, 15, 3)
  ctx.fill()
  if (o.band) {
    ctx.fillStyle = o.band
    ctx.fillRect(-5, -18, 10, 2)
  }
  ctx.strokeStyle = o.coat
  ctx.lineWidth = 2.6
  ctx.beginPath()
  if (pose === 'wave') {
    ctx.moveTo(3, -24)
    ctx.lineTo(8, -34 + Math.sin(t * 6) * 3)
  } else if (pose === 'point') {
    ctx.moveTo(3, -24)
    ctx.lineTo(13, -26)
  } else if (pose === 'hose') {
    ctx.moveTo(3, -22)
    ctx.lineTo(12, -21)
  } else {
    ctx.moveTo(3, -24)
    ctx.lineTo(4 - ph * 3, -14)
  }
  ctx.moveTo(-3, -24)
  ctx.lineTo(-4 + ph * 3, -14)
  ctx.stroke()
  ctx.fillStyle = '#d8ad8a'
  ctx.beginPath()
  ctx.arc(0, -31, 3.6, 0, Math.PI * 2)
  ctx.fill()
  if (o.helmet) {
    ctx.fillStyle = o.helmet
    ctx.beginPath()
    ctx.arc(0, -32, 4, Math.PI, 0)
    ctx.fill()
  }
  ctx.restore()
}

// ---- water -------------------------------------------------------------------

/** Animated water surface from `level` down, with ripples and reflections. */
export function water(ctx, W, level, t, { rgb = '38,74,108', depth = 500, lights = [] } = {}) {
  const g = ctx.createLinearGradient(0, level, 0, level + depth)
  g.addColorStop(0, `rgba(${rgb},0.92)`)
  g.addColorStop(1, 'rgba(8,16,26,0.98)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-W, level + depth)
  for (let x = -W; x <= W * 2; x += 24) ctx.lineTo(x, level + Math.sin(x * 0.012 + t * 1.6) * 4 + Math.sin(x * 0.03 - t * 2.3) * 2)
  ctx.lineTo(W * 2, level + depth)
  ctx.closePath()
  ctx.fill()
  // ripples
  ctx.strokeStyle = 'rgba(190,220,250,0.18)'
  ctx.lineWidth = 1.4
  for (let i = 0; i < 26; i++) {
    const yy = level + 10 + ((i * 37) % 160)
    const xx = ((i * 211 + t * (12 + (i % 5) * 4)) % (W + 400)) - 200
    ctx.beginPath()
    ctx.moveTo(xx, yy)
    ctx.lineTo(xx + 40 + (i % 4) * 14, yy)
    ctx.stroke()
  }
  // light reflections stretched on the surface
  for (const l of lights) {
    for (let k = 0; k < 6; k++) {
      const yy = level + 6 + k * 14
      const wob = Math.sin(t * 3 + k + l.x * 0.01) * 6
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = `rgba(${l.rgb},${(l.a ?? 0.4) * (1 - k / 6)})`
      ctx.fillRect(l.x - 12 + wob, yy, 24 - k * 2, 3)
      ctx.globalCompositeOperation = 'source-over'
    }
  }
}

// ---- rain --------------------------------------------------------------------

export function makeRain(n, W, H) {
  return Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 900 + Math.random() * 500, l: 14 + Math.random() * 16 }))
}

export function rain(ctx, drops, dt, W, H, a = 0.4, wind = 160) {
  ctx.strokeStyle = `rgba(190,210,235,${a})`
  ctx.lineWidth = 1.1
  ctx.beginPath()
  for (const d of drops) {
    d.y += d.v * dt
    d.x += wind * dt
    if (d.y > H) {
      d.y = -20
      d.x = Math.random() * W
    }
    if (d.x > W) d.x -= W
    ctx.moveTo(d.x, d.y)
    ctx.lineTo(d.x - (wind / d.v) * d.l, d.y - d.l)
  }
  ctx.stroke()
}

// ---- overlays ------------------------------------------------------------------

/** Pulsing dashed ellipse marking a hazard (or, when controlled, a safe) zone. */
export function zone(ctx, x, y, rx, ry, t, { rgb = '255,84,64', a = 1, dash = true } = {}) {
  if (a <= 0) return
  const pulse = 0.6 + 0.4 * Math.sin(t * 3)
  ctx.save()
  ctx.globalAlpha = a
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${rgb},${0.08 + 0.06 * pulse})`
  ctx.fill()
  ctx.lineWidth = 2.2
  ctx.strokeStyle = `rgba(${rgb},${0.55 + 0.35 * pulse})`
  if (dash) {
    ctx.setLineDash([14, 10])
    ctx.lineDashOffset = -t * 30
  }
  ctx.stroke()
  ctx.restore()
}

/** Expanding ring (a confirmed action on the scene). */
export function ring(ctx, x, y, k, rgb = '96,200,255') {
  ctx.save()
  ctx.globalAlpha = 1 - k
  ctx.strokeStyle = `rgb(${rgb})`
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.ellipse(x, y, 20 + k * 160, (20 + k * 160) * 0.35, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

let grainCanvas = null
function grainTile() {
  if (grainCanvas) return grainCanvas
  grainCanvas = document.createElement('canvas')
  grainCanvas.width = grainCanvas.height = 128
  const g = grainCanvas.getContext('2d')
  const img = g.createImageData(128, 128)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v
    img.data[i + 3] = 22
  }
  g.putImageData(img, 0, 0)
  return grainCanvas
}

/** Colour grade, vignette and film grain over the whole view (CSS px). */
export function post(ctx, vw, vh, { tint = 'rgba(10,30,70,0.18)', vignette = 0.62, grain = true, fade = 0 } = {}) {
  ctx.fillStyle = tint
  ctx.fillRect(0, 0, vw, vh)
  const g = ctx.createRadialGradient(vw / 2, vh * 0.48, Math.min(vw, vh) * 0.25, vw / 2, vh / 2, Math.max(vw, vh) * 0.75)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(2,6,14,${vignette})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, vw, vh)
  if (grain) {
    ctx.globalAlpha = 0.5
    const tile = grainTile()
    const ox = (Math.random() * 128) | 0
    const oy = (Math.random() * 128) | 0
    for (let x = -ox; x < vw; x += 128) for (let y = -oy; y < vh; y += 128) ctx.drawImage(tile, x, y)
    ctx.globalAlpha = 1
  }
  if (fade > 0) {
    ctx.fillStyle = `rgba(2,6,14,${fade})`
    ctx.fillRect(0, 0, vw, vh)
  }
}
