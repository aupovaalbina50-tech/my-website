// «Исправить подтверждённые ошибки»: a confirmation window listing every
// base-verified replacement with a checkbox. Confident fixes (and those the
// user already confirmed) start checked; anything that still needs a decision
// — several variants, a medium-confidence match — starts unchecked. Only the
// checked ones are written into the corrected document.
//
// ChangesCompare is the «Сравнить изменения» view after the fix: every change
// as Было / Стало / Основание, and the document before / after side by side.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { categoryOf, chosenFix } from './pipeline.js'
import { isPairTerm } from './confusables.js'
import { CATEGORY_ICON } from './helpers.js'
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
    <div className="inspector-modal-backdrop" onClick={onCancel}>
      <div
        className="inspector-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspector-fix-dialog-title"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <p className="inspector-modal-title" id="inspector-fix-dialog-title">
          {ti.dialogTitle(confirmedCount)}
        </p>
        <p className="inspector-summary-note">{ti.dialogLead}</p>

        {items.length === 0 ? (
          <p className="inspector-empty">{ti.noFixes}</p>
        ) : (
          <ul className="inspector-fix-checks">
            {items.map((r) => {
              const category = categoryOf(r)
              const index = selection[r.id]
              const several = r.candidates.filter((c) => c.applicable).length > 1
              const needsDecision = r.status !== 'fix' && appliedIndex(r, decisions[r.id], choices[r.id]) === null
              const shown = r.candidates[index ?? firstApplicable(r)]
              return (
                <li key={r.id} className={`inspector-fix-check${index !== null ? ' inspector-fix-check--on' : ''}`}>
                  <label className="inspector-fix-check-main">
                    <input type="checkbox" checked={index !== null} onChange={() => toggle(r)} />
                    <span className="inspector-fix-check-text">
                      <span className="inspector-fix-was">«{r.text}»</span>
                      <span aria-hidden="true"> → </span>
                      <span className="inspector-fix-proposed">«{shown.suggestion}»</span>
                    </span>
                  </label>
                  <span className="inspector-fix-check-meta">
                    {CATEGORY_ICON[category]} {ti.categoriesShort[category]} · {locate(r)}
                    {needsDecision && <span className="inspector-fix-check-flag"> — {ti.dialogNeedsDecision}</span>}
                  </span>
                  {several && (
                    <span className="inspector-fix-options">
                      {r.candidates.map((c, i) =>
                        c.applicable ? (
                          <label key={c.term.id} className="inspector-fix-option">
                            <input type="radio" name={`dialog-${r.id}`} checked={index === i} onChange={() => pick(r, i)} />
                            {ti.variantN(i + 1)}: «{c.suggestion}»
                          </label>
                        ) : null,
                      )}
                    </span>
                  )}
                  {index !== null && isPairTerm(r.candidates[index]?.term) && <span className="inspector-card-note">{ti.rephraseNote}</span>}
                </li>
              )
            })}
          </ul>
        )}

        <div className="inspector-modal-actions">
          <button type="button" className="inspector-btn inspector-btn--primary" onClick={apply} disabled={selectedCount === 0 || building}>
            {building ? <Loader2 size={16} className="inspector-spin" aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
            {building ? ti.building : ti.applySelected(selectedCount)}
          </button>
          <button type="button" className="inspector-btn" onClick={onCancel}>
            <X size={16} aria-hidden="true" />
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
    <div className="inspector-compare-col">
      <p className="inspector-compare-title">{title}</p>
      <div className="inspector-compare-body">
        {pages.map((page) => (
          <div key={page.number} className="inspector-compare-page">
            {pages.length > 1 && <p className="inspector-compare-page-label">{ti.pageLabel(page.number)}</p>}
            <p className="inspector-compare-text">
              {pageParts(page.text, changesByPage.get(page.number) ?? [], side).map((part, i) =>
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
    <section className="inspector-block">
      <p className="inspector-block-title">{ti.compareChanges}</p>
      <ol className="inspector-change-list">
        {changes.map(({ result, suggestion, fromPair }) => (
          <li key={result.id} className="inspector-change">
            <span className="inspector-card-page">{locate(result)}</span>
            <dl>
              <div>
                <dt>{ti.wasLabel}</dt>
                <dd className="inspector-fix-was">«{result.text}»</dd>
              </div>
              <div>
                <dt>{ti.changeNow}</dt>
                <dd className="inspector-fix-proposed">«{suggestion}»</dd>
              </div>
              <div className="inspector-change-basis">
                <dt>{ti.changeBasis}</dt>
                <dd>{fromPair ? ti.basisConfusableShort : result.source === 'glossary' || result.baseMatch ? ti.basisGlossary : ti.basisBaseAi}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
      <p className="inspector-compare-legend">
        <mark className="inspector-diff inspector-diff--deleted">{ti.legendDeleted}</mark>
        <mark className="inspector-diff inspector-diff--inserted">{ti.legendInserted}</mark>
      </p>
      <div className="inspector-compare">
        <CompareColumn title={ti.beforeTitle} pages={pages} side="before" changesByPage={changesByPage} ti={ti} />
        <CompareColumn title={ti.afterTitle} pages={pages} side="after" changesByPage={changesByPage} ti={ti} />
      </div>
    </section>
  )
}
