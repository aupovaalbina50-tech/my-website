import { useId, useState } from 'react'
import { ChevronDown, MapPin, Building2, Network } from 'lucide-react'
import SiteSectionLayout from '../components/SiteSectionLayout.jsx'
import { useLanguage } from '../i18n/LanguageContext.jsx'
import { MINISTRY_NAME, MINISTRY_MISSION, MINISTRY_SOURCES } from '../data/ministry'
import {
  MINISTRY_STRUCTURE_SOURCE_URL,
  MINISTRY_TERRITORIAL_BODIES,
  MINISTRY_SUBORDINATE_INSTITUTIONS,
  MINISTRY_SUBORDINATE_ORGANIZATIONS,
} from '../data/ministryStructure'

function AccordionSection({ icon: Icon, title, isOpen, onToggle, children }) {
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

function AccordionList({ items, sourceUrl, sourceText }) {
  return (
    <>
      <ul className="ministry-structure-list">
        {items.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      {sourceUrl && (
        <a className="modal-source-link ministry-structure-sublink" href={sourceUrl} target="_blank" rel="noreferrer">
          {sourceText}
        </a>
      )}
    </>
  )
}

function TerritorialSubgroup({ title, items, sourceUrl, sourceText }) {
  return (
    <div className="ministry-structure-subgroup">
      <h4 className="ministry-structure-subheading">{title}</h4>
      <ul className="ministry-structure-list">
        {items.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      {sourceUrl && (
        <a className="modal-source-link ministry-structure-sublink" href={sourceUrl} target="_blank" rel="noreferrer">
          {sourceText}
        </a>
      )}
    </div>
  )
}

function MinistryPage() {
  const { lang, t } = useLanguage()
  const missionRest = MINISTRY_MISSION[lang].slice(MINISTRY_NAME[lang].length)
  const [openSection, setOpenSection] = useState(null)

  const toggleSection = (id) => {
    setOpenSection((current) => (current === id ? null : id))
  }

  return (
    <SiteSectionLayout activeSection="ministry">
      <section id="ministry" className="section-ministry">
        <div className="section-kicker" aria-hidden="true"></div>
        <h1 className="section-title">{t.sections.ministryTitle}</h1>

        <div className="ministry-panel">
          <div className="ministry-panel-section ministry-mission-block">
            <h3 className="ministry-subtitle">{t.ministry.missionTitle}</h3>
            <p className="ministry-mission">
              <strong className="ministry-mission-name">{MINISTRY_NAME[lang]}</strong>
              {missionRest}
            </p>
            <a
              className="modal-source-link"
              href={MINISTRY_SOURCES.gov[lang]}
              target="_blank"
              rel="noreferrer"
            >
              {t.ministry.sourceGovText}
            </a>
          </div>

          <div className="ministry-panel-section">
            <h3 className="ministry-subtitle">{t.ministry.structureTitle}</h3>

            <div className="ministry-accordion">
              <AccordionSection
                icon={MapPin}
                title={t.ministry.territorialTitle}
                isOpen={openSection === 'territorial'}
                onToggle={() => toggleSection('territorial')}
              >
                <div className="ministry-structure-subgroups">
                  <TerritorialSubgroup
                    title={t.ministry.territorialRegionalTitle}
                    items={MINISTRY_TERRITORIAL_BODIES[lang].regional}
                    sourceUrl={MINISTRY_STRUCTURE_SOURCE_URL.territorial[lang]}
                    sourceText={t.ministry.structureSourceText}
                  />
                  <TerritorialSubgroup
                    title={t.ministry.territorialCitiesTitle}
                    items={MINISTRY_TERRITORIAL_BODIES[lang].cities}
                  />
                  <TerritorialSubgroup
                    title={t.ministry.territorialFireRescueTitle}
                    items={MINISTRY_TERRITORIAL_BODIES[lang].fireRescue}
                  />
                  <TerritorialSubgroup
                    title={t.ministry.territorialIndustrialSafetyTitle}
                    items={MINISTRY_TERRITORIAL_BODIES[lang].industrialSafety}
                    sourceUrl={MINISTRY_STRUCTURE_SOURCE_URL.industrialSafety[lang]}
                    sourceText={t.ministry.structureSourceText}
                  />
                </div>
              </AccordionSection>

              <AccordionSection
                icon={Building2}
                title={t.ministry.institutionsTitle}
                isOpen={openSection === 'institutions'}
                onToggle={() => toggleSection('institutions')}
              >
                <AccordionList
                  items={MINISTRY_SUBORDINATE_INSTITUTIONS[lang]}
                  sourceUrl={MINISTRY_STRUCTURE_SOURCE_URL.institutions[lang]}
                  sourceText={t.ministry.structureSourceText}
                />
              </AccordionSection>

              <AccordionSection
                icon={Network}
                title={t.ministry.organizationsTitle}
                isOpen={openSection === 'organizations'}
                onToggle={() => toggleSection('organizations')}
              >
                <AccordionList
                  items={MINISTRY_SUBORDINATE_ORGANIZATIONS[lang]}
                  sourceUrl={MINISTRY_STRUCTURE_SOURCE_URL.organizations[lang]}
                  sourceText={t.ministry.structureSourceText}
                />
              </AccordionSection>
            </div>
          </div>

          <div className="ministry-panel-section">
            <p className="empty-state-text">{t.sections.comingSoon}</p>
          </div>
        </div>
      </section>
    </SiteSectionLayout>
  )
}

export default MinistryPage
