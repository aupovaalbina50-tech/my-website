// Small shared components of the inspector UI.

import { isPairTerm } from './confusables.js'
import { isStyleTerm } from './styleRules.js'

const TRILINGUAL = [
  ['kk', 'ҚАЗ'],
  ['ru', 'РУС'],
  ['en', 'ENG'],
]

/** How the base term is written in all three languages (never translated by us). */
export function TrilingualLine({ term, ti }) {
  if (!term || isPairTerm(term) || isStyleTerm(term)) return null
  return (
    <p className="insp-trilingual" aria-label={ti.trilingualLabel}>
      {TRILINGUAL.map(([key, label]) => (
        <span key={key} className="insp-trilingual-item">
          <span className="insp-trilingual-lang">{label}</span>
          {term[key] ? term[key] : <em className="insp-muted">{ti.notInBase}</em>}
        </span>
      ))}
    </p>
  )
}
