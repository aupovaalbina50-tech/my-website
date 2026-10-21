import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, BookOpenCheck, Check, CheckCircle2, Crosshair, ExternalLink, HelpCircle, Loader2, PencilLine, RotateCcw, Undo2, X } from 'lucide-react'
import { byPriority, canApply, canUndo, changeList, classify, counts, expertiseState, FILTERS, isStale, kindOf, matchesFilter, PRIORITIES, QC_CATEGORIES } from './model.js'
import { OFFICIAL_SITES } from '../sources/registry.js'
import './expertise.css'

// Right panel of the document editor: the expertise result and the work on
// each remark. Every number here is counted from the remarks themselves.

const pct = (v) => `${Math.round(v * 100)}%`

function Basis({ item, x, lang }) {
  const b = item.basis ?? {}
  const term = b.term
  return (
    <div className="exp-basis">
      <p className="exp-basis-kind">{x.basisKind[b.kind] ?? x.basisKind.ai}</p>
      {term && (
        <dl className="exp-basis-term">
          <div>
            <dt>KZ</dt>
            <dd>{term.kk || '—'}</dd>
          </div>
          <div>
            <dt>RU</dt>
            <dd>{term.ru || '—'}</dd>
          </div>
          <div>
            <dt>EN</dt>
            <dd>{term.en || '—'}</dd>
          </div>
        </dl>
      )}
      {b.others?.length > 0 && <p className="exp-basis-note">{x.otherCandidates(b.others.map((t) => (lang === 'kk' ? t?.kk : t?.ru) || t?.ru || t?.kk).filter(Boolean).join('; '))}</p>}
      {b.difference?.length > 0 && <p className="exp-basis-note">{b.difference.join(' ')}</p>}
      {b.kind === 'base' && <p className="exp-basis-note">{x.noDefinition}</p>}
      {b.entry && (
        <div className="exp-basis-entry">
          <p>
            <strong>{b.entry.title}</strong>
            {b.entry.status && ` · ${x.kbStatus[b.entry.status] ?? b.entry.status}`}
          </p>
          {(lang === 'kk' ? b.entry.definition_kk : b.entry.definition_ru) && <p>{lang === 'kk' ? b.entry.definition_kk : b.entry.definition_ru}</p>}
          {(b.entry.source_title || b.entry.source_number) && (
            <p>
              {x.source}: {[b.entry.source_title, b.entry.source_number, b.entry.source_date, b.entry.clause].filter(Boolean).join(', ')}
            </p>
          )}
          {b.entry.source_url && (
            <a href={b.entry.source_url} target="_blank" rel="noreferrer">
              {b.entry.source_url} <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
        </div>
      )}
      {b.source && (
        <div className="exp-basis-entry">
          <p>
            <strong>{b.source.title}</strong>
          </p>
          {b.source.officialTerm && <p>{x.officialTerm}: «{b.source.officialTerm}»</p>}
          {b.source.reason && <p>{b.source.reason}</p>}
          <p className="exp-basis-note">{x.retrievedAt(new Date(b.source.retrievedAt).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU'))}</p>
          <a href={b.source.url} target="_blank" rel="noreferrer">
            {b.source.url} <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      )}
      {b.kind === 'registry' && b.source && <SourceCard source={b.source} x={x} lang={lang} />}
      {(b.kind === 'registry' || b.kind === 'unverified_reference') && <CheckSites x={x} lang={lang} />}
      {item.lookupNote && <p className="exp-basis-note">{x.lookupNote[item.lookupNote]}</p>}
    </div>
  )
}

const fmtDate = (iso, lang) => (iso ? new Date(iso).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU') : null)

/** A registry entry with everything the platform knows about it — and nothing more. */
function SourceCard({ source, x, lang }) {
  const r = x.refs
  return (
    <div className="exp-basis-entry">
      <p>
        <strong>{(lang === 'kk' ? source.title_kk : source.title_ru) || source.title_ru}</strong>
      </p>
      <p>{[source.doc_number, source.doc_date && r.dated(fmtDate(source.doc_date, lang))].filter(Boolean).join(' · ') || r.noRequisites}</p>
      <p>
        {r.statusLabel}: {r.registryStatus[source.status] ?? source.status} · {source.verified_at ? r.verifiedAt(fmtDate(source.verified_at, lang)) : r.notVerified}
      </p>
      {source.url && (
        <a href={source.url} target="_blank" rel="noreferrer">
          {source.url} <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}
    </div>
  )
}

function CheckSites({ x, lang }) {
  return (
    <p className="exp-basis-note">
      {x.refs.checkAt}{' '}
      {OFFICIAL_SITES.filter((site) => site.priority === 2).map((site) => (
        <a key={site.key} href={site.url} target="_blank" rel="noreferrer">
          {site.title[lang] ?? site.title.ru} <ExternalLink size={12} aria-hidden="true" />
        </a>
      ))}
    </p>
  )
}

/** Every normative reference of the document and what the registry says about it. */
function ReferencesList({ check, x, lang }) {
  const list = check.references ?? []
  if (!list.length) return null
  const r = x.refs
  return (
    <details className="exp-refs">
      <summary>{r.title(list.length)}</summary>
      <ul>
        {list.map((ref, i) => (
          <li key={i} className={`exp-ref exp-ref--${ref.actuality}`}>
            <p className="exp-ref-fragment">«{ref.fragment}»</p>
            <p className="exp-ref-state">{r.actuality[ref.actuality] ?? ref.actuality}</p>
            {ref.source ? <SourceCard source={ref.source} x={x} lang={lang} /> : <p className="exp-basis-note">{r.notInRegistry}</p>}
          </li>
        ))}
      </ul>
      <CheckSites x={x} lang={lang} />
    </details>
  )
}

function ItemCard({ item, check, values, x, errorTypes, lang, readOnly, active, onAccept, onReject, onClarify, onManual, onGoTo, onReopen }) {
  const [showBasis, setShowBasis] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const stale = item.status === 'open' && isStale(item, check, values)
  const applicable = !readOnly && canApply(item, check, values)
  const title = item.title || (item.errorType ? errorTypes[item.errorType] : null) || (item.category === 'terminology' ? x.termFallback : x.category[item.category])
  const qc = classify(item)
  const ref = useRef(null)
  // Chosen from a mark in the text: the card comes into view.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [active])

  return (
    <li ref={ref} id={`remark-${item.id}`} className={`exp-item exp-item--${item.category} exp-item--${item.status} exp-item--p-${qc.priority}${stale ? ' is-stale' : ''}${active ? ' is-active' : ''}`}>
      <div className="exp-item-head">
        <span className={`exp-prio exp-prio--${qc.priority}`}>{x.qc.priorities[qc.priority]}</span>
        <span className={`exp-chip exp-chip--qc-${qc.category}`}>{x.qc.categories[qc.category]}</span>
        <span className={`exp-kind exp-kind--${kindOf(item)}`}>{x.kinds[kindOf(item)]}</span>
        <span className={`exp-conf exp-conf--${item.confirmation}`}>{x.confirmation[item.confirmation]}</span>
      </div>
      <p className="exp-item-title">
        {item.target ? (
          <button type="button" className="exp-item-jump" onClick={() => onGoTo(item)} title={x.goTo}>
            {title}
          </button>
        ) : (
          title
        )}
      </p>
      {item.label && <p className="exp-item-where">{item.label}</p>}
      {item.fragment && (
        <p className="exp-item-fix">
          <span className="exp-was">{item.fragment}</span>
          {item.suggestion && (
            <>
              <span aria-hidden="true"> → </span>
              <span className="exp-now">{item.suggestion}</span>
            </>
          )}
        </p>
      )}
      {item.alternatives?.length > 0 && <p className="exp-item-alt">{x.alternatives(item.alternatives.join('; '))}</p>}
      {item.explanation && <p className="exp-item-text">{item.explanation}</p>}
      <p className="exp-item-meta">
        {item.confirmation === 'rule' ? x.byRule : `${x.confidence}: ${item.confidence == null ? x.notEstimated : pct(item.confidence)}`}
        {item.factual && <span className="exp-item-warn"> · {x.factual}</span>}
        {item.status === 'open' && item.fragment && item.start == null && !stale && <span className="exp-item-warn"> · {item.overlapped ? x.overlapped : x.notLocated}</span>}
      </p>
      {stale && <p className="exp-item-stale">{x.stale}</p>}
      {item.status !== 'open' && (
        <p className={`exp-item-status exp-item-status--${item.status}`}>
          {x.status[item.status]}
          {item.applied != null && item.status === 'edited' && `: «${item.applied}»`}
          {!readOnly && (item.status === 'rejected' || item.status === 'clarify') && (
            <button type="button" className="exp-link" onClick={() => onReopen(item)}>
              {x.reopen}
            </button>
          )}
        </p>
      )}

      {editing && (
        <div className="exp-manual">
          <label>
            <span>{x.manualLabel}</span>
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
          </label>
          <div className="exp-actions">
            <button
              type="button"
              className="doc-btn doc-btn--primary doc-btn--small"
              onClick={() => {
                onManual(item, draft)
                setEditing(false)
              }}
              disabled={!draft.trim() || draft === item.fragment}
            >
              <Check size={14} aria-hidden="true" /> {x.applyManual}
            </button>
            <button type="button" className="doc-btn doc-btn--small" onClick={() => setEditing(false)}>
              {x.cancel}
            </button>
          </div>
        </div>
      )}

      {!editing && (
        <div className="exp-actions">
          {item.status === 'open' && item.suggestion && applicable && !item.factual && (
            <button type="button" className="doc-btn doc-btn--primary doc-btn--small" onClick={() => onAccept(item)}>
              <Check size={14} aria-hidden="true" /> {x.accept}
            </button>
          )}
          {item.status === 'open' && !readOnly && (
            <button type="button" className="doc-btn doc-btn--small" onClick={() => onReject(item)}>
              <X size={14} aria-hidden="true" /> {x.reject}
            </button>
          )}
          {item.status === 'open' && !readOnly && onClarify && (
            <button type="button" className="doc-btn doc-btn--small" onClick={() => onClarify(item)}>
              <HelpCircle size={14} aria-hidden="true" /> {x.markClarify}
            </button>
          )}
          {item.status === 'open' && applicable && (
            <button
              type="button"
              className="doc-btn doc-btn--small"
              onClick={() => {
                setDraft(item.suggestion ?? item.fragment)
                setEditing(true)
              }}
            >
              <PencilLine size={14} aria-hidden="true" /> {x.manual}
            </button>
          )}
          <button type="button" className="doc-btn doc-btn--small" aria-expanded={showBasis} onClick={() => setShowBasis((v) => !v)}>
            <BookOpenCheck size={14} aria-hidden="true" /> {x.showBasis}
          </button>
          {item.target && (
            <button type="button" className="doc-btn doc-btn--small" onClick={() => onGoTo(item)}>
              <Crosshair size={14} aria-hidden="true" /> {x.goTo}
            </button>
          )}
        </div>
      )}
      {showBasis && <Basis item={item} x={x} lang={lang} />}
    </li>
  )
}

export function ExpertisePanel({ check, values, outdated = false, running, failure, x, errorTypes, lang, readOnly, activeId = null, onRun, onRecheckChanged = null, onAccept, onReject, onClarify = null, onManual, onGoTo, onReopen }) {
  const [filter, setFilter] = useState('all')
  const [category, setCategory] = useState('all')
  const [priority, setPriority] = useState('all')
  const c = useMemo(() => counts(check, values), [check, values])
  const state = expertiseState(check, values)
  const visible = useMemo(() => {
    const list = (check?.items ?? []).filter((i) => matchesFilter(i, filter, { category, priority }))
    const rank = (i) => (i.status === 'open' ? (isStale(i, check, values) ? 1 : 0) : 2)
    // Open first, then by priority: high → info.
    return list.sort((a, b) => rank(a) - rank(b) || byPriority(a, b))
  }, [check, values, filter, category, priority])

  if (running) {
    return (
      <p className="exp-empty" role="status">
        <Loader2 size={18} className="doc-spin" aria-hidden="true" /> {x.running}
      </p>
    )
  }

  return (
    <div className="exp-panel">
      {failure && (
        <p className="exp-alert" role="alert">
          <AlertTriangle size={16} aria-hidden="true" /> {failure}
        </p>
      )}
      {!check ? (
        <div className="exp-empty">
          <p>{x.notChecked}</p>
          {!readOnly && (
            <button type="button" className="doc-btn doc-btn--accent" onClick={onRun}>
              {x.run}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={`exp-summary exp-summary--${state}`}>
            <p className="exp-summary-state">
              {state === 'complete' ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertTriangle size={18} aria-hidden="true" />}
              {x.state[state]}
            </p>
            <p className="exp-summary-meta">
              {x.checkedAt(new Date(check.at).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU'))}
              {check.version ? ` · ${x.versionLabel(check.version)}` : ''}
              {check.docLang ? ` · ${x.docLang[check.docLang] ?? check.docLang}` : ''}
            </p>
            {outdated && <p className="exp-item-stale">{x.outdated}</p>}
            <ul className="exp-parts">
              {['structure', 'terminology', 'language', 'references', 'lookup'].filter((p) => check.parts[p]).map((p) => (
                <li key={p} className={`exp-part exp-part--${check.parts[p]}`}>
                  {x.parts[p]}: {x.partState[check.parts[p]]}
                  {check.errors?.[p] && ` (${x.errorCode(check.errors[p])})`}
                </li>
              ))}
            </ul>
            {check.termsFound > 0 && <p className="exp-summary-meta">{x.termsFound(check.termsFound, check.glossarySize)}</p>}
            {c.stale > 0 && <p className="exp-item-stale">{x.staleSummary(c.stale)}</p>}
            {!readOnly && (
              <div className="exp-actions">
                {onRecheckChanged && c.stale > 0 && (
                  <button type="button" className="doc-btn doc-btn--small" onClick={onRecheckChanged}>
                    <RotateCcw size={14} aria-hidden="true" /> {x.recheckChanged}
                  </button>
                )}
                <button type="button" className="doc-btn doc-btn--accent doc-btn--small" onClick={onRun}>
                  <RotateCcw size={14} aria-hidden="true" /> {x.rerun}
                </button>
              </div>
            )}
          </div>

          <ReferencesList check={check} x={x} lang={lang} />

          <div className="exp-qc-filters">
            <label className="exp-group-select">
              <span>{x.qc.categoryLabel}</span>
              <select className="doc-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">
                  {x.qc.allCategories} ({c.all})
                </option>
                {QC_CATEGORIES.map((g) => (
                  <option key={g} value={g}>
                    {x.qc.categories[g]} ({c.categories[g]})
                  </option>
                ))}
              </select>
            </label>
            <label className="exp-group-select">
              <span>{x.qc.priorityLabel}</span>
              <select className="doc-input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="all">{x.qc.allPriorities}</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {x.qc.priorities[p]} ({c.priorities[p]})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="exp-prio-summary" aria-label={x.qc.priorityLabel}>
            {PRIORITIES.map((p) => (
              <li key={p} className={`exp-prio exp-prio--${p}`}>
                {x.qc.priorities[p]}: {c.priorities[p]}
              </li>
            ))}
          </ul>
          <div className="exp-filters" role="tablist">
            {FILTERS.filter((f) => f === 'all' || f === 'unconfirmed').map((f) => (
              <button key={f} type="button" role="tab" aria-selected={filter === f} className={filter === f ? 'is-on' : undefined} onClick={() => setFilter(f)}>
                {x.filters[f]} <span className="exp-count">{c[f]}</span>
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="exp-empty">{filter === 'all' && category === 'all' && priority === 'all' ? x.noRemarks : x.noRemarksFilter}</p>
          ) : (
            <ol className="exp-list">
              {visible.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  check={check}
                  values={values}
                  x={x}
                  errorTypes={errorTypes}
                  lang={lang}
                  readOnly={readOnly}
                  active={item.id === activeId}
                  onAccept={onAccept}
                  onReject={onReject}
                  onClarify={onClarify}
                  onManual={onManual}
                  onGoTo={onGoTo}
                  onReopen={onReopen}
                />
              ))}
            </ol>
          )}
          <p className="exp-disclaimer">{x.disclaimer}</p>
        </>
      )}
    </div>
  )
}

/** Applied fixes, newest first, with «Отменить последнюю правку». */
export function ChangesList({ check, values, x, readOnly, onUndo, onGoTo }) {
  const list = changeList(check).reverse()
  if (!list.length) return <p className="exp-empty">{x.noChanges}</p>
  return (
    <div className="exp-panel">
      {!readOnly && (
        <button type="button" className="doc-btn doc-btn--small" onClick={onUndo} disabled={!canUndo(check, values)}>
          <Undo2 size={14} aria-hidden="true" /> {x.undo}
        </button>
      )}
      {!canUndo(check, values) && list.length > 0 && !readOnly && <p className="exp-basis-note">{x.undoUnavailable}</p>}
      <ol className="exp-list">
        {list.map((ch) => (
          <li key={ch.id} className="exp-item">
            <p className="exp-item-where">
              {ch.label} · {x.status[ch.how]} · {new Date(ch.at).toLocaleTimeString()}
            </p>
            <p className="exp-item-fix">
              <span className="exp-was">{ch.was}</span> → <span className="exp-now">{ch.now}</span>
            </p>
            <button type="button" className="exp-link" onClick={() => onGoTo({ target: ch.target })}>
              {x.goTo}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
