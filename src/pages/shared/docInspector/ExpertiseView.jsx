// Building blocks of the «Цифровой инспектор терминологии» results: the
// 01-02-03 stepper, the results header and «паспорт проверки», the finding
// cards with «Почему система так решила?», the terminology profile, the
// conclusion and the history of expertises. Every figure and text comes from
// the real results of the check (see expertise.js).

import { useEffect, useRef } from 'react'
import { BookmarkCheck, BookmarkPlus, Check, ChevronDown, ClipboardCheck, Eye, FolderOpen, History, RotateCcw, ShieldAlert, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { categoryOf, chosenFix } from './pipeline.js'
import { adiletUrl, isPairTerm, pairForResult } from './confusables.js'
import { conclusionText, reasoningSteps, termProfile } from './expertise.js'
import { CATEGORY_ICON, documentTypeLabel, entryText, same } from './helpers.js'
import { ConfidenceBadge, TrilingualLine } from './ui.jsx'

// ---- 01 / 02 / 03 --------------------------------------------------------------

const STEP_OF_SCREEN = { upload: 0, processing: 1, review: 1, error: 1, fixes: 2, done: 2 }

export function Stepper({ screen, ti }) {
  const active = STEP_OF_SCREEN[screen] ?? 0
  return (
    <ol className="inspector-stepper" aria-label={ti.stepperLabel}>
      {ti.stages.map((label, i) => (
        <li
          key={label}
          className={`inspector-stepper-item${i === active ? ' inspector-stepper-item--active' : ''}${i < active ? ' inspector-stepper-item--done' : ''}`}
          aria-current={i === active ? 'step' : undefined}
        >
          <span className="inspector-stepper-num">{String(i + 1).padStart(2, '0')}</span>
          <span className="inspector-stepper-label">{label}</span>
        </li>
      ))}
    </ol>
  )
}

// ---- Header + паспорт проверки ----------------------------------------------------

export function ResultsHeader({ inspection, summary, ti, lang }) {
  const date = inspection.checkedAt ? new Date(inspection.checkedAt).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU') : null
  const type = documentTypeLabel(inspection.documentType, ti)
  return (
    <div className="inspector-results-head">
      <h3 className="inspector-results-title">{ti.resultsTitle}</h3>
      <dl className="inspector-results-meta">
        <div>
          <dt>{ti.metaDocument}</dt>
          <dd>{inspection.fileName}</dd>
        </div>
        {type && (
          <div>
            <dt>{ti.metaType}</dt>
            <dd>
              {type} <span className="inspector-results-meta-note">{ti.metaTypeByAi}</span>
            </dd>
          </div>
        )}
        {date && (
          <div>
            <dt>{ti.metaDate}</dt>
            <dd>{date}</dd>
          </div>
        )}
        {inspection.doc.totalPages ? (
          <div>
            <dt>{ti.metaPages}</dt>
            <dd>{inspection.doc.totalPages}</dd>
          </div>
        ) : null}
        <div>
          <dt>{ti.metaTerms}</dt>
          <dd>{summary.total}</dd>
        </div>
      </dl>
    </div>
  )
}

export function Passport({ inspection, summary, ti }) {
  const { ai, lookup, unreadablePages, illegiblePages } = inspection
  const rows = [
    { key: 'checked', label: ti.passport.checked, value: summary.total },
    { key: 'ok', label: ti.passport.ok, value: summary.counts.ok },
    { key: 'misuse', label: ti.passport.toFix, value: summary.toFix },
    { key: 'uncertain', label: ti.passport.uncertain, value: summary.counts.uncertain },
    { key: 'ambiguous', label: ti.passport.ambiguous, value: summary.counts.ambiguous },
  ]
  return (
    <section className="inspector-passport" aria-labelledby="inspector-passport-title">
      <p className="inspector-passport-title" id="inspector-passport-title">
        <ClipboardCheck size={18} aria-hidden="true" />
        {ti.passport.title}
      </p>
      <div className="inspector-passport-body">
        <dl className="inspector-passport-rows">
          {rows.map((row) => (
            <div key={row.key} className={`inspector-passport-row inspector-passport-row--${row.key}`}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        {summary.compliance !== null && (
          <div className="inspector-compliance">
            <p className="inspector-compliance-label">{ti.passport.compliance}</p>
            <p className="inspector-compliance-value">{summary.compliance}%</p>
            <div className="inspector-compliance-bar" role="img" aria-label={`${summary.compliance}%`}>
              <span style={{ width: `${summary.compliance}%` }} />
            </div>
          </div>
        )}
      </div>

      {inspection.glossarySize && <p className="inspector-summary-note">{ti.baseNote(inspection.glossarySize)}</p>}
      {inspection.fromHistory && <p className="inspector-summary-note">{ti.history.reopenedNote}</p>}
      {ai?.failedChunks > 0 && (
        <p className="inspector-warning">
          <ShieldAlert size={15} aria-hidden="true" />
          {ti.aiFailed(ai.failedChunks, ai.totalChunks)}
          {ai.error && ti.errors[ai.error] ? ` (${ti.errors[ai.error]})` : ''}
        </p>
      )}
      {lookup?.searched > 0 && <p className="inspector-summary-note">{ti.lookupNote(lookup.searched, lookup.found)}</p>}
      {lookup?.failed > 0 && (
        <p className="inspector-warning">
          <ShieldAlert size={15} aria-hidden="true" />
          {ti.lookupFailed(lookup.failed)}
        </p>
      )}
      {(unreadablePages > 0 || illegiblePages > 0) && (
        <p className="inspector-warning">
          <ShieldAlert size={15} aria-hidden="true" />
          {ti.illegibleNote}
        </p>
      )}
    </section>
  )
}

// ---- Filters ----------------------------------------------------------------------

const FILTERS = ['all', 'misuse', 'mismatch', 'uncertain', 'ambiguous', 'ok']

export function FilterBar({ filter, onChange, summary, ti }) {
  return (
    <div className="inspector-filter" role="tablist" aria-label={ti.filtersLabel}>
      {FILTERS.map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={filter === key}
          className={`inspector-filter-tab inspector-filter-tab--${key}`}
          onClick={() => onChange(key)}
        >
          {key !== 'all' && <span aria-hidden="true">{CATEGORY_ICON[key]}</span>} {ti.filterLabels[key]}{' '}
          <span className="inspector-filter-count">{key === 'all' ? summary.total : summary.counts[key]}</span>
        </button>
      ))}
    </div>
  )
}

// ---- Finding cards ----------------------------------------------------------------

function WhyBlock({ result, location, ti, lang }) {
  return (
    <details className="inspector-why">
      <summary>
        <ChevronDown size={15} aria-hidden="true" />
        {ti.whyTitle}
      </summary>
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
    <div className={`inspector-basis${!candidate ? ' inspector-basis--unconfirmed' : ''}`}>
      <p className="inspector-basis-title">📚 {ti.basisTitle}</p>
      <dl>
        <dt>{ti.basisSource}</dt>
        <dd>
          {source}
          {links.map((link) => (
            <a key={link.href + link.label} className="inspector-source-link inspector-source-link--block" href={link.href} target="_blank" rel="noopener noreferrer">
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
            <dd>{definition ?? <span className="inspector-basis-missing">{ti.definitionMissing}</span>}</dd>
          </>
        )}
      </dl>
    </div>
  )
}

/** The recommended replacement as shown on the card, or what to say instead. */
function recommendation(result, candidate, ti) {
  if (result.candidates.length > 1) return { kind: 'several', text: ti.severalVariants(result.candidates.length) }
  if (candidate) return { kind: 'base', text: candidate.suggestion || entryText(candidate.term, result, candidate.official) }
  if (result.external) return { kind: 'external', text: result.external.officialTerm }
  return { kind: 'none', text: ti.noOfficial }
}

export function OkRow({ result, location, selected, onShow, ti }) {
  const official = entryText(result.term, result, result.official)
  return (
    <li className={`inspector-card inspector-card--ok${selected ? ' inspector-card--selected' : ''}`} id={`finding-${result.id}`}>
      <button type="button" className="inspector-ok-row" onClick={() => onShow(result)}>
        <span aria-hidden="true">{CATEGORY_ICON.ok}</span>
        <span className="inspector-ok-text">«{result.text}»</span>
        <span className="inspector-ok-loc">{location}</span>
      </button>
      {official && official.toLowerCase() !== result.text.toLowerCase() && (
        <p className="inspector-ok-official">
          {ti.okNote}: «{official}»
        </p>
      )}
      <TrilingualLine term={result.term} ti={ti} />
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
      className={`inspector-card inspector-card--${category}${selected ? ' inspector-card--selected' : ''}${rejected ? ' inspector-card--rejected' : ''}`}
    >
      <div className="inspector-card-head">
        <span className={`inspector-finding-num inspector-status--${category}`}>
          {CATEGORY_ICON[category]} {String(number).padStart(2, '0')}
        </span>
        <span className={`inspector-status inspector-status--${category}`}>{ti.categories[category]}</span>
      </div>

      <p className="inspector-finding-text">«{result.text}»</p>

      <dl className="inspector-finding-facts">
        <div>
          <dt>{ti.foundIn}</dt>
          <dd>{location}</dd>
        </div>
        <div>
          <dt>{rec.kind === 'external' ? ti.externalMatch : ti.recommendedTerm}</dt>
          <dd className={`inspector-finding-rec inspector-finding-rec--${rec.kind}`}>{rec.kind === 'base' || rec.kind === 'external' ? `«${rec.text}»` : rec.text}</dd>
        </div>
        <div>
          <dt>{ti.statusLabel}</dt>
          <dd>{ti.categories[category]}</dd>
        </div>
        <div>
          <dt>{ti.confidenceLabel}</dt>
          <dd>
            <ConfidenceBadge result={result} ti={ti} />
          </dd>
        </div>
      </dl>
      {rec.kind === 'external' && <p className="inspector-card-note">{ti.externalNote}</p>}

      <div className="inspector-card-actions">
        <button type="button" className="inspector-btn inspector-btn--small" onClick={() => onToggle(result.id)} aria-expanded={expanded}>
          <ChevronDown size={14} aria-hidden="true" className={expanded ? 'inspector-rotate' : undefined} />
          {expanded ? ti.less : ti.more}
        </button>
        <button type="button" className="inspector-btn inspector-btn--small" onClick={() => onShow(result)}>
          <Eye size={14} aria-hidden="true" />
          {ti.goToFragment}
        </button>
        {canApply && !rejected && (
          <button
            type="button"
            className={`inspector-btn inspector-btn--small${fix ? ' inspector-btn--accepted' : ''}`}
            onClick={fix ? unapply : apply}
            aria-pressed={Boolean(fix)}
          >
            <Check size={14} aria-hidden="true" />
            {fix ? ti.fixWillApply : ti.applyFixBtn}
          </button>
        )}
        {rejected ? (
          <button type="button" className="inspector-btn inspector-btn--small" onClick={() => onDecision(result.id, null)}>
            <RotateCcw size={14} aria-hidden="true" />
            {ti.rejected} · {ti.undo}
          </button>
        ) : (
          result.candidates.length > 0 && (
            <button type="button" className="inspector-btn inspector-btn--small" onClick={() => onDecision(result.id, 'rejected')}>
              <X size={14} aria-hidden="true" />
              {ti.reject}
            </button>
          )
        )}
      </div>

      {expanded && (
        <div className="inspector-finding-details">
          {several && (
            <fieldset className="inspector-options">
              <legend className="inspector-fix-label">{ti.ambiguousNote}</legend>
              {result.candidates.map((c, i) => (
                <label key={c.term.id} className={`inspector-option${choice === i ? ' inspector-option--chosen' : ''}`}>
                  <input
                    type="radio"
                    name={`choice-${result.id}`}
                    checked={choice === i}
                    disabled={!c.applicable || rejected}
                    onChange={() => onChoose(result.id, i)}
                  />
                  <span className="inspector-option-body">
                    <span className="inspector-option-term">
                      {ti.variantN(i + 1)}: «{entryText(c.term, result, c.official)}»
                      {c.suggestion && !same(c.suggestion, entryText(c.term, result, c.official)) && ` → «${c.suggestion}»`}
                    </span>
                    {c.difference && <span className="inspector-option-diff">{c.difference}</span>}
                    {!c.applicable && <span className="inspector-option-diff">{ti.formNotVerified}</span>}
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          <dl className="inspector-card-meta">
            {result.errorType && (
              <>
                <dt>{ti.typeLabel}</dt>
                <dd>{ti.errorTypes[result.errorType] || result.errorType}</dd>
              </>
            )}
            <dt>{ti.matchTypeLabel}</dt>
            <dd>{result.matchType === 'semantic' ? ti.matchSemantic : ti.matchExact}</dd>
            {(result.explanation || result.external?.reason) && (
              <>
                <dt>📌 {ti.whyLabel}</dt>
                <dd>{!result.candidates.length && result.external ? result.external.reason || result.explanation : result.explanation}</dd>
              </>
            )}
            {result.context && (
              <>
                <dt>{ti.contextLabel}</dt>
                <dd className="inspector-context">«{result.context}»</dd>
              </>
            )}
          </dl>

          <BasisBlock result={result} candidate={shown} ti={ti} lang={lang} />

          {pair && (
            <div className="inspector-confusable">
              <p className="inspector-confusable-title">⚠️ {ti.dontConfuse}</p>
              <p className="inspector-confusable-pair">
                «{pair.a.name[lang]}» {ti.dontConfuseAnd} «{pair.b.name[lang]}»
              </p>
              <p className="inspector-confusable-text">{pair.difference[lang]}</p>
              <Link className="inspector-source-link" to="/not-to-confuse">
                {ti.dontConfuseMore} →
              </Link>
            </div>
          )}

          <TrilingualLine term={shown?.term ?? result.term} ti={ti} />

          {result.status !== 'fix' && single && !single.applicable && result.errorType === 'unofficial_variant' && (
            <p className="inspector-card-note">{ti.variantManualNote}</p>
          )}
          {result.status !== 'fix' && !result.meaningPreserved && result.candidates.length > 0 && <p className="inspector-card-note">{ti.meaningWarning}</p>}

          <WhyBlock result={result} location={location} ti={ti} lang={lang} />

          {shown?.term && !isPairTerm(shown.term) && (
            <button
              type="button"
              className="inspector-btn inspector-btn--small"
              onClick={() => onAddToDictionary(shown.term)}
              disabled={favoriteIds.has(shown.term.id)}
            >
              {favoriteIds.has(shown.term.id) ? <BookmarkCheck size={14} aria-hidden="true" /> : <BookmarkPlus size={14} aria-hidden="true" />}
              {favoriteIds.has(shown.term.id) ? ti.inDictionary : ti.addToDictionary}
            </button>
          )}
        </div>
      )}
    </li>
  )
}

// ---- Profile and conclusion -----------------------------------------------------------

export function TermProfile({ inspection, ti, lang }) {
  const areas = termProfile(inspection.results, lang)
  const max = Math.max(1, ...areas.map((a) => a.count))
  const type = documentTypeLabel(inspection.documentType, ti)
  return (
    <section className="inspector-block">
      <p className="inspector-block-title">{ti.profileTitle}</p>
      {type && (
        <p className="inspector-profile-type">
          {ti.metaType}: <strong>{type}</strong>
        </p>
      )}
      <p className="inspector-profile-sub">{ti.profileAreas}</p>
      {areas.length === 0 ? (
        <p className="inspector-summary-note">{ti.profileEmpty}</p>
      ) : (
        <ul className="inspector-profile">
          {areas.map((area) => (
            <li key={area.key}>
              <span className="inspector-profile-label">{area.label}</span>
              <span className="inspector-profile-bar" aria-hidden="true">
                <span style={{ width: `${(area.count / max) * 100}%` }} />
              </span>
              <span className="inspector-profile-count">{area.count}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function Conclusion({ summary, ti }) {
  return (
    <section className="inspector-block inspector-conclusion">
      <p className="inspector-block-title">{ti.conclusionTitle}</p>
      {conclusionText(summary, ti).map((line) => (
        <p key={line}>{line}</p>
      ))}
    </section>
  )
}

// ---- History ---------------------------------------------------------------------------

export function HistoryList({ history, onOpen, ti, lang }) {
  if (!history.signedIn) {
    return (
      <section className="inspector-block">
        <p className="inspector-block-title">
          <History size={16} aria-hidden="true" /> {ti.history.title}
        </p>
        <p className="inspector-summary-note">
          {ti.history.signIn} <Link to="/account">{ti.history.signInLink}</Link>
        </p>
      </section>
    )
  }
  return (
    <section className="inspector-block">
      <p className="inspector-block-title">
        <History size={16} aria-hidden="true" /> {ti.history.title}
      </p>
      {history.items.length === 0 ? (
        <p className="inspector-summary-note">{history.loading ? ti.history.loading : ti.history.empty}</p>
      ) : (
        <ul className="inspector-history">
          {history.items.map((item) => (
            <li key={item.id} className="inspector-history-item">
              <span className="inspector-history-date">{new Date(item.created_at).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU')}</span>
              <span className="inspector-history-name">
                {item.file_name}
                {item.document_type && <span className="inspector-history-type"> · {documentTypeLabel(item.document_type, ti)}</span>}
              </span>
              <span className="inspector-history-figures">
                {ti.history.terms(item.term_count)} · {ti.history.issues(item.issue_count)}
              </span>
              <span className={`inspector-history-status inspector-history-status--${item.status}`}>{ti.history.status[item.status]}</span>
              <span className="inspector-history-actions">
                <button type="button" className="inspector-btn inspector-btn--small" onClick={() => onOpen(item.id)}>
                  <FolderOpen size={14} aria-hidden="true" />
                  {ti.history.open}
                </button>
                <button
                  type="button"
                  className="inspector-icon-btn"
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
