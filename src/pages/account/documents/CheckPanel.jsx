import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, Database, PenLine, X } from 'lucide-react'

// «Проверка документа»: remarks in seven separate groups (never one mixed
// list), each with «Принять / Отклонить / Изменить вручную»; nothing in the
// document changes without one of those clicks. Below them — terms of the
// site's own base found in the text, each with a link to its card.

const ISSUE_CATEGORIES = ['critical', 'important', 'term', 'structure', 'language', 'logic', 'advice']

export function CheckPanel({ check, s, lang, onAccept, onReject, onEdit, onGoTo, readOnly }) {
  const c = s.checkPanel
  if (!check) return <p className="doc-check-empty">{c.notChecked}</p>
  const items = check.items ?? []
  const open = items.filter((i) => i.status === 'open')
  const termName = (t) => (lang === 'kk' ? t.kk || t.ru : t.ru || t.kk)

  return (
    <div className="doc-check">
      <ul className="doc-check-summary">
        {ISSUE_CATEGORIES.map((cat) => {
          const n = open.filter((i) => i.category === cat).length
          return (
            <li key={cat} className={`doc-check-count doc-cat--${cat}${n ? '' : ' is-zero'}`}>
              <span className="doc-cat-dot" aria-hidden="true" />
              {c.categories[cat]} — <strong>{n}</strong>
            </li>
          )
        })}
      </ul>
      {check.knowledge && (
        <p className="doc-check-kb">
          <Database size={14} aria-hidden="true" />
          {c.knowledge(check.knowledge.mode, check.knowledge.retrieved)}
        </p>
      )}
      <p className="doc-check-note">{c.aiNote}</p>
      {items.length === 0 && <p className="doc-check-empty">{c.clean}</p>}

      {ISSUE_CATEGORIES.map((cat) => {
        const group = items.filter((i) => i.category === cat)
        if (!group.length) return null
        return (
          <section key={cat} className={`doc-check-group doc-cat--${cat}`}>
            <h3>
              <span className="doc-cat-dot" aria-hidden="true" />
              {c.categories[cat]}
            </h3>
            <ul>
              {group.map((issue) => (
                <li key={issue.id} className={`doc-issue is-${issue.status}`}>
                  <button type="button" className="doc-issue-title" onClick={() => issue.target && onGoTo(issue.target)} disabled={!issue.target}>
                    {issue.title}
                    {issue.target && <ArrowRight size={14} aria-label={c.goTo} />}
                  </button>
                  {issue.reason && <p className="doc-issue-reason">{issue.reason}</p>}
                  {issue.was && (
                    <div className="doc-issue-diff">
                      <p>
                        <span>{c.was}:</span> <del>{issue.was}</del>
                      </p>
                      <p>
                        <span>{c.now}:</span> <ins>{issue.now}</ins>
                      </p>
                    </div>
                  )}
                  {issue.confirmed === 'base' && <p className="doc-issue-base">{c.confirmedBase}</p>}
                  {issue.confirmed === 'needs_review' && <p className="doc-issue-review">{c.needsReview}</p>}
                  {issue.basis && (
                    <p className="doc-issue-basis">
                      {c.basis}: {[issue.basis.title, issue.basis.source, issue.basis.clause].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {issue.stale && <p className="doc-issue-review">{c.stale}</p>}
                  {issue.status === 'open' && !readOnly ? (
                    <div className="doc-issue-actions">
                      {issue.was && !issue.stale && (
                        <button type="button" className="doc-btn doc-btn--small doc-btn--accept" onClick={() => onAccept(issue)}>
                          <Check size={14} aria-hidden="true" />
                          {c.accept}
                        </button>
                      )}
                      <button type="button" className="doc-btn doc-btn--small" onClick={() => onReject(issue)}>
                        <X size={14} aria-hidden="true" />
                        {c.reject}
                      </button>
                      {issue.target && (
                        <button type="button" className="doc-btn doc-btn--small" onClick={() => onEdit(issue)}>
                          <PenLine size={14} aria-hidden="true" />
                          {c.editManually}
                        </button>
                      )}
                    </div>
                  ) : issue.status !== 'open' ? (
                    <p className="doc-issue-state">{c[issue.status]}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {(check.terms?.length > 0 || check.variants?.length > 0) && (
        <section className="doc-check-terms">
          <h3>
            <BookOpen size={16} aria-hidden="true" />
            {c.termsTitle}
          </h3>
          <ul className="doc-term-cards">
            {(check.terms ?? []).map((t) => (
              <li key={t.id}>
                <Link to={`/account/terms/${t.id}`} className="doc-term-card" title={c.openTerm}>
                  <strong>{termName(t)}</strong>
                  <span>{lang === 'kk' ? t.ru : t.kk}</span>
                </Link>
              </li>
            ))}
          </ul>
          {check.variants?.length > 0 && (
            <>
              <h4>{c.variantsTitle}</h4>
              <ul className="doc-variants">
                {check.variants.map((v) => (
                  <li key={v.text}>{c.variantUse(v.text, v.official)}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  )
}

/** «Показать изменения»: every accepted fix, before / after. */
export function ChangesPanel({ check, s, onGoTo }) {
  const done = (check?.items ?? []).filter((i) => i.status === 'accepted' && i.was)
  if (!done.length) return <p className="doc-check-empty">{s.changes.empty}</p>
  return (
    <ul className="doc-changes">
      {done.map((i) => (
        <li key={i.id}>
          <button type="button" className="doc-issue-title" onClick={() => onGoTo(i.target)}>
            {i.title}
            <ArrowRight size={14} aria-hidden="true" />
          </button>
          <div className="doc-issue-diff">
            <p>
              <span>{s.checkPanel.was}:</span> <del>{i.was}</del>
            </p>
            <p>
              <span>{s.checkPanel.now}:</span> <ins>{i.now}</ins>
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
