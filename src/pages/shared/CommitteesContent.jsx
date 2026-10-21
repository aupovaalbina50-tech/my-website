import { useState } from 'react'
import { Building2, ExternalLink, Link2, ListChecks, Mail, MapPin, Phone, Target, Users } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import {
  COMMITTEES,
  COMMITTEES_SOURCE_URL,
  committeeSourceUrls,
} from '../../data/committees'

// A value can be shared ('x') or per-language ({ kk, ru }).
const pick = (value, lang) => (value && typeof value === 'object' ? value[lang] : value)
const telHref = (phone) => `tel:${phone.split(',')[0].replace(/[^\d+]/g, '')}`

function SourceItem({ href, children }) {
  return (
    <li>
      <a href={href} target="_blank" rel="noreferrer">
        <span>{children}</span>
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    </li>
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
          <p className="committees-detail-lead">{selected.description[lang]}</p>

          <section className="committees-detail-section" aria-labelledby="committee-directions">
            <h3 className="committees-detail-heading" id="committee-directions">
              <ListChecks size={18} aria-hidden="true" />
              {c.sectionDirections}
            </h3>
            <ul className="committees-directions">
              {selected.directions[lang].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="committees-detail-section" aria-labelledby="committee-tasks">
            <h3 className="committees-detail-heading" id="committee-tasks">
              <Target size={18} aria-hidden="true" />
              {c.sectionTasks}
            </h3>
            <ol className="committees-tasks">
              {selected.tasks[lang].map((task, index) => (
                <li key={task}>
                  <span className="committees-task-number" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{task}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="committees-detail-section" aria-labelledby="committee-leadership">
            <h3 className="committees-detail-heading" id="committee-leadership">
              <Users size={18} aria-hidden="true" />
              {c.sectionLeadership}
            </h3>
            <ul className="committees-people">
              {selected.leadership[lang].map((person) => (
                <li key={person.name} className={person.chair ? 'is-chair' : undefined}>
                  <span className="committees-people-role">{person.role}</span>
                  <span className="committees-people-name">{person.name}</span>
                  {person.chair && (chairPhone || selected.chairEmail) && (
                    <span className="committees-people-contacts">
                      {chairPhone && (
                        <a href={telHref(chairPhone)}>
                          <Phone size={14} aria-hidden="true" />
                          {chairPhone}
                        </a>
                      )}
                      {selected.chairEmail && (
                        <a href={`mailto:${selected.chairEmail}`}>
                          <Mail size={14} aria-hidden="true" />
                          {selected.chairEmail}
                        </a>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="committees-aside" aria-labelledby="committee-contacts">
          <section className="committees-aside-card">
            <h3 className="committees-aside-heading" id="committee-contacts">
              <Phone size={16} aria-hidden="true" />
              {c.sectionContacts}
            </h3>
            <dl className="committees-contacts">
              <div>
                <dt>
                  <MapPin size={14} aria-hidden="true" />
                  {c.addressLabel}
                </dt>
                <dd>{pick(contacts.address, lang) || c.infoPending}</dd>
              </div>
              <div>
                <dt>
                  <Phone size={14} aria-hidden="true" />
                  {c.officeLabel}
                </dt>
                <dd>{pick(contacts.office, lang) || c.infoPending}</dd>
              </div>
              <div>
                <dt>
                  <Mail size={14} aria-hidden="true" />
                  {c.emailLabel}
                </dt>
                <dd>{contactEmail ? <a href={`mailto:${contactEmail}`}>{contactEmail}</a> : c.infoPending}</dd>
              </div>
              {contacts.extra &&
                contacts.extra[lang].map((line) => {
                  const [label, value] = line.split(' — ')
                  return (
                    <div key={line}>
                      <dt>
                        <Phone size={14} aria-hidden="true" />
                        {label}
                      </dt>
                      <dd>{value ?? ''}</dd>
                    </div>
                  )
                })}
            </dl>
          </section>

          <section className="committees-aside-card">
            <h3 className="committees-aside-heading">
              <Link2 size={16} aria-hidden="true" />
              {c.sourcesTitle}
            </h3>
            <ul className="committees-sources">
              {selected.regulationUrl && <SourceItem href={selected.regulationUrl}>{c.srcRegulation}</SourceItem>}
              <SourceItem href={sources.about}>{c.srcAbout}</SourceItem>
              <SourceItem href={sources.structure}>{c.srcStructure}</SourceItem>
              <SourceItem href={sources.contacts}>{c.srcContacts}</SourceItem>
              <SourceItem href={COMMITTEES_SOURCE_URL[lang]}>{c.srcAll}</SourceItem>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  )
}

export default CommitteesContent
