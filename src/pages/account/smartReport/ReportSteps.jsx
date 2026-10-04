import { ArrowRight, CircleAlert, CircleCheck, ClipboardCopy, Download, Loader2, Lock, LockOpen, RotateCcw, Save, Sparkles, TriangleAlert, Wand2 } from 'lucide-react'
import { hasPlaceholder, missingFacts } from './templates/index.js'

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

// ---- 2. Основные сведения ---------------------------------------------------

export function StepFacts({ draft, template, patch, onCompose, busy, error, readOnly, tr, lang }) {
  const missing = missingFacts(template, draft.facts)
  const setFact = (key, value) => patch({ facts: { ...draft.facts, [key]: { ...(draft.facts?.[key] ?? { quote: '' }), value } } })
  return (
    <div className="report-step">
      <p className="report-step-hint">{tr.step2.hint}</p>

      <div className={`report-notice${missing.length ? ' report-notice--warn' : ' report-notice--ok'}`}>
        {missing.length ? <TriangleAlert size={20} aria-hidden="true" /> : <CircleCheck size={20} aria-hidden="true" />}
        <div>
          <strong>{missing.length ? tr.step2.missingTitle : tr.step2.missingNone}</strong>
          {missing.length > 0 && (
            <>
              <ul className="report-chip-list">
                {missing.map((key) => (
                  <li key={key} className="report-chip report-chip--warn">
                    {template.facts.find((f) => f.key === key)?.label[lang]}
                  </li>
                ))}
              </ul>
              <p className="report-muted">{tr.step2.missingHint}</p>
            </>
          )}
        </div>
      </div>

      <label className="report-label" htmlFor="report-title">
        {tr.step2.titleLabel}
      </label>
      <input id="report-title" className="report-input" value={draft.title} onChange={(e) => patch({ title: e.target.value })} readOnly={readOnly} />

      <div className="report-facts">
        {template.facts.map((field) => {
          const fact = draft.facts?.[field.key] ?? { value: '', quote: '' }
          const empty = !fact.value?.trim()
          return (
            <div key={field.key} className={`report-fact${field.required && empty ? ' report-fact--missing' : ''}`}>
              <label className="report-label" htmlFor={`fact-${field.key}`}>
                {field.label[lang]}
                {field.required && <span className="report-required">{tr.step2.required}</span>}
              </label>
              <input
                id={`fact-${field.key}`}
                className="report-input"
                value={fact.value ?? ''}
                onChange={(e) => setFact(field.key, e.target.value)}
                readOnly={readOnly}
              />
              {fact.quote && (
                <p className="report-quote">
                  {tr.step2.fromText} «{fact.quote}»
                </p>
              )}
            </div>
          )
        })}
      </div>

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

export function TermChips({ terms, lang }) {
  return (
    <ul className="report-chip-list">
      {terms.map((term) => (
        <li key={term.id} className="report-chip report-chip--term" title={[term.kk, term.ru, term.en].filter(Boolean).join(' · ')}>
          {term[lang] || term.ru || term.kk}
        </li>
      ))}
    </ul>
  )
}

export function StepPhrasing({ draft, onCompose, onNext, busy, error, readOnly, tr, lang }) {
  const variants = draft.content?.variants ?? []
  return (
    <div className="report-step">
      <p className="report-step-hint">{tr.step3.hint}</p>
      {draft.phrasing?.length ? (
        <ol className="report-phrasing">
          {draft.phrasing.map((p, i) => (
            <li key={i} className="report-phrasing-item">
              <div>
                <span className="report-phrasing-label">{tr.step3.original}</span>
                <p className="report-phrasing-original">{p.original}</p>
              </div>
              <ArrowRight className="report-phrasing-arrow" size={20} aria-hidden="true" />
              <div>
                <span className="report-phrasing-label">{tr.step3.professional}</span>
                <p className="report-phrasing-pro">{p.professional}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="report-muted">{tr.step3.noPhrasing}</p>
      )}

      <h3 className="report-subtitle">{tr.step3.termsTitle}</h3>
      {draft.terms?.length ? <TermChips terms={draft.terms} lang={lang} /> : <p className="report-muted">{tr.step3.termsNone}</p>}

      {variants.length > 0 && (
        <>
          <h3 className="report-subtitle">{tr.step3.variantsTitle}</h3>
          <ul className="report-chip-list">
            {variants.map((v) => (
              <li key={v.text} className="report-chip report-chip--warn">
                {v.text} → {tr.step3.variantOfficial} {v.official}
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
        {busy && <Busy label={tr.step2.composing} />}
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
              <input
                className="report-input"
                value={content.header?.[field.key] ?? ''}
                placeholder={field.placeholder[lang]}
                onChange={(e) => patchContent({ header: { ...content.header, [field.key]: e.target.value } })}
                readOnly={readOnly}
              />
            </label>
          ))}
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
            <input className="report-input" value={content.signature ?? ''} onChange={(e) => patchContent({ signature: e.target.value })} readOnly={readOnly} />
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

/** The report as a sheet of paper (preview / what gets exported). */
export function ReportPaper({ doc }) {
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
            {p}
          </p>
        ))}
      <div className="report-paper-sign">
        <span>{doc.date}</span>
        <span>{doc.signature}</span>
      </div>
    </div>
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
  tr,
  lang,
}) {
  const missing = missingFacts(template, draft.facts)
  const sectionTexts = template.sections.map((s) => draft.content?.sections?.[s.key] ?? '')
  const placeholders = sectionTexts.some(hasPlaceholder)
  const emptySections = sectionTexts.some((s) => !s.trim())
  const variants = draft.content?.variants ?? []
  const checks = [
    {
      ok: missing.length === 0,
      text: missing.length
        ? tr.step5.factsMissing(missing.map((k) => template.facts.find((f) => f.key === k)?.label[lang]).join(', '))
        : tr.step5.factsOk,
    },
    { ok: !placeholders, text: placeholders ? tr.step5.placeholdersLeft : tr.step5.placeholdersOk },
    { ok: !emptySections, text: emptySections ? tr.step5.sectionsEmpty : tr.step5.sectionsOk },
    { ok: draft.terms?.length > 0, text: draft.terms?.length ? tr.step5.termsOk(draft.terms.length) : tr.step5.termsNone, info: true },
    ...(variants.length ? [{ ok: false, text: tr.step5.variantsLeft(variants.length) }] : []),
  ]
  const final = draft.status === 'final'
  const formatDate = (value) => new Date(value).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div className="report-step report-check">
      <p className="report-step-hint">{tr.step5.hint}</p>
      <div className="report-check-grid">
        <div>
          <h3 className="report-subtitle">{tr.step5.checksTitle}</h3>
          <ul className="report-checks">
            {checks.map((c, i) => (
              <li key={i} className={`report-check-item report-check-item--${c.ok ? 'ok' : c.info ? 'info' : 'warn'}`}>
                {c.ok ? <CircleCheck size={20} aria-hidden="true" /> : <CircleAlert size={20} aria-hidden="true" />}
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
          {draft.terms?.length > 0 && <TermChips terms={draft.terms} lang={lang} />}
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
          <ReportPaper doc={doc} />
        </div>
      </div>
    </div>
  )
}
