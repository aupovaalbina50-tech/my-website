import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'
import { CATEGORIES } from '../../i18n/translations'
import { categoryLucideIcon } from '../../constants/categoryIcons.js'
import { LANG_TAG, LANG_ORDER } from '../../constants/langTags.js'
import { toSentenceCase } from '../../utils/textCase.js'

function TermMapPanel({
  term,
  lang,
  t,
  hazardLabel,
  groupLabel,
  relatedTerms,
  relatedTotal = 0,
  onSelectRelated,
  onClose,
  crossHazards = [],
  currentHazardId = null,
  onSelectHazard,
  showConnections = false,
  onToggleConnections,
}) {
  const [activeLang, setActiveLang] = useState('kk')
  const category = term.category ? CATEGORIES.find((c) => c.key === term.category) : null
  const categoryLabel = category?.[lang] || term.category || null
  const CategoryIcon = term.category ? categoryLucideIcon(term.category) : null
  const title = toSentenceCase(term[lang] || term.ru || term.kk || term.en)
  const translationRows = LANG_ORDER.filter((code) => term[code]).map((code) => ({
    code,
    label: t.langNames[code],
    value: toSentenceCase(term[code]),
  }))

  return (
    <>
      <div className="term-map-panel-backdrop" onClick={onClose} />
      <aside className="term-map-panel" role="dialog" aria-label={title}>
        <div className="term-map-panel-header">
          <div className="term-map-panel-header-text">
            {category && CategoryIcon && (
              <span className="term-entry-category">
                <CategoryIcon size={13} strokeWidth={2.5} aria-hidden="true" />
                {categoryLabel}
              </span>
            )}
            <h2 className="term-map-panel-title">{title}</h2>
          </div>
          <button
            type="button"
            className="term-map-panel-close"
            onClick={onClose}
            aria-label={t.termMap.panel.close}
            title={t.termMap.panel.close}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="term-map-panel-body">
          <div className="term-entry-translations term-map-panel-translations">
            {translationRows.map((row) => {
              const isActive = row.code === activeLang
              return (
                <div
                  key={row.code}
                  className={`term-entry-translation${isActive ? ' active' : ''}`}
                  data-lang={row.code}
                >
                  <button
                    type="button"
                    className="term-entry-lang-tag"
                    title={row.label}
                    onClick={() => setActiveLang(row.code)}
                    aria-pressed={isActive}
                  >
                    {LANG_TAG[row.code]}
                  </button>
                  <span className="term-entry-divider" aria-hidden="true" />
                  <span className="term-entry-value">{row.value}</span>
                </div>
              )
            })}
          </div>

          {hazardLabel && (
            <div className="term-map-panel-section">
              <span className="term-map-panel-section-label">{t.termMap.panel.hazardLabel}</span>
              <span className="term-map-panel-section-value">{hazardLabel}</span>
            </div>
          )}

          {groupLabel && (
            <div className="term-map-panel-section">
              <span className="term-map-panel-section-label">{t.termMap.panel.groupLabel}</span>
              <span className="term-map-panel-section-value">{groupLabel}</span>
            </div>
          )}

          {crossHazards.length > 1 && (
            <div className="term-map-panel-section">
              <span className="term-map-panel-section-label">{t.termMap.crossHazardsLabel}</span>
              <div className="term-map-panel-related">
                {crossHazards.map((hazard) => {
                  const isCurrent = hazard.id === currentHazardId
                  return (
                    <button
                      key={hazard.id}
                      type="button"
                      className={`term-map-panel-hazard-chip${isCurrent ? ' current' : ''}`}
                      onClick={() => !isCurrent && onSelectHazard(hazard.id)}
                      disabled={isCurrent}
                      title={hazard.name[lang]}
                    >
                      <hazard.Icon size={14} aria-hidden="true" />
                      {hazard.name[lang]}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {(relatedTotal > 0 || crossHazards.length > 0) && (
            <div className="term-map-panel-section">
              <div className="term-map-panel-connections-stats">
                {relatedTotal > 0 && <span>{t.termMap.relatedTermsCount(relatedTotal)}</span>}
                {crossHazards.length > 0 && <span>{t.termMap.crossCountBadge(crossHazards.length)}</span>}
              </div>
              <button type="button" className="term-map-panel-connections-btn" onClick={onToggleConnections}>
                {showConnections ? t.termMap.hideConnections : t.termMap.showConnections}
              </button>
            </div>
          )}

          {relatedTerms.length > 0 && (
            <div className="term-map-panel-section">
              <span className="term-map-panel-section-label">{t.termMap.panel.relatedLabel}</span>
              <div className="term-map-panel-related">
                {relatedTerms.map((related) => (
                  <button
                    key={related.id}
                    type="button"
                    className="term-map-panel-related-chip"
                    onClick={() => onSelectRelated(related.id)}
                  >
                    {toSentenceCase(related[lang] || related.ru)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Link to={`/terms/${term.id}`} className="term-map-panel-more-link">
            {t.termMap.panel.detailsLink}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </>
  )
}

export default TermMapPanel
