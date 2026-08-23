import { useState } from 'react'
import { Building2, Info, Users, Link2 } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { COMMITTEES, COMMITTEES_SOURCE_URL } from '../../data/committees'

function CommitteesContent() {
  const { t } = useLanguage()
  const [selectedId, setSelectedId] = useState(COMMITTEES[0].id)
  const selected = COMMITTEES.find((committee) => committee.id === selectedId) || COMMITTEES[0]

  return (
    <section id="committees" className="section-committees">
      <div className="section-kicker" aria-hidden="true"></div>
      <h1 className="section-title">{t.nav.committees}</h1>
      <p className="section-lead">{t.committees.lead}</p>

      <div className="committees-split">
        <nav className="committees-nav" aria-label={t.nav.committees}>
          {COMMITTEES.map((committee) => (
            <button
              key={committee.id}
              type="button"
              className={`committees-nav-item${committee.id === selectedId ? ' active' : ''}`}
              onClick={() => setSelectedId(committee.id)}
              aria-current={committee.id === selectedId ? 'true' : undefined}
            >
              <Building2 size={16} className="committees-nav-item-icon" aria-hidden="true" />
              <span>{committee.name.kk}</span>
            </button>
          ))}
        </nav>

        <div className="committees-detail" key={selected.id}>
          <p className="committees-detail-eyebrow">
            <span className="committees-detail-eyebrow-mark" aria-hidden="true"></span>
            {t.committees.detailEyebrow}
          </p>
          <h2 className="committees-detail-title">{selected.name.kk}</h2>

          <div className="committees-detail-section">
            <h3 className="committees-detail-heading">
              <Info size={16} aria-hidden="true" />
              {t.committees.sectionGeneral}
            </h3>
            <p className="committees-detail-text">{selected.description.kk}</p>
          </div>

          <div className="committees-detail-section">
            <h3 className="committees-detail-heading">
              <Users size={16} aria-hidden="true" />
              {t.committees.sectionLeadership}
            </h3>
            <div className="modal-meta">
              <div className="modal-meta-row">
                <span className="modal-meta-label">{t.committees.chairLabel}</span>
                <span>{selected.chair.kk}</span>
              </div>
              {selected.phone && (
                <div className="modal-meta-row">
                  <span className="modal-meta-label">{t.committees.phoneLabel}</span>
                  <span>{selected.phone.kk}</span>
                </div>
              )}
              {selected.email && (
                <div className="modal-meta-row">
                  <span className="modal-meta-label">{t.committees.emailLabel}</span>
                  <span>{selected.email}</span>
                </div>
              )}
              {!selected.phone && !selected.email && (
                <p className="modal-meta-empty">{t.committees.noContact}</p>
              )}
            </div>
          </div>

          <div className="committees-detail-section">
            <h3 className="committees-detail-heading">
              <Link2 size={16} aria-hidden="true" />
              {t.committees.sectionLinks}
            </h3>
            <div className="committees-detail-links">
              {selected.link && (
                <a
                  className="modal-source-link"
                  href={selected.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.committees.detailsButton}: gov.kz ↗
                </a>
              )}
              <a
                className="modal-source-link"
                href={COMMITTEES_SOURCE_URL.kk}
                target="_blank"
                rel="noreferrer"
              >
                {t.committees.sourceLabel}: {t.committees.sourceLinkText} ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CommitteesContent
