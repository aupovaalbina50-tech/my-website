import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gauge, Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react'
import { supabase } from '../../../supabaseClient'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { MISSION_SCENARIOS } from '../../../data/missionScenarios.js'
import { createCinema } from './engine.js'
import './missionCinema.css'

// Scene module of each mission, loaded on demand.
const SCENES = {
  'stabilize-emergency': () => import('./scenes/flood.js'),
  'extinguish-fire': () => import('./scenes/fire.js'),
  'contain-accident': () => import('./scenes/industrial.js'),
  'run-evacuation': () => import('./scenes/evacuation.js'),
  'organize-response': () => import('./scenes/response.js'),
  'protect-population': () => import('./scenes/protection.js'),
  'restore-facility': () => import('./scenes/restore.js'),
  'organize-medical-aid': () => import('./scenes/medical.js'),
  'ensure-communications': () => import('./scenes/comms.js'),
}

const QUALITY_KEY = 'mission_cinema_quality'

function initialQuality() {
  try {
    const saved = localStorage.getItem(QUALITY_KEY)
    if (saved === 'lite' || saved === 'high') return saved
  } catch {
    /* storage unavailable */
  }
  const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4
  return weak || window.matchMedia?.('(max-width: 640px)').matches ? 'lite' : 'high'
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Terms of the mission's category whose Russian name contains a stem. */
function useRelatedTerms(categoryKey, stems) {
  const [state, setState] = useState({ loading: false, terms: [] })
  const key = stems?.join('|') ?? ''
  useEffect(() => {
    if (!stems?.length) return undefined
    let cancelled = false
    setState({ loading: true, terms: [] })
    supabase
      .from('terms')
      .select('id, kk, ru, en')
      .eq('category', categoryKey)
      .or(stems.map((s) => `ru.ilike.%${s}%`).join(','))
      .order('ru', { ascending: true })
      .limit(3)
      .then(({ data }) => !cancelled && setState({ loading: false, terms: data || [] }))
    return () => {
      cancelled = true
    }
    // `key` stands for the stems.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryKey, key])
  return state
}

function HotspotCard({ label, stems, categoryKey, c, onClose }) {
  const { terms, loading } = useRelatedTerms(categoryKey, stems)
  return (
    <div className="mc-spot-card" role="dialog" aria-label={label}>
      <div className="mc-spot-card-head">
        <strong>{label}</strong>
        <button type="button" className="mc-icon-btn" onClick={onClose} aria-label={c.close}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="mc-spot-card-label">{c.relatedTerms}</p>
      {loading ? (
        <p className="mc-muted">…</p>
      ) : terms.length === 0 ? (
        <p className="mc-muted">{c.noTerms}</p>
      ) : (
        <ul className="mc-spot-terms">
          {terms.map((term) => (
            <li key={term.id}>
              <Link to={`/account/terms/${term.id}`}>
                <span lang="kk">{term.kk}</span>
                <span lang="ru">{term.ru}</span>
                <span lang="en">{term.en}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The cinematic stage of a mission.
 *  mode 'intro': plays the opening sequence (skippable), then shows the
 *    brief with interactive points and the start button (`onStart`).
 *  mode 'live': the scene behind a test; `threat` (0..1) sets the state of
 *    the incident, `pulse` ({ kind: 'action' | 'error', id }) reacts to an
 *    answer, `outcome` ('success' | 'fail' | 'cleared') plays the final shot.
 */
function MissionCinema({
  mission,
  mode = 'live',
  autoplay = true,
  threat = null,
  pulse = null,
  outcome = null,
  onStart,
  startLabel,
  stageLabel = null,
  feedback = null,
  compact = false,
}) {
  const { t, lang } = useLanguage()
  const c = t.account.missions.cinema
  const scenario = MISSION_SCENARIOS[mission.id]
  const canvasRef = useRef(null)
  const engineRef = useRef(null)
  const sceneRef = useRef(null)
  const spotRefs = useRef({})
  const [ready, setReady] = useState(false)
  const [quality, setQuality] = useState(initialQuality)
  const [paused, setPaused] = useState(false)
  const [view, setView] = useState(mode === 'intro' && autoplay ? 'intro' : mode === 'intro' ? 'brief' : 'live')
  const [caption, setCaption] = useState(-1)
  const [spot, setSpot] = useState(null)
  const viewRef = useRef(view)
  viewRef.current = view

  const endIntro = useCallback(() => {
    setView('brief')
    setCaption(-1)
    engineRef.current?.setPhase('idle')
  }, [])

  // Create the engine for this mission; dispose of it on leave.
  useEffect(() => {
    let disposed = false
    const load = SCENES[mission.id]
    if (!load) return undefined
    load().then((mod) => {
      if (disposed || !canvasRef.current) return
      const scene = mod.default
      sceneRef.current = scene
      const startPhase = viewRef.current === 'intro' ? 'intro' : 'idle'
      engineRef.current = createCinema(canvasRef.current, scene, {
        quality,
        reducedMotion: reducedMotion(),
        onFrame: (rd) => {
          const st = rd.state
          if (st.phase === 'intro' && viewRef.current === 'intro') {
            let idx = -1
            scene.captions.forEach((cap, i) => {
              if (st.phaseT >= cap.t) idx = i
            })
            setCaption((prev) => (prev === idx ? prev : idx))
            if (st.phaseT >= scene.introDuration) endIntro()
          }
          // keep the interactive points glued to the scene
          if (viewRef.current === 'brief') {
            for (const h of scene.hotspots) {
              const el = spotRefs.current[h.id]
              if (!el) continue
              const p = rd.project(h.x, h.y, 1)
              el.style.transform = `translate(${p.x}px, ${p.y}px)`
            }
          }
        },
      })
      if (startPhase === 'idle') engineRef.current.setPhase('idle')
      setReady(true)
    })
    return () => {
      disposed = true
      engineRef.current?.dispose()
      engineRef.current = null
    }
    // The engine is created once per mission; quality changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id])

  useEffect(() => engineRef.current?.setQuality(quality), [quality])

  // Framing: the wide test strip shows more of the scene; with the brief
  // panel on the right (desktop) the incident moves to the left half.
  useEffect(() => {
    const e = engineRef.current
    if (!ready || !e) return
    const wide = window.matchMedia?.('(min-width: 721px)').matches
    if (compact) e.setFrame({ dy: -60, zk: 0.84 })
    else if (view === 'brief' && wide) {
      const scene = sceneRef.current
      e.setFrame({ dx: (scene.briefX ?? scene.shots.idle.x) + 250 - scene.shots.idle.x, dy: -10, zk: 1.02 })
    }
    else e.setFrame({})
  }, [ready, view, compact])

  // The opening sequence brings the stage into view: it only runs on screen.
  const stageRef = useRef(null)
  useEffect(() => {
    if (view === 'intro' || outcome) stageRef.current?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' })
    // only when the intro or the final shot starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view === 'intro', outcome])

  // live: incident state, answer reactions, final shot
  useEffect(() => {
    if (ready && threat !== null && !outcome) engineRef.current?.setThreat(threat)
  }, [ready, threat, outcome])
  useEffect(() => {
    if (ready && pulse) engineRef.current?.pulse(pulse.kind)
  }, [ready, pulse])
  useEffect(() => {
    if (!ready) return
    if (outcome === 'success') engineRef.current?.setOutcome('success')
    else if (outcome === 'cleared') engineRef.current?.setOutcome('success', 0.22)
    else if (outcome === 'fail') engineRef.current?.setOutcome('fail')
    else if (engineRef.current?.state.outcome) engineRef.current.reset(threat ?? undefined)
    // threat only matters when the outcome is cleared
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, outcome])

  const togglePause = () => {
    const e = engineRef.current
    if (!e) return
    if (paused) e.resume()
    else e.pause()
    setPaused(!paused)
  }
  const replay = () => {
    setSpot(null)
    setPaused(false)
    setView('intro')
    setCaption(-1)
    engineRef.current?.replayIntro()
  }
  const toggleQuality = () => {
    const next = quality === 'lite' ? 'high' : 'lite'
    setQuality(next)
    try {
      localStorage.setItem(QUALITY_KEY, next)
    } catch {
      /* storage unavailable */
    }
  }
  const openSpot = (h) => {
    setSpot(h.id)
    engineRef.current?.focus({ x: h.x, y: h.y, z: h.z })
  }
  const closeSpot = () => {
    setSpot(null)
    engineRef.current?.focus(null)
  }

  // Keyboard: Escape skips the intro or closes a point.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (viewRef.current === 'intro') endIntro()
      else if (spot) closeSpot()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // closeSpot is stable enough for this listener
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot, endIntro])

  const capKey = sceneRef.current?.captions[caption]?.key
  const spotData = spot ? scenario.hotspots[spot] : null

  return (
    <section
      ref={stageRef}
      className={`mc-stage mc-stage--${view}${compact ? ' mc-stage--compact' : ''}${outcome ? ` mc-stage--${outcome}` : ''}`}
      aria-label={c.sceneAria(mission.title[lang])}
    >
      <canvas ref={canvasRef} className="mc-canvas" aria-hidden="true" />

      {/* top bar: eyebrow, stage, controls */}
      <div className="mc-topbar">
        <span className="mc-eyebrow">
          <span className="mc-rec" aria-hidden="true" />
          {mission.number}
          <span className="mc-eyebrow-text"> · {c.eyebrow}</span>
          {stageLabel && <b className="mc-stage-label">{stageLabel}</b>}
        </span>
        <div className="mc-controls">
          <button type="button" className="mc-icon-btn" onClick={togglePause} aria-label={paused ? c.resume : c.pause} title={paused ? c.resume : c.pause}>
            {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
          </button>
          {mode === 'intro' && (
            <button type="button" className="mc-icon-btn" onClick={replay} aria-label={c.replay} title={c.replay}>
              <RotateCcw size={16} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className={`mc-icon-btn${quality === 'lite' ? ' is-on' : ''}`}
            onClick={toggleQuality}
            aria-pressed={quality === 'lite'}
            aria-label={quality === 'lite' ? c.liteOn : c.lite}
            title={quality === 'lite' ? c.liteOn : c.lite}
          >
            <Gauge size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* intro: captions in sequence + skip */}
      {view === 'intro' && (
        <>
          <div className="mc-letterbox mc-letterbox--top" aria-hidden="true" />
          <div className="mc-letterbox mc-letterbox--bottom" aria-hidden="true" />
          {capKey && (
            <div className="mc-caption" key={capKey} role="status">
              <span className="mc-caption-label">{c.captions[capKey]}</span>
              <span className="mc-caption-text">{scenario[capKey][lang]}</span>
            </div>
          )}
          <button type="button" className="mc-skip" onClick={endIntro}>
            {c.skip}
            <SkipForward size={16} aria-hidden="true" />
          </button>
        </>
      )}

      {/* brief: interactive points + task panel */}
      {view === 'brief' && sceneRef.current && (
        <>
          <div className="mc-spots">
            {sceneRef.current.hotspots.map((h) => (
              <button
                key={h.id}
                ref={(el) => {
                  spotRefs.current[h.id] = el
                }}
                type="button"
                className={`mc-spot${spot === h.id ? ' is-on' : ''}`}
                onClick={() => (spot === h.id ? closeSpot() : openSpot(h))}
                aria-pressed={spot === h.id}
              >
                <span className="mc-spot-dot" aria-hidden="true" />
                <span className="mc-spot-label">{scenario.hotspots[h.id][lang]}</span>
              </button>
            ))}
          </div>
          {spotData && (
            <HotspotCard label={spotData[lang]} stems={spotData.terms} categoryKey={mission.categoryKey} c={c} onClose={closeSpot} />
          )}
          <div className="mc-brief">
            <span className="mc-brief-eyebrow">{c.briefTitle}</span>
            <h2 className="mc-brief-title">{mission.title[lang]}</h2>
            <dl className="mc-brief-facts">
              <div>
                <dt>{c.captions.type}</dt>
                <dd>{scenario.type[lang]}</dd>
              </div>
              <div>
                <dt>{c.captions.place}</dt>
                <dd>{scenario.place[lang]}</dd>
              </div>
              <div className="mc-brief-wide">
                <dt>{c.captions.situation}</dt>
                <dd>{scenario.situation[lang]}</dd>
              </div>
              <div className="mc-brief-wide">
                <dt>{c.captions.task}</dt>
                <dd>{scenario.task[lang]}</dd>
              </div>
            </dl>
            <p className="mc-muted mc-brief-hint">{c.hotspotsHint}</p>
            {onStart && (
              <button type="button" className="mc-primary" onClick={onStart}>
                {startLabel ?? c.start}
              </button>
            )}
          </div>
        </>
      )}

      {/* live: answer feedback over the scene */}
      {view === 'live' && feedback && (
        <div className={`mc-feedback mc-feedback--${feedback.kind}`} key={feedback.id} role="status">
          {feedback.kind === 'action' ? c.correctPulse : c.wrongPulse}
        </div>
      )}
      <p className="mc-disclaimer">{c.notReal}</p>
    </section>
  )
}

export default MissionCinema
