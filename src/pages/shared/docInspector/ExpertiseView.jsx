// Building blocks of the «Цифровой инспектор терминологии»: the three-stage
// navigation, the filter bar, the finding cards (details on demand), the
// check notes, the final conclusion and the history of expertises. Every
// figure and text comes from the real results of the check (see expertise.js).

import { useEffect, useRef } from 'react'
import { BookmarkCheck, BookmarkPlus, Check, ChevronDown, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categoryOf, chosenFix } from './pipeline.js'
import { adiletUrl, isPairTerm, pairForResult } from './confusables.js'
import { conclusionText, isPartial, reasoningSteps, termProfile } from './expertise.js'
import { documentTypeLabel, entryText, same } from './helpers.js'
import { TrilingualLine } from './ui.jsx'

// ---- Stage navigation -------------------------------------------------------------

/**
 * Three stage cards. `stage` is the open one (1–3); `reachable(n)` says
 * whether stage n can be opened now, `done(n)` whether it is completed.
 */
export function StageNav({ stage, reachable, done, onGo, ti }) {
  return (
    <nav className="insp-stages" aria-label={ti.stepperLabel}>
      <ol>
        {ti.stageSteps.map((step, i) => {
          const n = i + 1
          const isActive = n === stage
          const isDone = done(n)
          return (
            <li key={step.title}>
              <button
                type="button"
                className={`insp-stage${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}`}
                aria-current={isActive ? 'step' : undefined}
                disabled={!isActive && !reachable(n)}
                onClick={() => onGo(n)}
              >
                <span className="insp-stage-num" aria-hidden="true">
                  {isDone && !isActive ? <Check size={14} strokeWidth={3} /> : n}
                </span>
                <span className="insp-stage-body">
                  <span className="insp-stage-kicker">
                    {ti.stageLabel(n)}
                    {isDone && <span className="insp-stage-done"> · {ti.stageDone}</span>}
                  </span>
                  <span className="insp-stage-title">{step.title}</span>
                  <span className="insp-stage-text">{step.text}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ---- Notes about how complete the check is ------------------------------------------

/** Honest notes on parts of the check that did not run fully. */
export function CheckNotes({ inspection, ti }) {
  const { ai, lookup, unreadablePages, illegiblePages } = inspection
  const notes = []
  if (ai?.failedChunks > 0) {
    notes.push({
      key: 'ai',
      warn: true,
      text: `${ti.aiFailed(ai.failedChunks, ai.totalChunks)}${ai.error && ti.errors[ai.error] ? ` (${ti.errors[ai.error]})` : ''}`,
    })
  }
  if (lookup?.failed > 0) notes.push({ key: 'lookup-failed', warn: true, text: ti.lookupFailed(lookup.failed) })
  if (unreadablePages > 0 || illegiblePages > 0) notes.push({ key: 'ocr', warn: true, text: ti.illegibleNote })
  if (lookup?.searched > 0) notes.push({ key: 'lookup', text: ti.lookupNote(lookup.searched, lookup.found) })
  if (inspection.fromHistory) notes.push({ key: 'history', text: ti.history.reopenedNote })
  if (inspection.glossarySize) notes.push({ key: 'base', text: ti.baseNote(inspection.glossarySize) })
  if (!notes.length) return null
  return (
    <ul className="insp-notes">
      {notes.map((note) => (
        <li key={note.key} className={note.warn ? 'is-warning' : undefined}>
          {note.text}
        </li>
      ))}
    </ul>
  )
}

// ---- Figures ------------------------------------------------------------------------

const STAT_KEYS = ['ok', 'misuse', 'mismatch', 'uncertain', 'ambiguous']

/** Counts of the check; categories with nothing in them are shown only when relevant. */
export function StatList({ summary, fixed = null, ti }) {
  return (
    <dl className="insp-stats">
      <div className="insp-stat">
        <dt>{ti.finalStats.checked}</dt>
        <dd>{summary.total}</dd>
      </div>
      {STAT_KEYS.map((key) => (
        <div key={key} className={`insp-stat insp-stat--${key}`}>
          <dt>{ti.finalStats[key]}</dt>
          <dd>{summary.counts[key]}</dd>
        </div>
      ))}
      {fixed !== null && (
        <div className="insp-stat">
          <dt>{ti.finalStats.fixed}</dt>
          <dd>{fixed}</dd>
        </div>
      )}
    </dl>
  )
}

// ---- Filters ------------------------------------------------------------------------

const FILTERS = ['all', 'misuse', 'mismatch', 'uncertain', 'ambiguous', 'ok']

export function FilterBar({ filter, onChange, summary, ti }) {
  return (
    <div className="insp-filters" role="tablist" aria-label={ti.filtersLabel}>
      {FILTERS.map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={filter === key}
          className={`insp-filter${filter === key ? ' is-active' : ''}`}
          onClick={() => onChange(key)}
        >
          {ti.filterLabels[key]}
          <span className="insp-filter-count">{key === 'all' ? summary.total : summary.counts[key]}</span>
        </button>
      ))}
    </div>
  )
}

// ---- Statuses -----------------------------------------------------------------------

export function StatusBadge({ category, ti }) {
  return <span className={`insp-status insp-status--${category}`}>{ti.categories[category]}</span>
}

/**
 * Why a finding «требует внимания»: not verifiable in the base, found only in
 * an external source, a possible inaccuracy or a low-confidence match.
 */
function statusNote(result, ti) {
  if (categoryOf(result) !== 'uncertain') return null
  if (!result.candidates.length) return result.external ? ti.statusNotes.external : ti.statusNotes.notVerified
  if (result.errorType === 'inaccuracy') return ti.statusNotes.possible
  return ti.statusNotes.lowConfidence
}

// ---- Finding cards --------------------------------------------------------------------

function WhyBlock({ result, location, ti, lang }) {
  return (
    <details className="insp-why">
      <summary>{ti.whyTitle}</summary>
      <ol>
        {reasoningSteps(result, ti, location, lang).map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </details>
  )
}

/** «Основание решения»: source, official term and — only where the site has it — the definition. */
function BasisBlock({ result, candidate, ti, lang }) {
  const pair = pairForResult(result)
  const fromPair = candidate && isPairTerm(candidate.term)
  let source
  let term = null
  let definition = null
  let links = []
  if (fromPair && pair) {
    source = ti.basisConfusable
    term = candidate.official
    const side = candidate.term.id.endsWith(':A') ? pair.a : pair.b
    definition = side.definition[lang] ?? side.definition.ru
    links = pair.sources.map((s) => ({ href: adiletUrl(s.docId, lang), label: s.label[lang] }))
  } else if (candidate) {
    source = result.source === 'glossary' || result.baseMatch ? ti.basisGlossary : ti.basisBaseAi
    term = entryText(candidate.term, result, candidate.official)
  } else if (result.external) {
    source = ti.basisExternal
    term = result.external.officialTerm
    links = [{ href: result.external.sourceUrl, label: result.external.sourceTitle }]
  } else {
    source = ti.basisNone
  }
  return (
    <div className={`insp-basis${!candidate ? ' insp-basis--unconfirmed' : ''}`}>
      <p className="insp-basis-title">{ti.basisTitle}</p>
      <dl>
        <dt>{ti.basisSource}</dt>
        <dd>
          {source}
          {links.map((link) => (
            <a key={link.href + link.label} className="insp-link insp-link--block" href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label} ↗
            </a>
          ))}
        </dd>
        {term && (
          <>
            <dt>{ti.basisTerm}</dt>
            <dd>«{term}»</dd>
          </>
        )}
        {candidate && (
          <>
            <dt>{ti.basisDefinition}</dt>
            <dd>{definition ?? <span className="insp-muted">{ti.definitionMissing}</span>}</dd>
          </>
        )}
      </dl>
    </div>
  )
}

/** The recommended replacement as shown on the card, or what to say instead. */
function recommendation(result, candidate, ti) {
  if (result.candidates.length > 1) return { kind: 'several', label: ti.recommendedShort, text: ti.severalVariants(result.candidates.length) }
  if (candidate) return { kind: 'base', label: ti.recommendedShort, text: `«${candidate.suggestion || entryText(candidate.term, result, candidate.official)}»` }
  if (result.external) return { kind: 'external', label: ti.externalMatch, text: `«${result.external.officialTerm}»` }
  return { kind: 'none', label: null, text: ti.noOfficial }
}

export function OkRow({ result, location, selected, onShow, ti }) {
  const official = entryText(result.term, result, result.official)
  const differs = official && official.toLowerCase() !== result.text.toLowerCase()
  return (
    <li className={`insp-finding insp-finding--ok${selected ? ' is-selected' : ''}`} id={`finding-${result.id}`}>
      <div className="insp-finding-head">
        <p className="insp-finding-term">«{result.text}»</p>
        <StatusBadge category="ok" ti={ti} />
      </div>
      <p className="insp-finding-meta">
        {location} · {ti.okNote}
        {differs && `: «${official}»`}
      </p>
      <TrilingualLine term={result.term} ti={ti} />
      <div className="insp-finding-actions">
        <button type="button" className="insp-text-btn" onClick={() => onShow(result)}>
          {ti.showInDocument}
        </button>
      </div>
    </li>
  )
}

export function FindingCard({
  result,
  number,
  location,
  decision,
  choice,
  onDecision,
  onChoose,
  onShow,
  selected,
  expanded,
  onToggle,
  favoriteIds,
  onAddToDictionary,
  ti,
  lang,
}) {
  const ref = useRef(null)
  const category = categoryOf(result)
  const several = result.candidates.length > 1
  const single = result.candidates.length === 1 ? result.candidates[0] : null
  const chosen = choice !== undefined && choice !== null ? result.candidates[choice] : null
  const shown = chosen ?? single
  const fix = chosenFix(result, decision, choice)
  const rejected = decision === 'rejected'
  const rec = recommendation(result, shown, ti)
  const pair = pairForResult(result)
  const canApply = Boolean(single?.applicable)
  const note = statusNote(result, ti)
  const explanation = !result.candidates.length && result.external ? result.external.reason || result.explanation : result.explanation

  // A finding picked in the document (or with «Подробнее» in its popup) scrolls into view.
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selected])

  const apply = () => {
    onDecision(result.id, null)
    if (result.status !== 'fix') onChoose(result.id, 0)
  }
  const unapply = () => {
    if (result.status === 'fix') onDecision(result.id, 'rejected')
    else onChoose(result.id, null)
  }

  return (
    <li
      ref={ref}
      id={`finding-${result.id}`}
      className={`insp-finding insp-finding--${category}${selected ? ' is-selected' : ''}${rejected ? ' is-rejected' : ''}`}
    >
      <div className="insp-finding-head">
        <p className="insp-finding-term">«{result.text}»</p>
        <StatusBadge category={category} ti={ti} />
      </div>
      <p className="insp-finding-meta">
        № {number} · {location}
        {note && ` · ${note}`}
      </p>
      <p className={`insp-finding-rec insp-finding-rec--${rec.kind}`}>
        {rec.label && <span className="insp-finding-rec-label">{rec.label}: </span>}
        {rec.text}
      </p>
      <TrilingualLine term={shown?.term ?? result.term} ti={ti} />

      <div className="insp-finding-actions">
        <button type="button" className="insp-text-btn" onClick={() => onToggle(result.id)} aria-expanded={expanded}>
          {expanded ? ti.less : ti.more}
          <ChevronDown size={14} aria-hidden="true" className={expanded ? 'insp-rotate' : undefined} />
        </button>
        <button type="button" className="insp-text-btn" onClick={() => onShow(result)}>
          {ti.showInDocument}
        </button>
        <span className="insp-finding-decide">
          {canApply && !rejected && (
            <button type="button" className={`insp-btn insp-btn--small${fix ? ' insp-btn--accepted' : ''}`} onClick={fix ? unapply : apply} aria-pressed={Boolean(fix)}>
              {fix ? ti.fixWillApply : ti.acceptFix}
            </button>
          )}
          {rejected ? (
            <button type="button" className="insp-text-btn" onClick={() => onDecision(result.id, null)}>
              {ti.rejected} · {ti.undo}
            </button>
          ) : (
            result.candidates.length > 0 && (
              <button type="button" className="insp-text-btn insp-text-btn--muted" onClick={() => onDecision(result.id, 'rejected')}>
                {ti.reject}
              </button>
            )
          )}
        </span>
      </div>

      {expanded && (
        <div className="insp-finding-details">
          {several && (
            <fieldset className="insp-options">
              <legend>{ti.ambiguousNote}</legend>
              {result.candidates.map((c, i) => (
                <label key={c.term.id} className={`insp-option${choice === i ? ' is-chosen' : ''}`}>
                  <input type="radio" name={`choice-${result.id}`} checked={choice === i} disabled={!c.applicable || rejected} onChange={() => onChoose(result.id, i)} />
                  <span className="insp-option-body">
                    <span className="insp-option-term">
                      {ti.variantN(i + 1)}: «{entryText(c.term, result, c.official)}»
                      {c.suggestion && !same(c.suggestion, entryText(c.term, result, c.official)) && ` → «${c.suggestion}»`}
                    </span>
                    {c.difference && <span className="insp-option-note">{c.difference}</span>}
                    {!c.applicable && <span className="insp-option-note">{ti.formNotVerified}</span>}
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <dl className="insp-details">
            {result.context && (
              <>
                <dt>{ti.fragmentDoc}</dt>
                <dd className="insp-context">«{result.context}»</dd>
              </>
            )}
            <dt>{ti.matchResult}</dt>
            <dd>
              {result.matchType === 'semantic' ? ti.matchSemantic : ti.matchExact} · {ti.confidenceLevels[result.level]} ({Math.round(result.confidence * 100)}%)
              {result.errorType && ` · ${ti.errorTypes[result.errorType] || result.errorType}`}
            </dd>
            {explanation && (
              <>
                <dt>{ti.explanationLabel}</dt>
                <dd>{explanation}</dd>
              </>
            )}
          </dl>

          <BasisBlock result={result} candidate={shown} ti={ti} lang={lang} />

          {pair && (
            <div className="insp-confusable">
              <p className="insp-confusable-title">{ti.dontConfuse}</p>
              <p className="insp-confusable-pair">
                «{pair.a.name[lang]}» {ti.dontConfuseAnd} «{pair.b.name[lang]}»
              </p>
              <p>{pair.difference[lang]}</p>
              <Link className="insp-link" to="/not-to-confuse">
                {ti.dontConfuseMore} →
              </Link>
            </div>
          )}

          {rec.kind === 'external' && <p className="insp-card-note">{ti.externalNote}</p>}
          {result.status !== 'fix' && single && !single.applicable && result.errorType === 'unofficial_variant' && <p className="insp-card-note">{ti.variantManualNote}</p>}
          {result.status !== 'fix' && !result.meaningPreserved && result.candidates.length > 0 && <p className="insp-card-note">{ti.meaningWarning}</p>}

          <WhyBlock result={result} location={location} ti={ti} lang={lang} />

          {shown?.term && !isPairTerm(shown.term) && (
            <button type="button" className="insp-text-btn" onClick={() => onAddToDictionary(shown.term)} disabled={favoriteIds.has(shown.term.id)}>
              {favoriteIds.has(shown.term.id) ? <BookmarkCheck size={14} aria-hidden="true" /> : <BookmarkPlus size={14} aria-hidden="true" />}
              {favoriteIds.has(shown.term.id) ? ti.inDictionary : ti.addToDictionary}
            </button>
          )}
        </div>
      )}
    </li>
  )
}

// ---- Final conclusion ----------------------------------------------------------------

function TermProfile({ inspection, ti, lang }) {
  const areas = termProfile(inspection.results, lang)
  if (!areas.length) return null
  const max = Math.max(1, ...areas.map((a) => a.count))
  return (
    <div className="insp-profile">
      <p className="insp-section-label">{ti.profileAreas}</p>
      <ul>
        {areas.map((area) => (
          <li key={area.key}>
            <span className="insp-profile-label">{area.label}</span>
            <span className="insp-profile-bar" aria-hidden="true">
              <span style={{ width: `${(area.count / max) * 100}%` }} />
            </span>
            <span className="insp-profile-count">{area.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function FinalConclusion({ inspection, summary, fixed, ti, lang }) {
  const type = documentTypeLabel(inspection.documentType, ti)
  return (
    <section className="insp-card insp-conclusion" aria-labelledby="insp-conclusion-title">
      <h3 className="insp-card-title" id="insp-conclusion-title">
        {ti.finalTitle}
      </h3>
      <StatList summary={summary} fixed={fixed} ti={ti} />
      {isPartial(inspection) && <p className="insp-card-note insp-card-note--warning">{ti.partialNote}</p>}
      <div className="insp-conclusion-text">
        <p className="insp-section-label">{ti.conclusionTitle}</p>
        {type && (
          <p>
            {ti.metaType}: {type} {ti.metaTypeByAi}
          </p>
        )}
        {conclusionText(summary, ti).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <TermProfile inspection={inspection} ti={ti} lang={lang} />
      <p className="insp-disclaimer">{ti.disclaimer}</p>
    </section>
  )
}

// ---- History ---------------------------------------------------------------------------

export function HistoryList({ history, onOpen, ti, lang }) {
  return (
    <section className="insp-card insp-card--quiet">
      <h3 className="insp-card-title">{ti.history.title}</h3>
      {!history.signedIn ? (
        <p className="insp-muted">
          {ti.history.signIn} <Link to="/account">{ti.history.signInLink}</Link>
        </p>
      ) : history.items.length === 0 ? (
        <p className="insp-muted">{history.loading ? ti.history.loading : ti.history.empty}</p>
      ) : (
        <ul className="insp-history">
          {history.items.map((item) => (
            <li key={item.id} className="insp-history-item">
              <span className="insp-history-main">
                <span className="insp-history-name">{item.file_name}</span>
                <span className="insp-history-meta">
                  {new Date(item.created_at).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU')}
                  {item.document_type && ` · ${documentTypeLabel(item.document_type, ti)}`} · {ti.history.terms(item.term_count)} · {ti.history.issues(item.issue_count)} ·{' '}
                  {ti.history.status[item.status]}
                </span>
              </span>
              <span className="insp-history-actions">
                <button type="button" className="insp-btn insp-btn--small" onClick={() => onOpen(item.id)}>
                  {ti.history.open}
                </button>
                <button
                  type="button"
                  className="insp-icon-btn"
                  onClick={() => window.confirm(ti.history.confirmDelete) && history.remove(item.id)}
                  aria-label={ti.history.delete}
                  title={ti.history.delete}
                >
                  <Trash2 size={15} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
