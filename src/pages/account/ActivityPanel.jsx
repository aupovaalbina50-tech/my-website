import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Activity } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { niceScale } from '../../utils/activitySeries.js'
import { useActivityTimeline } from './useActivityTimeline.js'
import './activityPanel.css'

const PERIODS = [7, 30]
const SERIES = [
  { key: 'study', className: 'is-study' },
  { key: 'practice', className: 'is-practice' },
]
const PAD = { top: 16, right: 16, bottom: 30, left: 34 }

const MONTHS = {
  kk: ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
}
const dayLabel = (date, lang) => `${date.getDate()} ${MONTHS[lang][date.getMonth()]}`

/** Width of an element, kept up to date. */
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

function ActivityChart({ days, lang, a, loading }) {
  const [wrapRef, width] = useWidth()
  const [active, setActive] = useState(null)
  const height = width < 520 ? 210 : 260
  const innerW = Math.max(width - PAD.left - PAD.right, 1)
  const innerH = height - PAD.top - PAD.bottom
  const max = Math.max(0, ...days.map((d) => Math.max(d.study, d.practice)))
  const { top, step } = niceScale(max)
  const x = (i) => PAD.left + (days.length === 1 ? innerW / 2 : (i * innerW) / (days.length - 1))
  const y = (v) => PAD.top + innerH - (v / top) * innerH
  const labelEvery = days.length <= 7 ? 1 : width < 520 ? 7 : 5
  const empty = !loading && max === 0

  // A new period starts without a selected day.
  useEffect(() => setActive(null), [days.length])

  const paths = Object.fromEntries(
    SERIES.map(({ key }) => [key, days.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')]),
  )

  const pick = (clientX) => {
    if (empty || loading) return
    const box = wrapRef.current?.getBoundingClientRect()
    if (!box) return
    const rel = clientX - box.left - PAD.left
    const i = Math.round((rel / innerW) * (days.length - 1))
    setActive(Math.min(days.length - 1, Math.max(0, i)))
  }

  const onKey = (e) => {
    if (empty || loading) return
    if (e.key === 'ArrowRight') setActive((i) => Math.min(days.length - 1, (i ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? days.length) - 1))
    else if (e.key === 'Escape') setActive(null)
    else return
    e.preventDefault()
  }

  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step)
  const current = active !== null ? days[active] : null
  // The tip sits beside the chosen day, on the side with more room, so it
  // never covers the points of that day.
  const tipStyle =
    active === null ? null : x(active) > width / 2 ? { right: width - x(active) + 12 } : { left: x(active) + 12 }
  const dotR = days.length <= 7 ? 3.5 : width < 520 ? 1.6 : 2.5

  return (
    <div className="ap-chart" ref={wrapRef} onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={a.chartAria(days.reduce((s, d) => s + d.study, 0), days.reduce((s, d) => s + d.practice, 0), days.length)}
          tabIndex={0}
          onKeyDown={onKey}
          onPointerMove={(e) => pick(e.clientX)}
          onPointerDown={(e) => pick(e.clientX)}
        >
          <defs>
            {SERIES.map(({ key }) => (
              <linearGradient key={key} id={`ap-fill-${key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" className={`ap-stop-${key}`} stopOpacity="0.22" />
                <stop offset="100%" className={`ap-stop-${key}`} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {ticks.map((v) => (
            <g key={v}>
              <line className="ap-grid" x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} />
              <text className="ap-axis" x={PAD.left - 8} y={y(v)} dy="0.35em" textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {days.map((d, i) =>
            i % labelEvery === (days.length - 1) % labelEvery ? (
              <text key={d.key} className="ap-axis" x={x(i)} y={height - 8} textAnchor="middle">
                {dayLabel(d.date, lang)}
              </text>
            ) : null,
          )}

          {current && <line className="ap-guide" x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + innerH} />}

          {!loading &&
            SERIES.map(({ key, className }) => (
              <g key={`${key}-${days.length}`} className={`ap-series ${className}`}>
                <path className="ap-area" d={`${paths[key]} L${x(days.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#ap-fill-${key})`} />
                <path className="ap-line" d={paths[key]} pathLength="1" />
                {days.map((d, i) => (
                  <circle
                    key={d.key}
                    className={`ap-dot${active === i ? ' is-active' : ''}`}
                    cx={x(i)}
                    cy={y(d[key])}
                    r={active === i ? 5 : dotR}
                  />
                ))}
              </g>
            ))}
        </svg>
      )}

      {current && (
        <div className="ap-tip" style={tipStyle} role="status">
          <strong>{dayLabel(current.date, lang)}</strong>
          <span className="ap-tip-row is-study">
            <i aria-hidden="true" />
            {a.study}: <b>{current.study}</b>
          </span>
          <span className="ap-tip-row is-practice">
            <i aria-hidden="true" />
            {a.practice}: <b>{current.practice}</b>
          </span>
        </div>
      )}

      {loading && <p className="ap-overlay">{a.loading}</p>}
      {empty && <p className="ap-overlay">{a.empty}</p>}
    </div>
  )
}

/**
 * «Динамика активности»: a 7/30-day chart of the user's own actions and a
 * compact row of four indicators. Values come from the caller (mission
 * progress) and from useActivityTimeline (the activity log).
 */
function ActivityPanel({ metrics }) {
  const { lang, t } = useLanguage()
  const a = t.account.home.activity
  const [period, setPeriod] = useState(7)
  const { days, loading, error, approximate } = useActivityTimeline()
  const shown = useMemo(() => days.slice(-period), [days, period])

  return (
    <section className="dash-section ap-panel" aria-labelledby="ap-title">
      <header className="ap-head">
        <h2 className="ap-title" id="ap-title">
          <Activity size={20} aria-hidden="true" />
          {a.title}
        </h2>
        <div className="ap-periods" role="group" aria-label={a.periodAria}>
          {PERIODS.map((p) => (
            <button key={p} type="button" className={period === p ? 'is-on' : undefined} aria-pressed={period === p} onClick={() => setPeriod(p)}>
              {a.period(p)}
            </button>
          ))}
        </div>
      </header>

      <ul className="ap-legend">
        {SERIES.map(({ key, className }) => (
          <li key={key} className={className}>
            <i aria-hidden="true" />
            {a[key]}
          </li>
        ))}
      </ul>

      <ActivityChart days={shown} lang={lang} a={a} loading={loading} />
      {error && <p className="ap-note">{a.error}</p>}
      {approximate && <p className="ap-note">{a.approximate}</p>}

      <dl className="ap-metrics">
        {metrics.map((m) => (
          <div key={m.key}>
            <dt>{m.label}</dt>
            <dd>
              <span className="ap-metric-value">{m.value ?? '—'}</span>
              {m.caption && <span className="ap-metric-caption">{m.caption}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default ActivityPanel
