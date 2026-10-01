import { useState } from 'react'
import { Building2, Info, Users, Link2, Target, ListChecks, Phone, Mail, ShieldCheck } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import {
  COMMITTEES,
  COMMITTEES_SOURCE_URL,
  COMMITTEES_VERIFIED_AT,
  committeeSourceUrls,
} from '../../data/committees'

// A value can be shared ('x') or per-language ({ kk, ru }).
const pick = (value, lang) => (value && typeof value === 'object' ? value[lang] : value)
const telHref = (phone) => `tel:${phone.split(',')[0].replace(/[^\d+]/g, '')}`

function SourceLink({ href, children }) {
  return (
    <a className="modal-source-link committees-source-link" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

function CommitteesContent() {
  const { t, lang } = useLanguage()
  const c = t.committees
  const [selectedId, setSelectedId] = useState(COMMITTEES[0].id)
  const selected = COMMITTEES.find((committee) => committee.id === selectedId) || COMMITTEES[0]
  const sources = committeeSourceUrls(selected.code, lang)
  const chairPhone = pick(selected.chairPhone, lang)
  const contacts = selected.contacts
  const contactEmail = pick(contacts.email, lang)

  return (
    <section id="committees" className="section-committees">
      <div className="section-kicker" aria-hidden="true"></div>
      <h1 className="section-title">{t.nav.committees}</h1>
      <p className="section-lead">{c.lead}</p>
      <p className="org-verified-note">
        <ShieldCheck size={15} aria-hidden="true" />
        {c.verifiedNote(COMMITTEES_VERIFIED_AT)}
      </p>

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
              <span>{committee.name[lang]}</span>
            </button>
          ))}
        </nav>

        <div className="committees-detail" key={selected.id}>
          <p className="committees-detail-eyebrow">
            <span className="committees-detail-eyebrow-mark" aria-hidden="true"></span>
            {c.detailEyebrow}
          </p>
          <h2 className="committees-detail-title">{selected.name[lang]}</h2>

          <div className="committees-detail-section">
            <h3 className="committees-detail-heading">
              <Info size={16} aria-hidden="true" />
              {c.sectionGeneral}
            </h3>
            <p className="committees-detail-text">{selected.description[lang]}</p>
            <SourceLink href={sources.about}>{c.sourceShort}</SourceLink>
          </div>

          {selected.tasks && (
            <div className="committees-detail-section">
              <h3 className="committees-detail-heading">
                <Target size={16} aria-hidden="true" />
                {c.sectionTasks}
              </h3>
              {selected.tasks[lang].map((paragraph) => (
                <p key={paragraph} className="committees-detail-text committees-detail-text--spaced">
                  {paragraph}
                </p>
              ))}
              <SourceLink href={sources.about}>{c.sourceShort}</SourceLink>
            </div>
          )}

          <div className="committees-detail-section">
            <h3 className="committees-detail-heading">
              <ListChecks size={16} aria-hidden="true" />
              {c.sectionDirections}
            </h3>
            {selected.directions ? (
              <ul className="org-tag-list">
                {selected.directions[lang].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="modal-meta-empty">{c.infoPending}</p>
            )}
            <SourceLink href={sources.about}>{c.sourceShort}</SourceLink>
          </div>

          <div className="committees-detail-section">
            <h3 className="committees-detail-heading">
              <Users size={16} aria-hidden="true" />
              {c.sectionLeadership}
            </h3>
            <div className="org-person-grid org-person-grid--compact">
              {selected.leadership[lang].map((person) => (
                <article
                  key={person.name}
                  className={`org-person-card${person.chair ? ' org-person-card--lead' : ''}`}
                >
                  <p className="org-person-role">{person.role}</p>
                  <h4 className="org-person-name">{person.name}</h4>
                  {person.chair && (chairPhone || selected.chairEmail) && (
                    <div className="org-person-contacts">
                      {chairPhone && (
                        <a href={telHref(chairPhone)}>
                          <Phone size={13} aria-hidden="true" />
                          {chairPhone}
                        </a>
                      )}
                      {selected.chairEmail && (
                        <a href={`mailto:${selected.chairEmail}`}>
                          <Mail size={13} aria-hidden="true" />
                          {selected.chairEmail}
                        </a>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
            <SourceLink href={sources.structure}>{c.sourceShort}</SourceLink>
          </div>

          <div className="committees-detail-section">
            <h3 className="committees-detail-heading">
              <Phone size={16} aria-hidden="true" />
              {c.sectionContacts}
            </h3>
            <div className="modal-meta org-contacts">
              <div className="modal-meta-row">
                <span className="modal-meta-label">{c.addressLabel}:</span>
                <span>{pick(contacts.address, lang) || c.infoPending}</span>
              </div>
              <div className="modal-meta-row">
                <span className="modal-meta-label">{c.officeLabel}:</span>
                <span>{pick(contacts.office, lang) || c.infoPending}</span>
              </div>
              <div className="modal-meta-row">
                <span className="modal-meta-label">{c.emailLabel}:</span>
                {contactEmail ? <a href={`mailto:${contactEmail}`}>{contactEmail}</a> : <span>{c.infoPending}</span>}
              </div>
              {contacts.extra &&
                contacts.extra[lang].map((line) => (
                  <div key={line} className="modal-meta-row">
                    <span>{line}</span>
                  </div>
                ))}
            </div>
            <SourceLink href={sources.contacts}>{c.sourceShort}</SourceLink>
          </div>

          <div className="committees-detail-section">
            <h3 className="committees-detail-heading">
              <Link2 size={16} aria-hidden="true" />
              {c.sectionLinks}
            </h3>
            <div className="committees-detail-links">
              <a className="modal-source-link" href={sources.about} target="_blank" rel="noreferrer">
                {c.detailsButton}: gov.kz ↗
              </a>
              <a className="modal-source-link" href={COMMITTEES_SOURCE_URL[lang]} target="_blank" rel="noreferrer">
                {c.sourceLabel}: {c.sourceLinkText} ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CommitteesContent
