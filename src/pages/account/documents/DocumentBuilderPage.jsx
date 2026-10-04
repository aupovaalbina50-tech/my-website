import './documents.css'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  Copy,
  FileStack,
  Info,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Wand2,
} from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { useToast } from '../../../components/ToastContext.jsx'
import { CATEGORIES, fieldsOf, searchTemplates, TEMPLATES, templateById } from './catalog/index.js'
import { DOC_STATUSES, duplicateDocument, loadDocument, suggestDocumentType, useFavoriteTemplates, useMyDocuments } from './useDocuments.js'
import { docStrings, errorText } from './strings.js'
import { Modal } from './Dialogs.jsx'

// «Конструктор профессиональной документации»: the catalog of document types
// (search, categories, ⭐, «Не знаете, какой документ выбрать?») and «Мои
// документы». Creating a type opens the universal editor; «Рапорт» opens the
// existing «Умный рабочий рапорт». Checking an already finished, uploaded
// document stays the separate «Құжат мазмұнын сараптау» tool.

function StatusBadge({ status, s }) {
  return <span className={`doc-tpl-status doc-tpl-status--${status}`}>{s.templateStatus[status]}</span>
}

function TemplateCard({ template, s, lang, favorite, onFavorite, onCreate, onDetails }) {
  const [open, setOpen] = useState(false)
  const fields = fieldsOf(template)
  return (
    <li className="doc-card">
      <div className="doc-card-top">
        <span className="doc-card-cat">
          {template.categories.map((c) => CATEGORIES.find((x) => x.key === c)?.letter).join(' · ')}
        </span>
        <button
          type="button"
          className={`doc-star${favorite ? ' is-on' : ''}`}
          onClick={() => onFavorite(template.id)}
          aria-pressed={favorite}
          aria-label={favorite ? s.favoriteRemove : s.favoriteAdd}
          title={favorite ? s.favoriteRemove : s.favoriteAdd}
        >
          <Star size={18} aria-hidden="true" />
        </button>
      </div>
      <h3 className="doc-card-title">{template.title[lang]}</h3>
      <p className="doc-card-purpose">{template.purpose[lang]}</p>
      <div className="doc-card-badges">
        <StatusBadge status={template.status} s={s} />
        {template.engine === 'smart' && (
          <span className="doc-smart-badge">
            <Wand2 size={13} aria-hidden="true" />
            {s.smartBadge}
          </span>
        )}
      </div>
      {open && (
        <ol className="doc-card-structure">
          {template.engine === 'smart' ? (
            <li>{s.smartInfo}</li>
          ) : (
            template.sections.map((sec) => (
              <li key={sec.key}>
                <strong>{sec.title[lang]}</strong>
                <span>
                  {sec.fields.map((f) => (
                    <span key={f.key} className={f.required ? 'is-required' : undefined}>
                      {f.label[lang]}
                      {f.required ? ' *' : ''}
                    </span>
                  ))}
                </span>
              </li>
            ))
          )}
        </ol>
      )}
      <div className="doc-card-actions">
        <button type="button" className="doc-btn doc-btn--primary" onClick={() => onCreate(template)}>
          <Plus size={16} aria-hidden="true" />
          {s.create}
        </button>
        <button type="button" className="doc-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          {open ? s.hideStructure : s.structure}
        </button>
        <button type="button" className="doc-btn" onClick={() => onDetails(template)}>
          <Info size={16} aria-hidden="true" />
          {s.details}
        </button>
      </div>
      {template.engine !== 'smart' && <p className="doc-card-foot">{`${s.sectionsCount(template.sections.length)} · ${s.requiredCount(fields.filter((f) => f.required).length)}`}</p>}
    </li>
  )
}

function DetailsDialog({ template, s, lang, onCreate, onClose }) {
  const fields = fieldsOf(template)
  return (
    <Modal title={template.title[lang]} onClose={onClose}>
      <dl className="doc-details">
        <dt>{s.category}</dt>
        <dd>{template.categories.map((c) => CATEGORIES.find((x) => x.key === c)?.title[lang]).join('; ')}</dd>
        <dt>{s.purpose}</dt>
        <dd>{template.purpose[lang]}</dd>
        <dt>{s.templateStatus[template.status]}</dt>
        <dd>{s.templateStatusInfo[template.status]}</dd>
        <dt>{s.source}</dt>
        <dd>
          {template.source ? (
            <>
              {template.source.title}
              {template.source.edition ? `, ${template.source.edition}` : ''}
              {template.source.url && (
                <>
                  {' '}
                  <a href={template.source.url} target="_blank" rel="noreferrer">
                    {template.source.url}
                  </a>
                </>
              )}
            </>
          ) : (
            s.sourcePlatform
          )}
        </dd>
        {template.engine === 'smart' ? (
          <dd className="doc-details-wide">{s.smartInfo}</dd>
        ) : (
          <dd className="doc-details-wide">{`${s.sectionsCount(template.sections.length)} · ${s.requiredCount(fields.filter((f) => f.required).length)}`}</dd>
        )}
      </dl>
      <footer className="doc-modal-actions">
        <button type="button" className="doc-btn" onClick={onClose}>
          {s.close}
        </button>
        <button type="button" className="doc-btn doc-btn--primary" onClick={() => onCreate(template)}>
          <Plus size={16} aria-hidden="true" />
          {s.create}
        </button>
      </footer>
    </Modal>
  )
}

/** «Не знаете, какой документ выбрать?» — suggestions only; nothing is created without a click. */
function Finder({ s, lang, onCreate, onDetails }) {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const submit = async (ev) => {
    ev.preventDefault()
    if (query.trim().length < 5) return
    setBusy(true)
    setError(null)
    try {
      const out = await suggestDocumentType(
        query.trim(),
        TEMPLATES.map((t) => ({ id: t.id, title: t.title[lang], purpose: t.purpose[lang] })),
        lang,
      )
      setResult(out.suggestions.map((sug) => ({ ...sug, template: templateById(sug.id) })).filter((x) => x.template))
    } catch (e) {
      setError(errorText(s, e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="doc-finder">
      <div className="doc-finder-head">
        <Sparkles size={20} aria-hidden="true" />
        <div>
          <h2>{s.finder.title}</h2>
          <p>{s.finder.lead}</p>
        </div>
      </div>
      <form className="doc-finder-form" onSubmit={submit}>
        <input className="doc-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={s.finder.placeholder} maxLength={600} />
        <button type="submit" className="doc-btn doc-btn--accent" disabled={busy || query.trim().length < 5}>
          {busy ? <Loader2 size={16} className="doc-spin" aria-hidden="true" /> : <Wand2 size={16} aria-hidden="true" />}
          {busy ? s.finder.busy : s.finder.submit}
        </button>
      </form>
      {error && <p className="doc-error">{error}</p>}
      {result && result.length === 0 && <p className="doc-finder-none">{s.finder.none}</p>}
      {result && result.length > 0 && (
        <div className="doc-finder-result">
          <p className="doc-finder-label">{s.finder.result}</p>
          <ul>
            {result.map(({ template, why }) => (
              <li key={template.id}>
                <div>
                  <strong>{template.title[lang]}</strong>
                  <p>{why}</p>
                </div>
                <div className="doc-finder-actions">
                  <button type="button" className="doc-btn doc-btn--primary doc-btn--small" onClick={() => onCreate(template)}>
                    {s.create}
                  </button>
                  <button type="button" className="doc-btn doc-btn--small" onClick={() => onDetails(template)}>
                    {s.details}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function Catalog({ s, lang, onCreate }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [details, setDetails] = useState(null)
  const { favorites, toggle } = useFavoriteTemplates()
  const found = useMemo(() => searchTemplates({ query, category, favorites }), [query, category, favorites])
  // In «Все» the list is grouped by category; a type in two categories shows in both.
  const groups =
    category === 'all' || category === 'favorites'
      ? CATEGORIES.map((c) => ({ category: c, items: found.filter((t) => t.categories.includes(c.key)) })).filter((g) => g.items.length)
      : [{ category: CATEGORIES.find((c) => c.key === category), items: found }]
  const card = (t) => (
    <TemplateCard key={t.id} template={t} s={s} lang={lang} favorite={favorites.has(t.id)} onFavorite={toggle} onCreate={onCreate} onDetails={setDetails} />
  )
  return (
    <>
      <Finder s={s} lang={lang} onCreate={onCreate} onDetails={setDetails} />
      <section className="doc-catalog">
        <div className="doc-catalog-tools">
          <label className="doc-search">
            <Search size={17} aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={s.search} aria-label={s.search} />
          </label>
          <div className="doc-chips" role="tablist">
            {[
              { key: 'all', label: s.all },
              { key: 'favorites', label: `★ ${s.favoritesFilter}` },
              ...CATEGORIES.map((c) => ({ key: c.key, label: `${c.letter}. ${c.title[lang]}` })),
            ].map((chip) => (
              <button key={chip.key} type="button" role="tab" aria-selected={category === chip.key} className={category === chip.key ? 'is-on' : undefined} onClick={() => setCategory(chip.key)}>
                {chip.label}
              </button>
            ))}
          </div>
          <div className="doc-legend">
            {['official', 'recommended', 'platform'].map((st) => (
              <StatusBadge key={st} status={st} s={s} />
            ))}
            <p>{s.statusLegendNote}</p>
          </div>
        </div>
        {found.length === 0 && <p className="doc-empty">{category === 'favorites' && !query ? s.noFavorites : s.nothingFound}</p>}
        {groups.map((g) => (
          <div key={g.category.key} className="doc-group">
            <h2 className="doc-group-title">
              <span>{g.category.letter}</span>
              {g.category.title[lang]}
            </h2>
            <ul className="doc-cards">{g.items.map(card)}</ul>
          </div>
        ))}
      </section>
      {details && <DetailsDialog template={details} s={s} lang={lang} onCreate={onCreate} onClose={() => setDetails(null)} />}
    </>
  )
}

function MyDocuments({ s, lang }) {
  const m = s.mine
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { items, loading, error, remove, setStatus } = useMyDocuments()
  const [filter, setFilter] = useState('all')
  const visible = items.filter((i) => (filter === 'all' ? i.status !== 'archive' : i.status === filter))
  const fmt = (d) => new Date(d).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { dateStyle: 'short', timeStyle: 'short' })
  const open = (item) => navigate(item.kind === 'report' ? `/account/smart-report/${item.id}` : `/account/documents/${item.id}`)

  const copy = async (item) => {
    try {
      const source = await loadDocument(item.id)
      const row = await duplicateDocument(user.id, source, templateById(source.template_id), m.copySuffix)
      showToast(m.copied, { type: 'success' })
      navigate(`/account/documents/${row.id}`)
    } catch {
      showToast(m.copyFailed, { type: 'error' })
    }
  }
  const del = async (item) => {
    if (!window.confirm(m.confirmDelete(item.title || m.untitled))) return
    const ok = await remove(item)
    showToast(ok ? m.deleted : m.deleteFailed, { type: ok ? 'success' : 'error' })
  }

  return (
    <section className="doc-mine">
      <div className="doc-chips" role="tablist">
        {['all', ...DOC_STATUSES].map((st) => {
          const n = st === 'all' ? items.filter((i) => i.status !== 'archive').length : items.filter((i) => i.status === st).length
          return (
            <button key={st} type="button" role="tab" aria-selected={filter === st} className={filter === st ? 'is-on' : undefined} onClick={() => setFilter(st)}>
              {st === 'all' ? s.all : s.docStatus[st]} <small>{n}</small>
            </button>
          )
        })}
      </div>
      {loading && (
        <p className="doc-empty">
          <Loader2 size={18} className="doc-spin" aria-hidden="true" />
        </p>
      )}
      {error && <p className="doc-error">{m.loadFailed}</p>}
      {!loading && visible.length === 0 && <p className="doc-empty">{m.empty}</p>}
      <ul className="doc-mine-list">
        {visible.map((item) => {
          const template = templateById(item.template_id)
          return (
            <li key={`${item.kind}-${item.id}`} className="doc-mine-item">
              <button type="button" className="doc-mine-main" onClick={() => open(item)}>
                <span className="doc-mine-title">{item.title || m.untitled}</span>
                <span className="doc-mine-type">
                  {template?.title[lang] ?? item.template_id}
                  {item.kind === 'report' && <span className="doc-smart-badge">{s.smartBadge}</span>}
                </span>
              </button>
              <span className={`doc-status doc-status--${item.status}`}>{s.docStatus[item.status]}</span>
              <dl className="doc-mine-facts">
                <div>
                  <dt>{m.created}</dt>
                  <dd>{fmt(item.created_at)}</dd>
                </div>
                <div>
                  <dt>{m.updated}</dt>
                  <dd>{fmt(item.updated_at)}</dd>
                </div>
                {item.issue_count !== null && (
                  <div>
                    <dt>{m.remarks}</dt>
                    <dd>{item.checked_at || item.issue_count ? item.issue_count : '—'}</dd>
                  </div>
                )}
                <div>
                  <dt>{m.version}</dt>
                  <dd>{item.current_version || '—'}</dd>
                </div>
              </dl>
              <div className="doc-mine-actions">
                <button type="button" className="doc-btn doc-btn--small" onClick={() => open(item)}>
                  {m.open}
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
          )
        })}
      </ul>
    </section>
  )
}

export default function DocumentBuilderPage() {
  const { lang: uiLang } = useLanguage()
  const lang = uiLang === 'kk' ? 'kk' : 'ru'
  const s = docStrings(lang)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'mine' ? 'mine' : 'catalog'


  const create = (template) => navigate(template.engine === 'smart' ? '/account/smart-report/new' : `/account/documents/new/${template.id}`)

  return (
    <div className="doc-page">
      <header className="doc-hero">
        <span className="doc-hero-icon" aria-hidden="true">
          <FileStack size={30} strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="doc-hero-title">{s.title}</h1>
          <p className="doc-hero-lead">{s.lead}</p>
        </div>
      </header>
      <nav className="doc-tabs" role="tablist">
        {['catalog', 'mine'].map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'is-on' : undefined}
            onClick={() => setParams(key === 'mine' ? { tab: 'mine' } : {}, { replace: true })}
          >
            {s.tabs[key]}
          </button>
        ))}
        <Link to="/account/docs" className="doc-tabs-link">
          {lang === 'kk' ? 'Құжат мазмұнын сараптау →' : 'Экспертиза содержания документа →'}
        </Link>
      </nav>
      {tab === 'catalog' ? <Catalog s={s} lang={lang} onCreate={create} /> : <MyDocuments s={s} lang={lang} />}
    </div>
  )
}
