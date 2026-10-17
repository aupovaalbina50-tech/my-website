import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Archive, ArchiveRestore, Check, Copy, FilePlus2, FileSearch, Library, Loader2, PencilLine, Search, Trash2, X } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../auth/AuthContext.jsx'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { useToast } from '../../components/ToastContext.jsx'
import { templateById } from '../account/documents/catalog/index.js'
import { docStrings } from '../account/documents/strings.js'
import { duplicateDocument, loadDocument, updateDocument, useMyDocuments } from '../account/documents/useDocuments.js'
import { checkOutdated, loadContents } from './documentModel.js'
import { RecentlyOpened } from './drafts/RecentlyOpened.jsx'
import './myDocuments.css'

// «Мои документы»: every document of the signed-in user (constructor and
// «Умный рапорт»). Row level security returns only the user's own rows; the
// actions here are the same calls the editor uses.

const STATUS_FILTERS = ['active', 'draft', 'review', 'issues', 'checked', 'ready', 'archive']
const DAYS = { all: null, today: 1, week: 7, month: 30 }

const statusGroup = (s) => (s === 'filling' ? 'draft' : s)


export default function MyDocuments({ embedded = false }) {
  const { lang: uiLang, t } = useLanguage()
  const lang = uiLang === 'kk' ? 'kk' : 'ru'
  const m = t.workspace.mine
  const statusLabel = docStrings(lang).docStatus
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { items, loading, error, refresh, remove, setStatus } = useMyDocuments()

  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '')
  const [type, setType] = useState('all')
  // ?status=draft from the counters of «Рабочая панель».
  const [params] = useSearchParams()
  const [status, setStatusFilter] = useState(STATUS_FILTERS.includes(params.get('status')) ? params.get('status') : 'active')
  const [period, setPeriod] = useState('all')
  const [sort, setSort] = useState('desc')
  const [contents, setContents] = useState(null) // full-text index, loaded on the first search
  const [renaming, setRenaming] = useState(null)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    if (query.trim().length < 2 || contents) return
    let alive = true
    loadContents().then((c) => alive && setContents(c))
    return () => {
      alive = false
    }
  }, [query, contents])

  const types = useMemo(() => [...new Set(items.map((i) => (i.kind === 'report' ? 'report' : i.template_id)))], [items])
  const typeName = (item) => (item.kind === 'report' ? m.smartReport : (templateById(item.template_id)?.title[lang] ?? item.template_id))

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const since = DAYS[period] ? Date.now() - DAYS[period] * 86400000 : null
    return items
      .filter((i) => (status === 'active' ? i.status !== 'archive' : statusGroup(i.status) === status))
      .filter((i) => type === 'all' || (i.kind === 'report' ? 'report' : i.template_id) === type)
      .filter((i) => !since || new Date(i.updated_at).getTime() >= since)
      .map((i) => {
        if (!q) return { ...i, match: null }
        if ((i.title ?? '').toLowerCase().includes(q)) return { ...i, match: 'title' }
        if (contents?.map.get(`${i.kind}-${i.id}`)?.includes(q)) return { ...i, match: 'text' }
        return null
      })
      .filter(Boolean)
      .sort((a, b) => (new Date(b.updated_at) - new Date(a.updated_at)) * (sort === 'desc' ? 1 : -1))
  }, [items, query, contents, type, status, period, sort])

  const fmt = (d) => new Date(d).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { dateStyle: 'short', timeStyle: 'short' })
  const open = (item, extra = '') => navigate(item.kind === 'report' ? `/account/smart-report/${item.id}` : `/account/documents/${item.id}${extra}`)

  const copy = async (item) => {
    try {
      const source = await loadDocument(item.id)
      const row = await duplicateDocument(user.id, source, templateById(source.template_id), m.copySuffix)
      showToast(m.copied, { type: 'success' })
      await refresh()
      return row
    } catch {
      showToast(m.copyFailed, { type: 'error' })
    }
  }
  const rename = async (item) => {
    const title = newTitle.trim()
    if (!title || title === item.title) return setRenaming(null)
    try {
      if (item.kind === 'report') {
        const { error: e } = await supabase.from('work_reports').update({ title }).eq('id', item.id).select('id').single()
        if (e) throw e
      } else await updateDocument(item.id, { title })
      setRenaming(null)
      showToast(m.renamed, { type: 'success' })
      refresh()
    } catch {
      showToast(m.renameFailed, { type: 'error' })
    }
  }
  const del = async (item) => {
    if (!window.confirm(m.confirmDelete(item.title || m.untitled))) return
    const ok = await remove(item)
    showToast(ok ? m.deleted : m.deleteFailed, { type: ok ? 'success' : 'error' })
  }

  const noDocuments = !loading && !error && items.length === 0

  return (
    <section className={`mydocs${embedded ? ' mydocs--embedded' : ''}`}>
      {!embedded && (
        <header className="mydocs-head">
          <div>
            <h1 className="mydocs-title">{m.title}</h1>
            <p className="mydocs-lead">{m.lead}</p>
          </div>
          <div className="mydocs-head-actions">
            <Link to="/account/workspace/create" className="doc-btn doc-btn--primary">
              <FilePlus2 size={16} aria-hidden="true" /> {m.create}
            </Link>
            <Link to="/account/workspace/catalog" className="doc-btn">
              <Library size={16} aria-hidden="true" /> {m.library}
            </Link>
          </div>
        </header>
      )}

      {noDocuments ? (
        <div className="mydocs-empty">
          <p>{m.empty}</p>
          <div className="mydocs-head-actions">
            <Link to="/account/workspace/create" className="doc-btn doc-btn--primary">
              <FilePlus2 size={16} aria-hidden="true" /> {m.create}
            </Link>
            <Link to="/account/workspace/catalog" className="doc-btn">
              <Library size={16} aria-hidden="true" /> {m.library}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {user && !loading && <RecentlyOpened userId={user.id} documents={items} lang={lang} />}
          <div className="mydocs-filters">
            <label className="mydocs-search">
              <Search size={16} aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={m.searchPlaceholder} aria-label={m.searchPlaceholder} />
            </label>
            <select className="doc-input" value={type} onChange={(e) => setType(e.target.value)} aria-label={m.type}>
              <option value="all">{m.allTypes}</option>
              {types.map((id) => (
                <option key={id} value={id}>
                  {id === 'report' ? m.smartReport : (templateById(id)?.title[lang] ?? id)}
                </option>
              ))}
            </select>
            <select className="doc-input" value={status} onChange={(e) => setStatusFilter(e.target.value)} aria-label={m.status}>
              {STATUS_FILTERS.map((st) => (
                <option key={st} value={st}>
                  {st === 'active' ? m.allActive : statusLabel[st]}
                </option>
              ))}
            </select>
            <select className="doc-input" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label={m.period}>
              {Object.keys(DAYS).map((p) => (
                <option key={p} value={p}>
                  {m.periods[p]}
                </option>
              ))}
            </select>
            <select className="doc-input" value={sort} onChange={(e) => setSort(e.target.value)} aria-label={m.sort}>
              <option value="desc">{m.newestFirst}</option>
              <option value="asc">{m.oldestFirst}</option>
            </select>
          </div>
          {query.trim().length >= 2 && !contents && <p className="mydocs-note">{m.searchingText}</p>}
          {contents?.failed && <p className="mydocs-note">{m.textSearchFailed}</p>}

          {loading && (
            <p className="mydocs-note">
              <Loader2 size={16} className="doc-spin" aria-hidden="true" /> {m.loading}
            </p>
          )}
          {error && (
            <p className="doc-error" role="alert">
              {m.loadFailed}{' '}
              <button type="button" className="exp-link" onClick={refresh}>
                {t.workspace.dashboard.retry}
              </button>
            </p>
          )}
          {!loading && visible.length === 0 && <p className="mydocs-note">{m.nothingFound}</p>}

          <ul className="mydocs-list">
            {visible.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="mydocs-item">
                <div className="mydocs-main">
                  {renaming === item.id ? (
                    <form
                      className="mydocs-rename"
                      onSubmit={(e) => {
                        e.preventDefault()
                        rename(item)
                      }}
                    >
                      <input className="doc-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} maxLength={200} aria-label={m.rename} autoFocus />
                      <button type="submit" className="doc-icon-btn" aria-label={m.save} title={m.save}>
                        <Check size={16} aria-hidden="true" />
                      </button>
                      <button type="button" className="doc-icon-btn" onClick={() => setRenaming(null)} aria-label={m.cancel} title={m.cancel}>
                        <X size={16} aria-hidden="true" />
                      </button>
                    </form>
                  ) : (
                    <button type="button" className="mydocs-open" onClick={() => open(item)}>
                      {item.title || m.untitled}
                    </button>
                  )}
                  <span className="mydocs-type">
                    {typeName(item)}
                    {item.source?.origin === 'upload' && ` · ${m.uploaded}`}
                    {item.match === 'text' && ` · ${m.foundInText}`}
                  </span>
                </div>
                <span className={`doc-status doc-status--${item.status}`}>{statusLabel[item.status] ?? item.status}</span>
                <dl className="mydocs-facts">
                  <div>
                    <dt>{m.updated}</dt>
                    <dd>{fmt(item.updated_at)}</dd>
                  </div>
                  <div>
                    <dt>{m.lastCheck}</dt>
                    <dd>
                      {item.checked_at ? fmt(item.checked_at) : m.notChecked}
                      {checkOutdated(item) && <span className="mydocs-outdated">{m.changedAfterCheck}</span>}
                    </dd>
                  </div>
                </dl>
                <div className="mydocs-actions">
                  <button type="button" className="doc-btn doc-btn--small" onClick={() => open(item)}>
                    {m.open}
                  </button>
                  {item.kind === 'document' && item.status !== 'archive' && (
                    <button type="button" className="doc-btn doc-btn--small" onClick={() => open(item, '?check=1')}>
                      <FileSearch size={14} aria-hidden="true" /> {m.check}
                    </button>
                  )}
                  <button
                    type="button"
                    className="doc-icon-btn"
                    onClick={() => {
                      setRenaming(item.id)
                      setNewTitle(item.title ?? '')
                    }}
                    title={m.rename}
                    aria-label={m.rename}
                  >
                    <PencilLine size={16} aria-hidden="true" />
                  </button>
                  {item.kind === 'document' && (
                    <>
                      <button type="button" className="doc-icon-btn" onClick={() => copy(item)} title={m.copy} aria-label={m.copy}>
                        <Copy size={16} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="doc-icon-btn"
                        onClick={() => setStatus(item, item.status === 'archive' ? 'filling' : 'archive')}
                        title={item.status === 'archive' ? m.unarchive : m.archive}
                        aria-label={item.status === 'archive' ? m.unarchive : m.archive}
                      >
                        {item.status === 'archive' ? <ArchiveRestore size={16} aria-hidden="true" /> : <Archive size={16} aria-hidden="true" />}
                      </button>
                    </>
                  )}
                  <button type="button" className="doc-icon-btn doc-icon-btn--danger" onClick={() => del(item)} title={m.remove} aria-label={m.remove}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
