// More scene objects: houses, tents, sandbags, siren, shelter, crane,
// rubble, boat, signal waves. World units, like fx.js.
import { glow, shade } from './fx.js'

/** Low house with a pitched roof. */
export function house(ctx, x, gy, w = 120, h = 80, { wall = '#3b4658', roof = '#28313f', lit = true } = {}) {
  ctx.fillStyle = shade(wall, -0.2)
  ctx.fillRect(x, gy - h, w, h)
  const g = ctx.createLinearGradient(0, gy - h, 0, gy)
  g.addColorStop(0, wall)
  g.addColorStop(1, shade(wall, -0.4))
  ctx.fillStyle = g
  ctx.fillRect(x, gy - h, w, h)
  ctx.fillStyle = roof
  ctx.beginPath()
  ctx.moveTo(x - 10, gy - h)
  ctx.lineTo(x + w / 2, gy - h - h * 0.55)
  ctx.lineTo(x + w + 10, gy - h)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = lit ? 'rgba(255,206,140,0.6)' : 'rgba(110,140,170,0.25)'
  ctx.fillRect(x + w * 0.16, gy - h * 0.7, w * 0.22, h * 0.3)
  ctx.fillRect(x + w * 0.62, gy - h * 0.7, w * 0.22, h * 0.3)
  if (lit) {
    glow(ctx, x + w * 0.27, gy - h * 0.55, 40, '255,190,110', 0.25)
    glow(ctx, x + w * 0.73, gy - h * 0.55, 40, '255,190,110', 0.25)
  }
  ctx.fillStyle = '#151c26'
  ctx.fillRect(x + w * 0.44, gy - h * 0.5, w * 0.14, h * 0.5)
}

/** Field tent (medical, command); `cross` paints a red cross. */
export function tent(ctx, x, gy, w = 170, h = 80, { color = '#5f7a5a', cross = false, glowOn = 0 } = {}) {
  ctx.fillStyle = shade(color, -0.25)
  ctx.beginPath()
  ctx.moveTo(x, gy)
  ctx.lineTo(x + 18, gy - h)
  ctx.lineTo(x + w - 18, gy - h)
  ctx.lineTo(x + w, gy)
  ctx.closePath()
  ctx.fill()
  const g = ctx.createLinearGradient(0, gy - h, 0, gy)
  g.addColorStop(0, shade(color, 0.12))
  g.addColorStop(1, shade(color, -0.3))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x + 6, gy)
  ctx.lineTo(x + 22, gy - h + 6)
  ctx.lineTo(x + w - 22, gy - h + 6)
  ctx.lineTo(x + w - 6, gy)
  ctx.closePath()
  ctx.fill()
  // entrance with inner light
  ctx.fillStyle = glowOn > 0 ? `rgba(255,236,196,${0.55 + 0.3 * glowOn})` : '#1a2230'
  ctx.beginPath()
  ctx.moveTo(x + w / 2 - 22, gy)
  ctx.lineTo(x + w / 2 - 12, gy - h * 0.62)
  ctx.lineTo(x + w / 2 + 12, gy - h * 0.62)
  ctx.lineTo(x + w / 2 + 22, gy)
  ctx.closePath()
  ctx.fill()
  if (glowOn > 0) glow(ctx, x + w / 2, gy - h * 0.3, 90, '255,226,170', 0.35 * glowOn)
  if (cross) {
    ctx.fillStyle = '#f2f4f7'
    ctx.fillRect(x + 30, gy - h * 0.72, 30, 30)
    ctx.fillStyle = '#d12a33'
    ctx.fillRect(x + 41, gy - h * 0.72 + 4, 8, 22)
    ctx.fillRect(x + 34, gy - h * 0.72 + 11, 22, 8)
  }
}

/** A row of sandbags (flood barrier); `n` bags long, `rows` high. */
export function sandbags(ctx, x, gy, n, rows = 2, built = 1) {
  const total = n * rows
  const shown = Math.round(total * built)
  let k = 0
  for (let r = 0; r < rows; r++) {
    for (let i = 0; i < n; i++) {
      if (k++ >= shown) return
      const bx = x + i * 26 + (r % 2) * 13
      const by = gy - r * 14
      ctx.fillStyle = r % 2 ? '#b49a6e' : '#a88e62'
      ctx.beginPath()
      ctx.ellipse(bx, by - 7, 14, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(60,46,30,0.45)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
}

/** Siren on a pole with sound arcs while `active`. */
export function siren(ctx, x, gy, t, active = 1) {
  ctx.fillStyle = '#3a4656'
  ctx.fillRect(x - 3, gy - 170, 6, 170)
  ctx.fillStyle = '#c9d1db'
  ctx.beginPath()
  ctx.moveTo(x - 4, gy - 176)
  ctx.lineTo(x - 30, gy - 190)
  ctx.lineTo(x - 30, gy - 160)
  ctx.closePath()
  ctx.moveTo(x + 4, gy - 176)
  ctx.lineTo(x + 30, gy - 190)
  ctx.lineTo(x + 30, gy - 160)
  ctx.closePath()
  ctx.fill()
  if (active <= 0) return
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.8 + i / 3) % 1
    ctx.strokeStyle = `rgba(255,200,90,${(1 - k) * 0.6 * active})`
    ctx.lineWidth = 2
    for (const dir of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(x + dir * 30, gy - 175, 20 + k * 140, dir < 0 ? Math.PI * 0.8 : -Math.PI * 0.2, dir < 0 ? Math.PI * 1.2 : Math.PI * 0.2)
      ctx.stroke()
    }
  }
}

/** Protective shelter entrance (half-buried, with a heavy door). */
export function shelter(ctx, x, gy, open = 1) {
  ctx.fillStyle = '#4c5866'
  ctx.beginPath()
  ctx.moveTo(x - 110, gy)
  ctx.quadraticCurveTo(x, gy - 120, x + 110, gy)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#5c6a79'
  ctx.fillRect(x - 46, gy - 76, 92, 76)
  ctx.fillStyle = '#11161e'
  ctx.fillRect(x - 34, gy - 64, 68, 64)
  // door slides shut as `open` → 0
  ctx.fillStyle = '#7d8a99'
  ctx.fillRect(x - 34 + 68 * open, gy - 64, 68 * (1 - open), 64)
  glow(ctx, x, gy - 30, 70, '255,226,170', 0.35 * open)
  ctx.fillStyle = '#e8edf2'
  ctx.font = 'bold 13px Montserrat, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('ЗС ГО', x, gy - 82)
}

/** Tower crane; `swing` rotates the jib slightly, hook at `hookY`. */
export function crane(ctx, x, gy, h = 420, swing = 0, hookY = 200) {
  ctx.strokeStyle = '#e0a526'
  ctx.lineWidth = 3
  const top = gy - h
  for (let y = gy; y > top; y -= 24) {
    ctx.strokeRect(x - 10, y - 24, 20, 24)
    ctx.beginPath()
    ctx.moveTo(x - 10, y)
    ctx.lineTo(x + 10, y - 24)
    ctx.stroke()
  }
  ctx.save()
  ctx.translate(x, top)
  ctx.rotate(swing)
  ctx.fillStyle = '#e0a526'
  ctx.fillRect(-90, -10, 330, 10)
  ctx.fillStyle = '#4a5462'
  ctx.fillRect(-90, -4, 40, 20)
  ctx.strokeStyle = '#2a3240'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(200, 0)
  ctx.lineTo(200, hookY)
  ctx.stroke()
  ctx.fillStyle = '#c3ccd6'
  ctx.fillRect(184, hookY, 32, 12)
  ctx.restore()
  glow(ctx, x, top - 14, 20, '255,60,60', 0.6)
}

/** Heap of rubble with broken slabs and rebar. */
export function rubble(ctx, x, gy, w, h, seedR) {
  ctx.fillStyle = '#4a4f57'
  ctx.beginPath()
  ctx.moveTo(x, gy)
  for (let i = 0; i <= 12; i++) {
    const px = x + (w * i) / 12
    const py = gy - h * Math.sin((Math.PI * i) / 12) * (0.6 + seedR() * 0.4)
    ctx.lineTo(px, py)
  }
  ctx.lineTo(x + w, gy)
  ctx.closePath()
  ctx.fill()
  for (let i = 0; i < 14; i++) {
    const sx = x + seedR() * w
    const sy = gy - seedR() * h * 0.8
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate((seedR() - 0.5) * 1.2)
    ctx.fillStyle = seedR() < 0.5 ? '#6a707a' : '#5a606a'
    ctx.fillRect(-20, -6, 40 + seedR() * 30, 10)
    ctx.restore()
  }
  ctx.strokeStyle = '#8a5a3a'
  ctx.lineWidth = 2
  for (let i = 0; i < 8; i++) {
    const sx = x + seedR() * w
    const sy = gy - seedR() * h * 0.7
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(sx + (seedR() - 0.5) * 40, sy - 20 - seedR() * 30)
    ctx.stroke()
  }
}

/** Inflatable rescue boat with an outboard wake. */
export function boat(ctx, x, wy, t, flip = false) {
  ctx.save()
  ctx.translate(x, wy + Math.sin(t * 2.2) * 2)
  ctx.scale(flip ? -1 : 1, 1)
  ctx.rotate(Math.sin(t * 1.7) * 0.03)
  ctx.fillStyle = '#e8651c'
  ctx.beginPath()
  ctx.roundRect(-60, -16, 120, 18, 9)
  ctx.fill()
  ctx.fillStyle = '#2b3442'
  ctx.fillRect(-64, -18, 8, 20)
  ctx.restore()
  ctx.strokeStyle = 'rgba(220,236,255,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  const dir = flip ? 1 : -1
  ctx.moveTo(x + dir * 62, wy)
  ctx.quadraticCurveTo(x + dir * 120, wy + 6, x + dir * 200, wy + 2)
  ctx.stroke()
}

/** Expanding radio waves from (x, y); `a` = strength. */
export function waves(ctx, x, y, t, a = 1, rgb = '120,210,255') {
  if (a <= 0) return
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.7 + i / 3) % 1
    ctx.strokeStyle = `rgba(${rgb},${(1 - k) * 0.7 * a})`
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(x, y, 14 + k * 160, -Math.PI * 0.85, -Math.PI * 0.15)
    ctx.stroke()
  }
}

/** Stretcher carried by two medics, walking. */
export function stretcher(ctx, x, gy, t, person) {
  person(ctx, x - 26, gy, { kind: 'medic', t, walking: true })
  person(ctx, x + 26, gy, { kind: 'medic', t, walking: true })
  ctx.fillStyle = '#d6dde4'
  ctx.fillRect(x - 30, gy - 22, 60, 5)
  ctx.fillStyle = '#4e6b8a'
  ctx.fillRect(x - 22, gy - 28, 40, 6)
}

/** Industrial building (shed) with a sawtooth roof. */
export function shed(ctx, x, gy, w, h, color = '#3a4554') {
  const g = ctx.createLinearGradient(0, gy - h, 0, gy)
  g.addColorStop(0, color)
  g.addColorStop(1, shade(color, -0.4))
  ctx.fillStyle = g
  ctx.fillRect(x, gy - h, w, h)
  ctx.fillStyle = shade(color, -0.15)
  const teeth = Math.max(2, Math.round(w / 60))
  for (let i = 0; i < teeth; i++) {
    const tx = x + (w * i) / teeth
    ctx.beginPath()
    ctx.moveTo(tx, gy - h)
    ctx.lineTo(tx + w / teeth, gy - h - 26)
    ctx.lineTo(tx + w / teeth, gy - h)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(150,180,210,0.25)'
  for (let i = 0; i < Math.floor(w / 50); i++) ctx.fillRect(x + 14 + i * 50, gy - h + 20, 30, 16)
}

/** Chimney / flare stack with a red top light. */
export function stack(ctx, x, gy, h, w = 26) {
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
  g.addColorStop(0, '#5b6574')
  g.addColorStop(0.5, '#9aa5b2')
  g.addColorStop(1, '#4b5462')
  ctx.fillStyle = g
  ctx.fillRect(x - w / 2, gy - h, w, h)
  ctx.fillStyle = '#c8202b'
  ctx.fillRect(x - w / 2, gy - h, w, 10)
  ctx.fillRect(x - w / 2, gy - h + 30, w, 8)
  glow(ctx, x, gy - h - 4, 24, '255,60,60', 0.7)
}
