import { useId, useState } from 'react'
import { ChevronDown, MapPin, Network, Landmark, Mail, Phone, ShieldCheck } from 'lucide-react'
import SiteSectionLayout from '../components/SiteSectionLayout.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import {
  MINISTRY_NAME,
  MINISTRY_MISSION,
  MINISTRY_SOURCES,
  MINISTRY_DIRECTIONS,
  MINISTRY_LEADERSHIP,
  MINISTRY_CONTACTS,
  MINISTRY_CENTRAL_DEPARTMENTS,
  MINISTRY_VERIFIED_AT,
} from '../data/ministry'
import {
  MINISTRY_STRUCTURE_SOURCE_URL,
  MINISTRY_TERRITORIAL_BODIES,
  MINISTRY_SUBORDINATE_ORGANIZATIONS,
} from '../data/ministryStructure'

function SourceLink({ href, children }) {
  return (
    <a className="modal-source-link ministry-structure-sublink" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

function AccordionSection({ icon: Icon, title, count, isOpen, onToggle, children }) {
  const panelId = useId()

  return (
    <div className={`ministry-accordion-item${isOpen ? ' open' : ''}`}>
      <h3 className="ministry-accordion-heading">
        <button
          type="button"
          className="ministry-accordion-trigger"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          <span className="ministry-accordion-trigger-label">
            <Icon size={18} aria-hidden="true" />
            {title}
            {count != null && <span className="org-count-badge">{count}</span>}
          </span>
          <ChevronDown size={18} className="ministry-accordion-chevron" aria-hidden="true" />
        </button>
      </h3>
      <div id={panelId} className="ministry-accordion-panel" role="region">
        <div className="ministry-accordion-panel-inner">
          <div className="ministry-accordion-body">{children}</div>
        </div>
      </div>
    </div>
  )
}

function StructureList({ title, items, sourceUrl, sourceText }) {
  return (
    <div className="ministry-structure-subgroup">
      {title && <h4 className="ministry-structure-subheading">{title}</h4>}
      <ul className="ministry-structure-list">
        {items.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      {sourceUrl && <SourceLink href={sourceUrl}>{sourceText}</SourceLink>}
    </div>
  )
}

function MinistryPage() {
  const { lang, t } = useLanguage()
  const m = t.ministry
  const missionRest = MINISTRY_MISSION[lang].slice(MINISTRY_NAME[lang].length)
  const [openSection, setOpenSection] = useState(null)

  const toggleSection = (id) => {
    setOpenSection((current) => (current === id ? null : id))
  }

  const territorial = MINISTRY_TERRITORIAL_BODIES[lang]

  return (
    <SiteSectionLayout activeSection="ministry">
      <section id="ministry" className="section-ministry">
        <div className="section-kicker" aria-hidden="true"></div>
        <h1 className="section-title">{t.sections.ministryTitle}</h1>
        <p className="org-verified-note">
          <ShieldCheck size={15} aria-hidden="true" />
          {m.verifiedNote(MINISTRY_VERIFIED_AT)}
        </p>

        <div className="ministry-panel">
          <div className="ministry-panel-section ministry-mission-block">
            <h2 className="ministry-subtitle">{m.missionTitle}</h2>
            <p className="ministry-mission">
              <strong className="ministry-mission-name">{MINISTRY_NAME[lang]}</strong>
              {missionRest}
            </p>
            <SourceLink href={MINISTRY_SOURCES.gov[lang]}>{m.sourceGovText}</SourceLink>
          </div>

          <div className="ministry-panel-section">
            <h2 className="ministry-subtitle">{m.leadershipTitle}</h2>
            <div className="org-person-grid">
              {MINISTRY_LEADERSHIP.map((person) => (
                <article
                  key={person.id}
                  className={`org-person-card${person.id === 'minister' ? ' org-person-card--lead' : ''}`}
                >
                  <p className="org-person-role">{person.role[lang]}</p>
                  <h3 className="org-person-name">{person.name[lang]}</h3>
                  {person.areas && (
                    <p className="org-person-areas">
                      <span className="org-person-areas-label">{m.areasLabel}:</span> {person.areas[lang]}
                    </p>
                  )}
                  {person.phone || person.email ? (
                    <div className="org-person-contacts">
                      {person.phone && (
                        <a href={`tel:${person.phone.replace(/[^\d+]/g, '')}`}>
                          <Phone size={13} aria-hidden="true" />
                          {person.phone}
                        </a>
                      )}
                      {person.email && (
                        <a href={`mailto:${person.email}`}>
                          <Mail size={13} aria-hidden="true" />
                          {person.email}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="org-person-note">{m.noPersonalContacts}</p>
                  )}
                </article>
              ))}
            </div>
            <SourceLink href={MINISTRY_SOURCES.leadership[lang]}>{m.structureSourceText}</SourceLink>
          </div>

          <div className="ministry-panel-section">
            <h2 className="ministry-subtitle">{m.directionsTitle}</h2>
            <ul className="org-tag-list">
              {MINISTRY_DIRECTIONS[lang].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <SourceLink href={MINISTRY_SOURCES.gov[lang]}>{m.structureSourceText}</SourceLink>
          </div>

          <div className="ministry-panel-section">
            <h2 className="ministry-subtitle">{m.contactsTitle}</h2>
            <div className="modal-meta org-contacts">
              <div className="modal-meta-row">
                <span className="modal-meta-label">{m.addressLabel}:</span>
                <span>{MINISTRY_CONTACTS.address[lang]}</span>
              </div>
              <div className="modal-meta-row">
                <span className="modal-meta-label">{m.officeLabel}:</span>
                <span>{MINISTRY_CONTACTS.office}</span>
              </div>
              <div className="modal-meta-row">
                <span className="modal-meta-label">{m.trustLineLabel}:</span>
                <span>{MINISTRY_CONTACTS.trustLine}</span>
              </div>
              <div className="modal-meta-row">
                <span className="modal-meta-label">{m.pressLabel}:</span>
                <span>{MINISTRY_CONTACTS.press}</span>
              </div>
              <div className="modal-meta-row">
                <span className="modal-meta-label">{m.emergencyLabel}:</span>
                <span>{MINISTRY_CONTACTS.emergency}</span>
              </div>
              <div className="modal-meta-row">
                <span className="modal-meta-label">{m.emailLabel}:</span>
                <a href={`mailto:${MINISTRY_CONTACTS.email}`}>{MINISTRY_CONTACTS.email}</a>
              </div>
            </div>
            <SourceLink href={MINISTRY_SOURCES.contacts[lang]}>{m.structureSourceText}</SourceLink>
          </div>

          <div className="ministry-panel-section">
            <h2 className="ministry-subtitle">{m.structureTitle}</h2>

            <div className="ministry-accordion">
              <AccordionSection
                icon={Landmark}
                title={m.centralTitle}
                count={MINISTRY_CENTRAL_DEPARTMENTS[lang].length}
                isOpen={openSection === 'central'}
                onToggle={() => toggleSection('central')}
              >
                <StructureList
                  items={MINISTRY_CENTRAL_DEPARTMENTS[lang]}
                  sourceUrl={MINISTRY_SOURCES.departments[lang]}
                  sourceText={m.structureSourceText}
                />
              </AccordionSection>

              <AccordionSection
                icon={MapPin}
                title={m.territorialTitle}
                count={territorial.regional.length + territorial.cities.length + territorial.industrialSafety.length}
                isOpen={openSection === 'territorial'}
                onToggle={() => toggleSection('territorial')}
              >
                <div className="ministry-structure-subgroups">
                  <StructureList title={m.territorialRegionalTitle} items={territorial.regional} />
                  <StructureList
                    title={m.territorialCitiesTitle}
                    items={territorial.cities}
                    sourceUrl={MINISTRY_STRUCTURE_SOURCE_URL.territorial[lang]}
                    sourceText={m.structureSourceText}
                  />
                  <StructureList
                    title={m.territorialIndustrialSafetyTitle}
                    items={territorial.industrialSafety}
                    sourceUrl={MINISTRY_STRUCTURE_SOURCE_URL.industrialSafety[lang]}
                    sourceText={m.structureSourceText}
                  />
                </div>
              </AccordionSection>

              <AccordionSection
                icon={Network}
                title={m.organizationsTitle}
                count={MINISTRY_SUBORDINATE_ORGANIZATIONS[lang].length}
                isOpen={openSection === 'organizations'}
                onToggle={() => toggleSection('organizations')}
              >
                <StructureList
                  items={MINISTRY_SUBORDINATE_ORGANIZATIONS[lang]}
                  sourceUrl={MINISTRY_STRUCTURE_SOURCE_URL.organizations[lang]}
                  sourceText={m.structureSourceText}
                />
              </AccordionSection>
            </div>
          </div>
        </div>
      </section>
    </SiteSectionLayout>
  )
}

export default MinistryPage
