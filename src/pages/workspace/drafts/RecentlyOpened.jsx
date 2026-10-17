import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock3, PlayCircle } from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { templateById } from '../../account/documents/catalog/index.js'
import { docStrings } from '../../account/documents/strings.js'
import { listDrafts } from './localDrafts.js'
import { readRecent } from './recent.js'
import './drafts.css'

// «Недавно открытые документы»: what this user opened in the editor on this
// device, with the real state of each document — from the database (title,
// type, last change, open remarks) and from this device (a copy not yet
// confirmed by the server). Documents deleted since are left out.

export function RecentlyOpened({ userId, documents, lang }) {
  const { t } = useLanguage()
  const r = t.workspace.drafts.recent
  const s = docStrings(lang)
  const [local, setLocal] = useState(() => new Map())
  useEffect(() => {
    let alive = true
    listDrafts(userId)
      .then((rows) => alive && setLocal(new Map(rows.map((row) => [row.docId, row]))))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [userId])
  const byId = new Map(documents.filter((d) => d.kind === 'document').map((d) => [d.id, d]))
  const list = readRecent(userId)
    .map((entry) => ({ entry, doc: byId.get(entry.id) }))
    .filter((x) => x.doc)
    .slice(0, 6)
  if (!list.length) return null
  const fmt = (iso) => new Date(iso).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  return (
    <section className="recent-docs" aria-label={r.title}>
      <h2>
        <Clock3 size={18} aria-hidden="true" /> {r.title}
      </h2>
      <ul>
        {list.map(({ doc }) => {
          const copy = local.get(doc.id)
          const unsynced = copy && new Date(copy.savedAt) > new Date(doc.updated_at)
          return (
            <li key={doc.id} className="recent-doc">
              <div className="recent-doc-main">
                <span className="recent-doc-title">{doc.title || templateById(doc.template_id)?.title[lang]}</span>
                <span className="recent-doc-meta">
                  {templateById(doc.template_id)?.title[lang] ?? doc.template_id} · {r.updated(fmt(doc.updated_at))}
                </span>
                <span className="recent-doc-flags">
                  <span className={`recent-flag ${unsynced ? 'is-local' : 'is-synced'}`}>{unsynced ? r.unsynced : r.synced}</span>
                  <span className={`recent-flag ${doc.issue_count > 0 ? 'is-issues' : ''}`}>{doc.issue_count > 0 ? r.issues(doc.issue_count) : r.noIssues}</span>
                  <span className={`doc-status doc-status--${doc.status}`}>{s.docStatus[doc.status] ?? doc.status}</span>
                </span>
              </div>
              <Link to={`/account/documents/${doc.id}`} className="doc-btn doc-btn--primary doc-btn--small">
                <PlayCircle size={15} aria-hidden="true" /> {r.continue}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
