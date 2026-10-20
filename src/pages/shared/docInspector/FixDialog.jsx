// «Исправить подтверждённые ошибки»: a confirmation window listing every
// base-verified replacement with a checkbox. Confident fixes (and those the
// user already confirmed) start checked; anything that still needs a decision
// — several variants, a medium-confidence match — starts unchecked. Only the
// checked ones are written into the corrected document.
//
// ChangesCompare is the «Сравнить изменения» view after the fix: every change
// as Было / Стало / Основание, and the document before / after side by side.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { categoryOf, chosenFix } from './pipeline.js'
import { isPairTerm } from './confusables.js'
import { fixableResults } from './expertise.js'

/** Index of the candidate currently applied for a finding, or null. */
function appliedIndex(result, decision, choice) {
  const fix = chosenFix(result, decision, choice)
  return fix ? result.candidates.indexOf(fix) : null
}

export function FixDialog({ inspection, decisions, choices, onApply, onCancel, building, locate, ti }) {
  const items = useMemo(() => fixableResults(inspection.results), [inspection])
  const [selection, setSelection] = useState(() =>
    Object.fromEntries(items.map((r) => [r.id, appliedIndex(r, decisions[r.id], choices[r.id])])),
  )
  const confirmedCount = items.filter((r) => appliedIndex(r, decisions[r.id], choices[r.id]) !== null).length
  const selectedCount = Object.values(selection).filter((v) => v !== null).length
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (event) => event.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const firstApplicable = (r) => r.candidates.findIndex((c) => c.applicable)
  const toggle = (r) => setSelection((prev) => ({ ...prev, [r.id]: prev[r.id] === null ? firstApplicable(r) : null }))
  const pick = (r, i) => setSelection((prev) => ({ ...prev, [r.id]: i }))

  const apply = () => {
    // Turn the checkboxes into the inspector's decisions / choices.
    const nextDecisions = { ...decisions }
    const nextChoices = { ...choices }
    for (const r of items) {
      const index = selection[r.id]
      if (index === null) {
        if (r.status === 'fix') nextDecisions[r.id] = 'rejected'
        else nextChoices[r.id] = null
      } else {
        nextDecisions[r.id] = null
        if (r.status !== 'fix') nextChoices[r.id] = index
      }
    }
    onApply(nextDecisions, nextChoices)
  }

  return (
    <div className="insp-modal-backdrop" onClick={onCancel}>
      <div
        className="insp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-fix-dialog-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="insp-modal-title" id="inspector-fix-dialog-title">
          {ti.dialogTitle(confirmedCount)}
        </h3>
        <p className="insp-muted">{ti.dialogLead}</p>

        {items.length === 0 ? (
          <p className="insp-empty">{ti.noFixes}</p>
        ) : (
          <ul className="insp-fix-list">
            {items.map((r) => {
              const category = categoryOf(r)
              const index = selection[r.id]
              const several = r.candidates.filter((c) => c.applicable).length > 1
              const needsDecision = r.status !== 'fix' && appliedIndex(r, decisions[r.id], choices[r.id]) === null
              const shown = r.candidates[index ?? firstApplicable(r)]
              const reason = r.explanation || (r.errorType ? ti.errorTypes[r.errorType] : null)
              const basis = isPairTerm(shown.term) ? ti.basisConfusableShort : r.source === 'glossary' || r.baseMatch ? ti.basisGlossary : ti.basisBaseAi
              return (
                <li key={r.id} className={`insp-fix${index !== null ? ' is-on' : ''}`}>
                  <label className="insp-fix-main">
                    <input type="checkbox" checked={index !== null} onChange={() => toggle(r)} />
                    <span className="insp-fix-pair">
                      <span>
                        <span className="insp-fix-label">{ti.wasLabel}</span>
                        <span className="insp-fix-was">«{r.text}»</span>
                      </span>
                      <span>
                        <span className="insp-fix-label">{ti.recommendedShort}</span>
                        <span className="insp-fix-proposed">«{shown.suggestion}»</span>
                      </span>
                    </span>
                  </label>
                  <p className="insp-fix-meta">
                    {ti.categories[category]} · {locate(r)}
                    {needsDecision && <span className="insp-fix-flag"> · {ti.dialogNeedsDecision}</span>}
                  </p>
                  {reason && (
                    <p className="insp-fix-line">
                      <span className="insp-fix-label">{ti.reasonShort}</span> {reason}
                    </p>
                  )}
                  <p className="insp-fix-line">
                    <span className="insp-fix-label">{ti.changeBasis}</span> {basis}
                  </p>
                  {several && (
                    <span className="insp-fix-options">
                      {r.candidates.map((c, i) =>
                        c.applicable ? (
                          <label key={c.term.id} className="insp-fix-option">
                            <input type="radio" name={`dialog-${r.id}`} checked={index === i} onChange={() => pick(r, i)} />
                            {ti.variantN(i + 1)}: «{c.suggestion}»
                          </label>
                        ) : null,
                      )}
                    </span>
                  )}
                  {index !== null && isPairTerm(r.candidates[index]?.term) && <p className="insp-card-note">{ti.rephraseNote}</p>}
                </li>
              )
            })}
          </ul>
        )}

        <div className="insp-modal-actions">
          <button type="button" className="insp-btn insp-btn--primary" onClick={apply} disabled={selectedCount === 0 || building}>
            {building && <Loader2 size={16} className="insp-spin" aria-hidden="true" />}
            {building ? ti.building : ti.applySelected(selectedCount)}
          </button>
          <button type="button" className="insp-btn" onClick={onCancel}>
            {ti.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- «Сравнить изменения» ----------------------------------------------------------

/** Page text cut into plain / changed parts; `side` = 'before' or 'after'. */
function pageParts(text, changes, side) {
  const parts = []
  let at = 0
  for (const change of [...changes].sort((a, b) => a.result.start - b.result.start)) {
    const { start, end } = change.result
    if (start < at) continue // overlapping findings: keep the first
    if (start > at) parts.push({ text: text.slice(at, start), kind: 'plain' })
    parts.push(side === 'after' ? { text: change.suggestion, kind: 'inserted' } : { text: text.slice(start, end), kind: 'deleted' })
    at = end
  }
  if (at < text.length) parts.push({ text: text.slice(at), kind: 'plain' })
  return parts
}

function CompareColumn({ title, pages, side, changesByPage, ti }) {
  return (
    <div className="insp-compare-col">
      <p className="insp-compare-title">{title}</p>
      <div className="insp-compare-body">
        {pages.map((page) => (
          <div key={page.number} className="insp-compare-page">
            {pages.length > 1 && <p className="insp-compare-page-label">{ti.pageLabel(page.number)}</p>}
            <p className="insp-compare-text">
              {pageParts(page.text, changesByPage.get(page.number) ?? [], side).map((part, i) =>
                part.kind === 'plain' ? (
                  <span key={i}>{part.text}</span>
                ) : (
                  <mark key={i} className={`insp-diff insp-diff--${part.kind}`}>
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

export function ChangesCompare({ inspection, decisions, choices, locate, ti }) {
  const changes = useMemo(
    () =>
      inspection.results
        .map((result) => ({ result, fix: chosenFix(result, decisions[result.id], choices[result.id]) }))
        .filter(({ fix }) => fix)
        .map(({ result, fix }) => ({ result, suggestion: fix.suggestion, fromPair: isPairTerm(fix.term) })),
    [inspection, decisions, choices],
  )
  const changesByPage = useMemo(() => {
    const map = new Map()
    for (const change of changes) map.set(change.result.page, [...(map.get(change.result.page) ?? []), change])
    return map
  }, [changes])
  const pages = inspection.doc.pages.filter((p) => p.text.trim())

  return (
    <section className="insp-compare-section">
      <p className="insp-section-label">{ti.compareChanges}</p>
      <ol className="insp-change-list">
        {changes.map(({ result, suggestion, fromPair }) => (
          <li key={result.id} className="insp-change">
            <span className="insp-change-loc">{locate(result)}</span>
            <dl>
              <div>
                <dt>{ti.wasLabel}</dt>
                <dd className="insp-fix-was">«{result.text}»</dd>
              </div>
              <div>
                <dt>{ti.changeNow}</dt>
                <dd className="insp-fix-proposed">«{suggestion}»</dd>
              </div>
              <div className="insp-change-basis">
                <dt>{ti.changeBasis}</dt>
                <dd>{fromPair ? ti.basisConfusableShort : result.source === 'glossary' || result.baseMatch ? ti.basisGlossary : ti.basisBaseAi}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
      <p className="insp-compare-legend">
        <mark className="insp-diff insp-diff--deleted">{ti.legendDeleted}</mark>
        <mark className="insp-diff insp-diff--inserted">{ti.legendInserted}</mark>
      </p>
      <div className="insp-compare">
        <CompareColumn title={ti.beforeTitle} pages={pages} side="before" changesByPage={changesByPage} ti={ti} />
        <CompareColumn title={ti.afterTitle} pages={pages} side="after" changesByPage={changesByPage} ti={ti} />
      </div>
    </section>
  )
}
