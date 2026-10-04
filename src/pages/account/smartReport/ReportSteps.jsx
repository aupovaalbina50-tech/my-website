import {
  ArrowRight,
  Check,
  CircleCheck,
  ClipboardCopy,
  Download,
  Loader2,
  Lock,
  LockOpen,
  RotateCcw,
  Save,
  SearchCheck,
  Sparkles,
  TriangleAlert,
  Wand2,
  X,
} from 'lucide-react'
import { dateIssue, hasPlaceholder, inferredFacts, missingFacts, timelineIssues } from './templates/index.js'

// The five steps of «Рапортты құрастыру». Each step is a plain view over the
// draft; the editor owns the state, saving and the server calls.

function Busy({ label }) {
  return (
    <span className="report-busy" role="status">
      <Loader2 size={18} className="report-spin" aria-hidden="true" />
      {label}
    </span>
  )
}

// ---- base terms, highlighted where they stand in the text ---------------------

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** One regex over every fragment the server matched; longest first. */
function termMatcher(terms) {
  const byFragment = new Map()
  for (const term of terms ?? []) for (const m of term.matches ?? []) byFragment.set(m.toLowerCase(), term)
  if (!byFragment.size) return null
  const source = [...byFragment.keys()].sort((a, b) => b.length - a.length).map(escapeRe).join('|')
  return { regex: new RegExp(`(${source})`, 'giu'), byFragment }
}

/** Text with base terms marked; hovering a mark shows the term in three languages. */
export function Highlighted({ text, matcher }) {
  if (!matcher || !text) return text
  return text.split(matcher.regex).map((part, i) => {
    const term = i % 2 === 1 ? matcher.byFragment.get(part.toLowerCase()) : null
    return term ? (
      <mark key={i} className="report-term" title={[term.kk, term.ru, term.en].filter(Boolean).join(' · ')}>
        {part}
      </mark>
    ) : (
      part
    )
  })
}

function TermList({ terms, lang, tr }) {
  if (!terms?.length) return <p className="report-muted">{tr.step3.termsNone}</p>
  return (
    <p className="report-term-list">
      <span className="report-term-list-lead">{tr.step3.termsLead(terms.length)}</span>{' '}
      {terms.map((term, i) => (
        <span key={term.id}>
          <span className="report-term-name" title={[term.kk, term.ru, term.en].filter(Boolean).join(' · ')}>
            {term[lang] || term.ru || term.kk}
          </span>
          {i < terms.length - 1 ? ', ' : ''}
        </span>
      ))}
    </p>
  )
}

// ---- 1. Что произошло? ------------------------------------------------------

export function StepSituation({ draft, patch, onExtract, busy, error, readOnly, tr }) {
  const hasFacts = Object.values(draft.facts ?? {}).some((f) => f?.value)
  return (
    <div className="report-step">
      <p className="report-step-hint">{tr.step1.hint}</p>
      <div className="report-field-row">
        <label className="report-label" htmlFor="report-lang">
          {tr.step1.langLabel}
        </label>
        <div className="report-seg" id="report-lang" role="radiogroup">
          {['kk', 'ru'].map((code) => (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={draft.lang === code}
              className={`report-seg-btn${draft.lang === code ? ' report-seg-btn--active' : ''}`}
              onClick={() => patch({ lang: code })}
              disabled={readOnly}
            >
              {code === 'kk' ? 'Қазақша' : 'Русский'}
            </button>
          ))}
        </div>
      </div>
      <textarea
        className="report-textarea report-textarea--source"
        value={draft.source_text}
        onChange={(e) => patch({ source_text: e.target.value })}
        placeholder={tr.step1.placeholder}
        readOnly={readOnly}
        rows={8}
      />
      <div className="report-actions">
        {!readOnly && !draft.source_text.trim() && (
          <button type="button" className="report-btn" onClick={() => patch({ source_text: tr.step1.exampleText })}>
            {tr.step1.example}
          </button>
        )}
        {!readOnly && (
          <button type="button" className="report-btn report-btn--primary" onClick={onExtract} disabled={busy}>
            <Sparkles size={18} aria-hidden="true" />
            {hasFacts ? tr.step1.reextract : tr.step1.extract}
          </button>
        )}
        {busy && <Busy label={tr.step1.extracting} />}
      </div>
      {error && <p className="report-error">{error}</p>}
    </div>
  )
}

// ---- status line: ОБНАРУЖЕНО / ИСПРАВЛЕНО / ТРЕБУЕТ ПРОВЕРКИ / НЕ ЗАПОЛНЕНО ---

function StatusBar({ items }) {
  return (
    <ul className="report-statusbar">
      {items.map((item) => (
        <li key={item.key} className={`report-statusbar-item report-statusbar-item--${item.key}`}>
          <span className="report-statusbar-num">{item.value}</span>
          <span className="report-statusbar-label">{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

// ---- 2. Основные сведения ---------------------------------------------------

/** «Сообщение 22:00 → Прибытие 09:00 — 11 ч 0 мин» / «Выезд раньше сообщения». */
function timelineText(issue, template, lang, tr) {
  const label = (key) => template.facts.find((f) => f.key === key)?.label[lang]
  if (issue.order) return tr.step2.chronoOrder(label(issue.to), issue.toTime, label(issue.from), issue.fromTime)
  const h = Math.floor(issue.gapMin / 60)
  const m = issue.gapMin % 60
  return tr.step2.chronoGap(label(issue.from), issue.fromTime, label(issue.to), issue.toTime, h, m)
}

function FactField({ field, fact, onChange, onConfirm, readOnly, tr, lang }) {
  const empty = !fact.value?.trim()
  const inferred = fact.inferred && !empty
  return (
    <div
      className={`report-fact${field.required && empty ? ' report-fact--missing' : ''}${inferred ? ' report-fact--inferred' : ''}${
        field.wide ? ' report-fact--wide' : ''
      }${field.time ? ' report-fact--time' : ''}`}
    >
      <label className="report-fact-label" htmlFor={`fact-${field.key}`}>
        {field.label[lang]}
        {field.required && (
          <span className="report-required" title={tr.step2.required}>
            *
          </span>
        )}
      </label>
      <input
        id={`fact-${field.key}`}
        className="report-input report-input--compact"
        value={fact.value ?? ''}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={field.time ? '00:00' : ''}
        readOnly={readOnly}
      />
      {inferred && !readOnly && (
        <button type="button" className="report-confirm" onClick={() => onConfirm(field.key)} title={fact.quote ? `«${fact.quote}»` : undefined}>
          <span className="report-confirm-tag">{tr.step2.inferredTag}</span>
          <Check size={13} aria-hidden="true" />
          {tr.step2.confirm}
        </button>
      )}
      {!inferred && fact.quote && (
        <p className="report-quote" title={fact.quote}>
          «{fact.quote}»
        </p>
      )}
    </div>
  )
}

export function StepFacts({ draft, template, patch, onCompose, busy, error, readOnly, tr, lang }) {
  const missing = missingFacts(template, draft.facts)
  const inferred = inferredFacts(template, draft.facts)
  const chrono = timelineIssues(template, draft.facts)
  const factOf = (key) => draft.facts?.[key] ?? { value: '', quote: '' }
  // Editing a value is the user's own statement — it is no longer a guess.
  const setFact = (key, value) => patch({ facts: { ...draft.facts, [key]: { ...factOf(key), value, inferred: false } } })
  const confirm = (key) => patch({ facts: { ...draft.facts, [key]: { ...factOf(key), inferred: false } } })
  const filled = template.facts.filter((f) => factOf(f.key).value?.trim()).length

  return (
    <div className="report-step">
      <p className="report-step-hint">{tr.step2.hint}</p>
      <StatusBar
        items={[
          { key: 'found', value: filled, label: tr.status.found },
          { key: 'review', value: inferred.length + chrono.length, label: tr.status.review },
          { key: 'missing', value: missing.length, label: tr.status.missing },
        ]}
      />

      <div className="report-title-row">
        <label className="report-fact-label" htmlFor="report-title">
          {tr.step2.titleLabel}
        </label>
        <input id="report-title" className="report-input report-input--compact" value={draft.title} onChange={(e) => patch({ title: e.target.value })} readOnly={readOnly} />
      </div>

      {template.groups.map((group) => {
        const fields = template.facts.filter((f) => f.group === group.key)
        const filledHere = fields.filter((f) => factOf(f.key).value?.trim()).length
        const missingHere = fields.filter((f) => missing.includes(f.key)).length
        const inferredHere = fields.filter((f) => inferred.includes(f.key)).length
        const chronoHere = group.key === 'timeline' && chrono.length > 0
        // Key groups stay open; the others open by themselves when they hold something.
        const startOpen = group.open || filledHere > 0
        return (
          <details key={group.key} className="report-group" open={startOpen}>
            <summary className="report-group-head">
              <span className="report-group-title">{group.title[lang]}</span>
              <span className="report-group-count">
                {filledHere}/{fields.length}
              </span>
              {missingHere > 0 && <span className="report-group-flag report-group-flag--missing">{tr.step2.missingCount(missingHere)}</span>}
              {inferredHere > 0 && <span className="report-group-flag report-group-flag--review">{tr.step2.inferredCount(inferredHere)}</span>}
              {chronoHere && <span className="report-group-flag report-group-flag--review">{tr.step2.chronoFlag}</span>}
            </summary>
            {chronoHere && (
              <ul className="report-chrono">
                {chrono.map((issue) => (
                  <li key={`${issue.from}-${issue.to}`}>
                    <TriangleAlert size={16} aria-hidden="true" />
                    {timelineText(issue, template, lang, tr)}
                  </li>
                ))}
              </ul>
            )}
            <div className={`report-facts${group.key === 'timeline' || group.key === 'people' ? ' report-facts--times' : ''}`}>
              {fields.map((field) => (
                <FactField
                  key={field.key}
                  field={field}
                  fact={factOf(field.key)}
                  onChange={setFact}
                  onConfirm={confirm}
                  readOnly={readOnly}
                  tr={tr}
                  lang={lang}
                />
              ))}
            </div>
          </details>
        )
      })}

      {!readOnly && (
        <div className="report-actions">
          <button type="button" className="report-btn report-btn--primary" onClick={onCompose} disabled={busy}>
            <Wand2 size={18} aria-hidden="true" />
            {tr.step2.compose}
          </button>
          {busy && <Busy label={tr.step2.composing} />}
        </div>
      )}
      {error && <p className="report-error">{error}</p>}
    </div>
  )
}

// ---- 3. Профессиональная формулировка ---------------------------------------

export function StepPhrasing({ draft, onCompose, onNext, busy, error, readOnly, tr, lang }) {
  const variants = draft.content?.variants ?? []
  const matcher = termMatcher(draft.terms)
  return (
    <div className="report-step">
      <p className="report-step-hint">{tr.step3.hint}</p>
      {busy ? (
        <div className="report-phrasing-loading">
          <Busy label={tr.step2.composing} />
        </div>
      ) : draft.phrasing?.length ? (
        // A new key per composition replays the animation after «Составить заново».
        <ol className="report-phrasing" key={draft.phrasing.map((p) => p.professional).join('|').length}>
          {draft.phrasing.map((p, i) => (
            <li key={i} className="report-phrasing-item" style={{ '--i': i }}>
              <div>
                <span className="report-phrasing-label">{tr.step3.original}</span>
                <p className="report-phrasing-original">{p.original}</p>
              </div>
              <ArrowRight className="report-phrasing-arrow" size={20} aria-hidden="true" />
              <div>
                <span className="report-phrasing-label">{tr.step3.professional}</span>
                <p className="report-phrasing-pro">
                  <Highlighted text={p.professional} matcher={matcher} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="report-muted">{tr.step3.noPhrasing}</p>
      )}

      <h3 className="report-subtitle">{tr.step3.termsTitle}</h3>
      <TermList terms={draft.terms} lang={lang} tr={tr} />

      {variants.length > 0 && (
        <>
          <h3 className="report-subtitle">{tr.step3.variantsTitle}</h3>
          <ul className="report-plain-list">
            {variants.map((v) => (
              <li key={v.text}>
                «{v.text}» → {tr.step3.variantOfficial} «{v.official}»
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="report-actions">
        {!readOnly && (
          <button type="button" className="report-btn" onClick={onCompose} disabled={busy}>
            <RotateCcw size={18} aria-hidden="true" />
            {tr.step3.regenerate}
          </button>
        )}
        <button type="button" className="report-btn report-btn--primary" onClick={onNext} disabled={busy}>
          {tr.step3.next}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
      {error && <p className="report-error">{error}</p>}
    </div>
  )
}

// ---- 4. Предварительный рапорт -----------------------------------------------

export function StepDraft({ draft, template, patchContent, onNext, readOnly, tr, lang }) {
  const content = draft.content ?? {}
  return (
    <div className="report-step">
      <p className="report-step-hint">{tr.step4.hint}</p>
      <div className="report-paper report-paper--edit">
        <fieldset className="report-paper-header">
          <legend className="report-subtitle">{tr.step4.headerTitle}</legend>
          {template.header.map((field) => (
            <label key={field.key} className="report-header-field">
              <span className="report-label">{field.label[lang]}</span>
              {/* Several lines: position, rank and name each on its own line. */}
              <textarea
                className="report-textarea report-textarea--header"
                value={content.header?.[field.key] ?? ''}
                placeholder={field.placeholder[lang]}
                onChange={(e) => patchContent({ header: { ...content.header, [field.key]: e.target.value } })}
                readOnly={readOnly}
                rows={3}
              />
            </label>
          ))}
          <p className="report-muted report-header-hint">{tr.step4.headerHint}</p>
        </fieldset>

        <p className="report-paper-title">{template.docTitle[lang]}</p>

        {template.sections.map((section) => {
          const text = content.sections?.[section.key] ?? ''
          return (
            <label key={section.key} className="report-section-field">
              <span className="report-section-label">{section.title[lang]}</span>
              <textarea
                className={`report-textarea report-textarea--section${hasPlaceholder(text) ? ' report-textarea--placeholder' : ''}`}
                value={text}
                onChange={(e) => patchContent({ sections: { ...content.sections, [section.key]: e.target.value } })}
                readOnly={readOnly}
                rows={3}
              />
            </label>
          )
        })}

        <div className="report-paper-footer">
          <label className="report-header-field">
            <span className="report-label">{tr.step4.dateLabel}</span>
            <input className="report-input" value={content.docDate ?? ''} onChange={(e) => patchContent({ docDate: e.target.value })} readOnly={readOnly} />
          </label>
          <label className="report-header-field">
            <span className="report-label">{tr.step4.signatureLabel}</span>
            <textarea
              className="report-textarea report-textarea--header"
              value={content.signature ?? ''}
              onChange={(e) => patchContent({ signature: e.target.value })}
              readOnly={readOnly}
              rows={2}
            />
          </label>
        </div>
      </div>
      <div className="report-actions">
        <button type="button" className="report-btn report-btn--primary" onClick={onNext}>
          {tr.step4.next}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

// ---- 5. Финальная проверка -----------------------------------------------------

/** The report as a sheet of paper (preview / what gets exported); base terms marked. */
export function ReportPaper({ doc, terms }) {
  const matcher = termMatcher(terms)
  return (
    <div className="report-paper">
      <div className="report-paper-requisites">
        {doc.header
          .filter((h) => h.value?.trim())
          .map((h) => (
            <p key={h.label}>{h.value}</p>
          ))}
      </div>
      <p className="report-paper-title">{doc.title}</p>
      {doc.paragraphs
        .filter((p) => p?.trim())
        .map((p, i) => (
          <p key={i} className="report-paper-para">
            <Highlighted text={p} matcher={matcher} />
          </p>
        ))}
      <div className="report-paper-sign">
        <span>{doc.date}</span>
        <span className="report-paper-signature">{doc.signature}</span>
      </div>
    </div>
  )
}

const KIND_ORDER = ['requisites', 'grammar', 'spelling', 'term', 'style']

function CorrectionCard({ correction, template, onApply, onReject, readOnly, tr, lang }) {
  const where = correction.target.startsWith('header.')
    ? template.header.find((h) => `header.${h.key}` === correction.target)?.label[lang]
    : template.sections.find((s) => s.key === correction.target)?.title[lang]
  const done = correction.status !== 'pending'
  return (
    <li className={`report-fix report-fix--${correction.status}`}>
      <div className="report-fix-head">
        <span className={`report-fix-kind report-fix-kind--${correction.kind}`}>{tr.step5.kinds[correction.kind] ?? correction.kind}</span>
        <span className="report-muted">{where}</span>
        {correction.status === 'applied' && <span className="report-fix-state report-fix-state--applied">{tr.status.fixed}</span>}
        {correction.status === 'rejected' && <span className="report-fix-state">{tr.step5.rejected}</span>}
        {correction.status === 'stale' && <span className="report-fix-state">{tr.step5.stale}</span>}
      </div>
      <dl className="report-fix-body">
        <dt>{tr.step5.was}</dt>
        <dd className="report-fix-was">«{correction.was}»</dd>
        <dt>{tr.step5.now}</dt>
        <dd className="report-fix-now">«{correction.now}»</dd>
        <dt>{tr.step5.reason}</dt>
        <dd>{correction.reason}</dd>
      </dl>
      {!done && !readOnly && (
        <div className="report-fix-actions">
          <button type="button" className="report-btn report-btn--small report-btn--primary" onClick={() => onApply(correction.id)}>
            <Check size={16} aria-hidden="true" />
            {tr.step5.apply}
          </button>
          <button type="button" className="report-btn report-btn--small" onClick={() => onReject(correction.id)}>
            <X size={16} aria-hidden="true" />
            {tr.step5.reject}
          </button>
        </div>
      )}
    </li>
  )
}

function IssueCard({ title, children }) {
  return (
    <li className="report-issue">
      <TriangleAlert size={20} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <div className="report-issue-details">{children}</div>
      </div>
    </li>
  )
}

export function StepCheck({
  draft,
  template,
  doc,
  checking,
  onRecheck,
  onSaveVersion,
  onFinalize,
  onReopen,
  onExport,
  onCopy,
  versions,
  busy,
  reviewing,
  reviewError,
  reviewOutdated,
  onReview,
  onApply,
  onApplyAll,
  onReject,
  readOnly,
  tr,
  lang,
}) {
  const missing = missingFacts(template, draft.facts)
  const inferred = inferredFacts(template, draft.facts)
  const chrono = timelineIssues(template, draft.facts)
  const dates = dateIssue(draft.facts?.date?.value, draft.content?.docDate)
  const sectionTexts = template.sections.map((s) => draft.content?.sections?.[s.key] ?? '')
  const placeholders = sectionTexts.some(hasPlaceholder)
  const variants = draft.content?.variants ?? []
  const review = draft.content?.review
  const corrections = [...(review?.corrections ?? [])].sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind))
  const pending = corrections.filter((c) => c.status === 'pending')
  const applied = corrections.filter((c) => c.status === 'applied')
  const aiIssues = review?.issues ?? []
  const factLabel = (k) => template.facts.find((f) => f.key === k)?.label[lang]

  const found = corrections.length + aiIssues.length + chrono.length + (dates ? 1 : 0) + variants.length
  const needsReview = pending.length + aiIssues.length + chrono.length + (dates ? 1 : 0) + inferred.length + variants.length
  const notFilled = missing.length + (placeholders ? 1 : 0)
  const final = draft.status === 'final'
  const formatDate = (value) => new Date(value).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="report-step report-check">
      <p className="report-step-hint">{tr.step5.hint}</p>
      <StatusBar
        items={[
          { key: 'found', value: found, label: tr.status.found },
          { key: 'fixed', value: applied.length, label: tr.status.fixed },
          { key: 'review', value: needsReview, label: tr.status.review },
          { key: 'missing', value: notFilled, label: tr.status.missing },
        ]}
      />

      <div className="report-check-grid">
        <div className="report-check-side">
          <div className="report-check-toolbar">
            <h3 className="report-subtitle">{tr.step5.checksTitle}</h3>
            {!readOnly && (
              <button type="button" className="report-btn report-btn--small" onClick={onReview} disabled={reviewing}>
                <SearchCheck size={16} aria-hidden="true" />
                {reviewing ? tr.step5.reviewing : tr.step5.check}
              </button>
            )}
          </div>
          {reviewing && <Busy label={tr.step5.reviewing} />}
          {reviewError && <p className="report-error">{reviewError}</p>}
          {reviewOutdated && !reviewing && <p className="report-note">{tr.step5.outdated}</p>}

          {/* Logic problems first: they need the user's attention, not a click. */}
          <ul className="report-issues">
            {dates && (
              <IssueCard title={tr.step5.dateTitle}>
                {tr.step5.dateDetails(dates.incidentDate, dates.reportDate)}
              </IssueCard>
            )}
            {chrono.map((issue) => (
              <IssueCard key={`${issue.from}-${issue.to}`} title={tr.step5.chronoTitle}>
                {timelineText(issue, template, lang, tr)}
              </IssueCard>
            ))}
            {aiIssues.map((issue, i) => (
              <IssueCard key={i} title={issue.title}>
                {issue.details}
              </IssueCard>
            ))}
            {inferred.length > 0 && (
              <IssueCard title={tr.step5.inferredTitle}>{tr.step5.inferredDetails(inferred.map(factLabel).join(', '))}</IssueCard>
            )}
            {missing.length > 0 && <IssueCard title={tr.status.missing}>{missing.map(factLabel).join(', ')}</IssueCard>}
            {placeholders && <IssueCard title={tr.status.missing}>{tr.step5.placeholdersLeft}</IssueCard>}
            {variants.map((v) => (
              <IssueCard key={v.text} title={tr.step3.variantsTitle}>
                «{v.text}» → {tr.step3.variantOfficial} «{v.official}»
              </IssueCard>
            ))}
          </ul>
          {review && !reviewing && !aiIssues.length && !chrono.length && !dates && !missing.length && !placeholders && (
            <p className="report-summary-line report-summary-line--ok">
              <CircleCheck size={18} aria-hidden="true" />
              {tr.step5.noIssues}
            </p>
          )}

          {corrections.length > 0 && (
            <>
              <div className="report-check-toolbar">
                <h3 className="report-subtitle">{tr.step5.correctionsTitle}</h3>
                {pending.length > 1 && !readOnly && (
                  <button type="button" className="report-btn report-btn--small report-btn--primary" onClick={onApplyAll}>
                    <Check size={16} aria-hidden="true" />
                    {tr.step5.applyAll(pending.length)}
                  </button>
                )}
              </div>
              <ul className="report-fixes">
                {corrections.map((c) => (
                  <CorrectionCard key={c.id} correction={c} template={template} onApply={onApply} onReject={onReject} readOnly={readOnly} tr={tr} lang={lang} />
                ))}
              </ul>
            </>
          )}
          {review && !reviewing && corrections.length === 0 && (
            <p className="report-summary-line report-summary-line--ok">
              <CircleCheck size={18} aria-hidden="true" />
              {tr.step5.noCorrections}
            </p>
          )}

          <h3 className="report-subtitle">{tr.step3.termsTitle}</h3>
          <TermList terms={draft.terms} lang={lang} tr={tr} />
          <button type="button" className="report-btn report-btn--small" onClick={onRecheck} disabled={checking}>
            <RotateCcw size={16} aria-hidden="true" />
            {checking ? tr.step5.checking : tr.step5.recheck}
          </button>

          <div className="report-actions report-actions--stack">
            {!final && (
              <>
                <button type="button" className="report-btn" onClick={onSaveVersion} disabled={busy}>
                  <Save size={18} aria-hidden="true" />
                  {tr.step5.saveVersion}
                </button>
                <button type="button" className="report-btn report-btn--primary" onClick={onFinalize} disabled={busy}>
                  <Lock size={18} aria-hidden="true" />
                  {tr.step5.finalize}
                </button>
              </>
            )}
            {final && (
              <button type="button" className="report-btn" onClick={onReopen} disabled={busy}>
                <LockOpen size={18} aria-hidden="true" />
                {tr.step5.reopen}
              </button>
            )}
            <button type="button" className="report-btn" onClick={onExport}>
              <Download size={18} aria-hidden="true" />
              {tr.step5.exportDocx}
            </button>
            <button type="button" className="report-btn" onClick={onCopy}>
              <ClipboardCopy size={18} aria-hidden="true" />
              {tr.step5.copyText}
            </button>
          </div>

          <h3 className="report-subtitle">{tr.step5.versionsTitle}</h3>
          {versions.length ? (
            <ul className="report-versions">
              {versions.map((v) => (
                <li key={v.id}>
                  <strong>{tr.versionShort(v.version)}</strong>
                  <span>{formatDate(v.created_at)}</span>
                  {v.note && <span className="report-status report-status--final">{v.note}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="report-muted">{tr.step5.versionsNone}</p>
          )}
        </div>
        <div>
          <h3 className="report-subtitle">{tr.step5.previewTitle}</h3>
          <p className="report-muted report-preview-note">
            <mark className="report-term">{tr.step5.termSample}</mark> — {tr.step5.termLegend}
          </p>
          <ReportPaper doc={doc} terms={draft.terms} />
        </div>
      </div>
    </div>
  )
}

