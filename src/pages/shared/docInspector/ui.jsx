// Small shared components of the inspector UI.

import { isPairTerm } from './confusables.js'

export function ConfidenceBadge({ result, ti }) {
  const icon = { high: '🟢', medium: '🟡', low: '🔴' }[result.level]
  return (
    <span className={`inspector-confidence inspector-confidence--${result.level}`}>
      {icon} {ti.confidenceLevels[result.level]} · {Math.round(result.confidence * 100)}%
    </span>
  )
}

const TRILINGUAL = [
  ['kk', 'ҚАЗ'],
  ['ru', 'РУС'],
  ['en', 'ENG'],
]

/** How the base term is written in all three languages (never translated by us). */
export function TrilingualLine({ term, ti }) {
  if (!term || isPairTerm(term)) return null
  return (
    <p className="inspector-trilingual">
      <span className="inspector-trilingual-label">{ti.trilingualLabel}:</span>
      {TRILINGUAL.map(([key, label]) => (
        <span key={key} className="inspector-trilingual-item">
          <span className="inspector-trilingual-lang">{label}</span>
          {term[key] ? term[key] : <em className="inspector-trilingual-missing">{ti.notInBase}</em>}
        </span>
      ))}
    </p>
  )
}
