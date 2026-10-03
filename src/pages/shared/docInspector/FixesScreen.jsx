// «Исправить терминологию»: every replacement the inspection can offer, as
// «Было → Предлагается → Причина → Основание» with Применить / Отклонить,
// and a side-by-side «Исходный документ | Исправленный вариант» view. Only
// what the user leaves applied here goes into the corrected file.

import { useMemo, useState } from 'react'
import { Check, Loader2, RotateCcw, Wand2, X } from 'lucide-react'
import { chosenFix } from './pipeline.js'
import { isPairTerm } from './confusables.js'

/** Index of the candidate a row would apply: the chosen one, else the first applicable. */
function proposedIndex(result, choice) {
  if (choice !== undefined && choice !== null && result.candidates[choice]?.applicable) return choice
  return result.candidates.findIndex((c) => c.applicable)
}

/**
 * The page text cut into plain / changed parts, for the comparison view.
 * `side` = 'before' (document phrases) or 'after' (their replacements).
 */
function pageParts(text, rows, side) {
  const parts = []
  let at = 0
  for (const row of [...rows].sort((a, b) => a.result.start - b.result.start)) {
    const { start, end } = row.result
    if (start < at) continue // overlapping findings: keep the first
    if (start > at) parts.push({ text: text.slice(at, start), kind: 'plain' })
    // A rejected change leaves the document as it was: no highlight.
    if (row.rejected) {
      parts.push({ text: text.slice(start, end), kind: 'plain' })
      at = end
      continue
    }
    if (side === 'after' && row.applied) parts.push({ text: row.suggestion, kind: 'inserted', id: row.result.id })
    else parts.push({ text: text.slice(start, end), kind: row.applied ? 'deleted' : 'pending', id: row.result.id })
    at = end
  }
  if (at < text.length) parts.push({ text: text.slice(at), kind: 'plain' })
  return parts
}

function CompareColumn({ title, pages, side, rowsByPage, ti }) {
  return (
    <div className="inspector-compare-col">
      <p className="inspector-compare-title">{title}</p>
      <div className="inspector-compare-body">
        {pages.map((page) => (
          <div key={page.number} className="inspector-compare-page">
            {pages.length > 1 && <p className="inspector-compare-page-label">{ti.pageLabel(page.number)}</p>}
            <p className="inspector-compare-text">
              {pageParts(page.text, rowsByPage.get(page.number) ?? [], side).map((part, i) =>
                part.kind === 'plain' ? (
                  <span key={i}>{part.text}</span>
                ) : (
                  <mark key={i} className={`inspector-diff inspector-diff--${part.kind}`}>
                    {part.text}
                  </mark>
                ),
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function FixesScreen({ inspection, decisions, setDecisions, choices, setChoices, onBuild, building, onBack, locate, ti, lang }) {
  const [view, setView] = useState('list')

  // Rows: every finding with at least one base-verified replacement.
  const rows = useMemo(
    () =>
      inspection.results
        .filter((r) => r.status !== 'ok' && r.candidates.some((c) => c.applicable))
        .map((result) => {
          const index = proposedIndex(result, choices[result.id])
          const applied = Boolean(chosenFix(result, decisions[result.id], choices[result.id]))
          return {
            result,
            index,
            candidate: result.candidates[index],
            suggestion: (chosenFix(result, decisions[result.id], choices[result.id]) ?? result.candidates[index]).suggestion,
            applied,
            rejected: decisions[result.id] === 'rejected',
          }
        }),
    [inspection, decisions, choices],
  )
  const appliedCount = rows.filter((r) => r.applied).length

  const rowsByPage = useMemo(() => {
    const map = new Map()
    for (const row of rows) map.set(row.result.page, [...(map.get(row.result.page) ?? []), row])
    return map
  }, [rows])
  const pages = inspection.doc.pages.filter((p) => p.text.trim())

  const apply = (row, index = row.index) => {
    setDecisions((prev) => ({ ...prev, [row.result.id]: null }))
    // A 'fix' finding applies its verified candidate by default; a 'review'
    // finding needs the explicit choice.
    if (row.result.status === 'review' || row.result.candidates.length > 1) setChoices((prev) => ({ ...prev, [row.result.id]: index }))
  }
  const reject = (row) => {
    setDecisions((prev) => ({ ...prev, [row.result.id]: 'rejected' }))
    setChoices((prev) => ({ ...prev, [row.result.id]: null }))
  }

  return (
    <div className="inspector-fixes">
      <p className="inspector-summary-title">
        <Wand2 size={18} aria-hidden="true" />
        {ti.fixesTitle}
      </p>
      <p className="inspector-summary-note">{ti.fixesLead}</p>

      <div className="inspector-fixes-toolbar">
        <div className="inspector-filter" role="tablist">
          <button type="button" role="tab" aria-selected={view === 'list'} className="inspector-filter-tab" onClick={() => setView('list')}>
            {ti.tabChanges} <span className="inspector-filter-count">{rows.length}</span>
          </button>
          <button type="button" role="tab" aria-selected={view === 'compare'} className="inspector-filter-tab" onClick={() => setView('compare')}>
            {ti.tabCompare}
          </button>
        </div>
        {rows.length > 1 && (
          <div className="inspector-fixes-bulk">
            <button type="button" className="inspector-btn inspector-btn--small" onClick={() => rows.forEach((row) => apply(row))}>
              <Check size={14} aria-hidden="true" />
              {ti.applyAll}
            </button>
            <button type="button" className="inspector-btn inspector-btn--small" onClick={() => rows.forEach(reject)}>
              <X size={14} aria-hidden="true" />
              {ti.rejectAll}
            </button>
          </div>
        )}
      </div>

      {rows.length === 0 && <p className="inspector-empty">{ti.noFixes}</p>}

      {view === 'list' && rows.length > 0 && (
        <ol className="inspector-fix-list">
          {rows.map((row) => {
            const { result } = row
            const state = row.applied ? 'applied' : row.rejected ? 'rejected' : 'pending'
            return (
              <li key={result.id} className={`inspector-fix-row inspector-fix-row--${state}`}>
                <div className="inspector-fix-row-head">
                  <span className="inspector-card-page">{locate(result)}</span>
                  <span className={`inspector-fix-state inspector-fix-state--${state}`}>{ti.fixStates[state]}</span>
                </div>
                <dl className="inspector-fix-pair">
                  <div>
                    <dt>{ti.wasLabel}</dt>
                    <dd className="inspector-fix-was">«{result.text}»</dd>
                  </div>
                  <div>
                    <dt>{ti.proposedLabel}</dt>
                    <dd className="inspector-fix-proposed">
                      {result.candidates.length > 1 ? (
                        <span className="inspector-fix-options">
                          {result.candidates.map((c, i) =>
                            c.applicable ? (
                              <label key={c.term.id} className="inspector-fix-option">
                                <input type="radio" name={`fix-${result.id}`} checked={row.applied && row.index === i} onChange={() => apply(row, i)} />
                                «{c.suggestion}»
                              </label>
                            ) : null,
                          )}
                        </span>
                      ) : (
                        <>«{row.suggestion}»</>
                      )}
                    </dd>
                  </div>
                </dl>
                <dl className="inspector-card-meta">
                  {result.explanation && (
                    <>
                      <dt>{ti.causeLabel}</dt>
                      <dd>{result.explanation}</dd>
                    </>
                  )}
                  <dt>📚 {ti.basisLabel}</dt>
                  <dd>{isPairTerm(row.candidate?.term) ? ti.basisConfusableShort : ti.basisGlossary}</dd>
                  {result.context && (
                    <>
                      <dt>{ti.contextLabel}</dt>
                      <dd className="inspector-context">«{result.context}»</dd>
                    </>
                  )}
                </dl>
                {isPairTerm(row.candidate?.term) && <p className="inspector-card-note">{ti.rephraseNote}</p>}
                <div className="inspector-card-actions">
                  <button
                    type="button"
                    className={`inspector-btn inspector-btn--small${row.applied ? ' inspector-btn--accepted' : ''}`}
                    onClick={() => apply(row)}
                    aria-pressed={row.applied}
                  >
                    <Check size={14} aria-hidden="true" />
                    {row.applied ? ti.fixStates.applied : ti.applyFix}
                  </button>
                  <button
                    type="button"
                    className={`inspector-btn inspector-btn--small${row.rejected ? ' inspector-btn--rejected' : ''}`}
                    onClick={() => (row.rejected ? apply(row) : reject(row))}
                    aria-pressed={row.rejected}
                  >
                    {row.rejected ? <RotateCcw size={14} aria-hidden="true" /> : <X size={14} aria-hidden="true" />}
                    {row.rejected ? `${ti.fixStates.rejected} · ${ti.undo}` : ti.reject}
                  </button>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      {view === 'compare' && rows.length > 0 && (
        <>
          <p className="inspector-compare-legend" lang={lang}>
            <mark className="inspector-diff inspector-diff--deleted">{ti.legendDeleted}</mark>
            <mark className="inspector-diff inspector-diff--inserted">{ti.legendInserted}</mark>
            <mark className="inspector-diff inspector-diff--pending">{ti.legendPending}</mark>
          </p>
          <div className="inspector-compare">
            <CompareColumn title={ti.compareOriginal} pages={pages} side="before" rowsByPage={rowsByPage} ti={ti} />
            <CompareColumn title={ti.compareFixed} pages={pages} side="after" rowsByPage={rowsByPage} ti={ti} />
          </div>
        </>
      )}

      <div className="inspector-review-actions">
        <button type="button" className="inspector-btn inspector-btn--primary" onClick={onBuild} disabled={appliedCount === 0 || building}>
          {building ? <Loader2 size={16} className="inspector-spin" aria-hidden="true" /> : <Wand2 size={16} aria-hidden="true" />}
          {building ? ti.building : ti.buildFixed(appliedCount)}
        </button>
        <button type="button" className="inspector-btn" onClick={onBack}>
          {ti.backToResults}
        </button>
      </div>
    </div>
  )
}

export default FixesScreen
