// Shared backdrop of the mission scenes: sky, mountains, distant city, the
// colour grade. A scene picks a mood and adds its own mid and near layers.
import { clouds, makeClouds, makeSkyline, makeStars, post, ridge, seeded, sky, skyline, stars } from '../fx.js'

export const MOODS = {
  dusk: {
    sky: [[0, '#0b1730'], [0.45, '#1c2c4c'], [0.78, '#5a4a62'], [1, '#c2754c']],
    ridge: ['#1a2235', '#131a29'],
    city: '#101826',
    cloud: '48,58,82',
    tint: 'rgba(14,30,66,0.16)',
  },
  night: {
    sky: [[0, '#040a18'], [0.6, '#0c1a33'], [1, '#1d3150']],
    ridge: ['#0f1727', '#0b111d'],
    city: '#0a111d',
    cloud: '30,40,60',
    tint: 'rgba(8,24,60,0.2)',
  },
  storm: {
    sky: [[0, '#0b1422'], [0.5, '#1f2c3c'], [1, '#3d4b5a']],
    ridge: ['#1a2432', '#141c28'],
    city: '#111a26',
    cloud: '56,66,80',
    tint: 'rgba(12,28,52,0.22)',
  },
  overcast: {
    sky: [[0, '#1a2638'], [0.55, '#3a4a5e'], [1, '#6f7c8a']],
    ridge: ['#2a3546', '#222c3b'],
    city: '#1a2330',
    cloud: '80,92,108',
    tint: 'rgba(14,30,60,0.16)',
  },
  dawn: {
    sky: [[0, '#0d1a33'], [0.5, '#2b3f63'], [0.82, '#7f8aa6'], [1, '#d9a983']],
    ridge: ['#24304a', '#1b2539'],
    city: '#151f30',
    cloud: '70,82,104',
    tint: 'rgba(10,28,64,0.14)',
  },
}

/** Precomputed backdrop pieces for a scene. */
export function makeBackdrop(seed, { horizon = 560, starsN = 90, cloudsN = 9, skylineH = [50, 200] } = {}) {
  const r = seeded(seed)
  return {
    horizon,
    stars: makeStars(r, starsN, 1600, horizon - 220),
    clouds: makeClouds(r, cloudsN, 1600, 60, 300),
    ridgeSeedA: (r() * 1e9) | 0,
    ridgeSeedB: (r() * 1e9) | 0,
    skyline: makeSkyline(r, 1600, horizon, { minH: skylineH[0], maxH: skylineH[1] }),
  }
}

// Static far layers (ridges, distant city) are drawn once into an offscreen
// canvas and then only blitted: hundreds of windows per frame were the main
// cost of a frame.
const BAKE_X = -320
const BAKE_W = 2240
function bake(bd, key, top, bottom, draw) {
  bd.baked ??= {}
  if (bd.baked[key]) return bd.baked[key]
  const res = 1
  const c = document.createElement('canvas')
  c.width = Math.ceil(BAKE_W * res)
  c.height = Math.ceil((bottom - top) * res)
  const g = c.getContext('2d')
  g.setTransform(res, 0, 0, res, -BAKE_X * res, -top * res)
  draw(g)
  bd.baked[key] = { c, top, h: bottom - top }
  return bd.baked[key]
}
const blit = (ctx, b) => ctx.drawImage(b.c, BAKE_X, b.top, BAKE_W, b.h)

/** Sky, stars, clouds (p 0–0.1), ridges (0.15–0.2), distant city (0.35). */
export function drawBackdrop(rd, bd, mood, { glowRgb = null, glowA = 0, starA = 1, cloudLight = 0, city = true } = {}) {
  const m = MOODS[mood]
  const { ctx, state } = rd
  rd.layer(0, () => {
    sky(ctx, 1600, 900, m.sky)
    if (starA > 0) stars(ctx, bd.stars, state.t, starA)
  })
  rd.layer(0.08, () => clouds(ctx, bd.clouds, state.t, 1600, m.cloud, cloudLight))
  const ridgeA = bake(bd, `ra:${mood}`, bd.horizon - 260, bd.horizon + 2, (g) => ridge(g, seeded(bd.ridgeSeedA), 1600, bd.horizon - 40, 170, m.ridge[0], true))
  const ridgeB = bake(bd, `rb:${mood}`, bd.horizon - 140, bd.horizon + 2, (g) => ridge(g, seeded(bd.ridgeSeedB), 1600, bd.horizon - 10, 90, m.ridge[1]))
  rd.layer(0.16, () => blit(ctx, ridgeA))
  rd.layer(0.22, () => blit(ctx, ridgeB))
  if (city) {
    const sk = bake(bd, `city:${mood}`, bd.horizon - 300, bd.horizon + 2, (g) => skyline(g, bd.skyline, m.city))
    rd.layer(0.36, () => blit(ctx, sk))
  }
  // A glow over the horizon from the incident (fire, flashes).
  if (glowRgb && glowA > 0) {
    rd.layer(0.36, () => {
      const g = ctx.createRadialGradient(800, bd.horizon, 0, 800, bd.horizon, 700)
      g.addColorStop(0, `rgba(${glowRgb},${0.32 * glowA})`)
      g.addColorStop(1, `rgba(${glowRgb},0)`)
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 1600, 900)
      ctx.globalCompositeOperation = 'source-over'
    })
  }
}

/** Colour grade, vignette, grain, fade-in from black at the start of the intro. */
export function drawPost(rd, mood, { desaturate = 0 } = {}) {
  const { ctx, state } = rd
  const fadeIn = state.phase === 'intro' && !state.reducedMotion ? Math.max(0, 1 - state.phaseT / 1.6) : 0
  rd.screen(() => {
    if (desaturate > 0) {
      ctx.globalCompositeOperation = 'saturation'
      ctx.fillStyle = `rgba(128,128,128,${desaturate})`
      ctx.fillRect(0, 0, rd.vw, rd.vh)
      ctx.globalCompositeOperation = 'source-over'
    }
    post(ctx, rd.vw, rd.vh, { tint: MOODS[mood].tint, grain: state.quality !== 'lite', fade: fadeIn })
  })
}

/** Moves a value from a to b during [t0, t1] of the intro; idle = b. */
export function introLerp(state, t0, t1, a, b) {
  if (state.phase !== 'intro' || state.reducedMotion) return b
  const k = Math.min(1, Math.max(0, (state.phaseT - t0) / (t1 - t0)))
  const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
  return a + (b - a) * e
}

/** 0..1 progress of the outcome sequence over `dur` seconds. */
export function outcomeK(state, dur = 5) {
  return state.outcome ? Math.min(1, state.outcomeT / dur) : 0
}

/** Strength of an «action» pulse (correct answer) right now, 0..1. */
export function pulseK(state, kind = 'action') {
  let k = 0
  for (const p of state.pulses) if (p.kind === kind) k = Math.max(k, Math.sin(Math.min(1, p.t / p.life) * Math.PI))
  return k
}
