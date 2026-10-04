import '../smartReport/smartReport.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Library, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { supabase } from '../../../supabaseClient'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useToast } from '../../../components/ToastContext.jsx'
import { KB_CATEGORIES, KB_KINDS, KB_PRIORITIES, KB_STATUSES, labelOf } from './kbMeta.js'

// «База знаний МЧС» — admin page of the knowledge base used by «Рапортты
// құрастыру». Admins add sources (normative acts, official resources) and
// entries (terms, definitions, rules, standard wording); every change is
// picked up by the report at its next analysis (the embedding of a new or
// edited entry is computed then). Glossary terms are mirrored from the
// Терминдер table automatically — their names are edited there.

const PAGE = 50
const ENTRY_COLUMNS =
  'id, kind, category, title, kk, ru, en, definition_ru, definition_kk, source_id, clause, status, term_id, is_active, updated_at'

const EMPTY_ENTRY = {
  kind: 'term',
  category: 'terminology',
  title: '',
  kk: '',
  ru: '',
  en: '',
  definition_ru: '',
  definition_kk: '',
  source_id: '',
  clause: '',
  status: 'needs_review',
}
const EMPTY_SOURCE = { code: '', title_ru: '', title_kk: '', doc_number: '', doc_date: '', url: '', priority: 2, status: 'official' }

const blankToNull = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === '' ? null : v]))

function Select({ value, onChange, options, lang, allLabel }) {
  return (
    <select className="report-input report-input--compact" value={value} onChange={(e) => onChange(e.target.value)}>
      {allLabel && <option value="">{allLabel}</option>}
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.label[lang]}
        </option>
      ))}
    </select>
  )
}

function EntryForm({ entry, sources, onSave, onCancel, saving, tk, lang }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_ENTRY, ...Object.fromEntries(Object.entries(entry ?? {}).map(([k, v]) => [k, v ?? ''])) }))
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const fromGlossary = Boolean(entry?.term_id)
  const field = (key, label, { area = false, readOnly = false } = {}) => (
    <label className={`report-fact${area ? ' report-fact--wide' : ''}`}>
      <span className="report-fact-label">{label}</span>
      {area ? (
        <textarea className="report-textarea report-textarea--header" rows={3} value={form[key]} onChange={(e) => set(key)(e.target.value)} />
      ) : (
        <input className="report-input report-input--compact" value={form[key]} onChange={(e) => set(key)(e.target.value)} readOnly={readOnly} />
      )}
    </label>
  )
  return (
    <form
      className="report-group kb-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(form)
      }}
    >
      <div className="report-facts">
        <label className="report-fact">
          <span className="report-fact-label">{tk.kind}</span>
          {fromGlossary ? <input className="report-input report-input--compact" value={labelOf(KB_KINDS, 'term', lang)} readOnly /> : <Select value={form.kind} onChange={set('kind')} options={KB_KINDS} lang={lang} />}
        </label>
        <label className="report-fact">
          <span className="report-fact-label">{tk.category}</span>
          <Select value={form.category} onChange={set('category')} options={KB_CATEGORIES} lang={lang} />
        </label>
        <label className="report-fact">
          <span className="report-fact-label">{tk.status}</span>
          <Select value={form.status} onChange={set('status')} options={KB_STATUSES} lang={lang} />
        </label>
        {field('title', tk.titleField, { readOnly: fromGlossary })}
        {field('ru', 'RU', { readOnly: fromGlossary })}
        {field('kk', 'KZ', { readOnly: fromGlossary })}
        {field('en', 'EN', { readOnly: fromGlossary })}
        {field('definition_ru', tk.definitionRu, { area: true })}
        {field('definition_kk', tk.definitionKk, { area: true })}
        <label className="report-fact">
          <span className="report-fact-label">{tk.source}</span>
          <select className="report-input report-input--compact" value={form.source_id} onChange={(e) => set('source_id')(e.target.value)}>
            <option value="">{tk.noSource}</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title_ru}
                {s.doc_number ? ` (${s.doc_number})` : ''}
              </option>
            ))}
          </select>
        </label>
        {field('clause', tk.clause)}
      </div>
      {fromGlossary && <p className="report-muted kb-form-note">{tk.glossaryNote}</p>}
      <p className="report-muted kb-form-note">{tk.clauseNote}</p>
      <div className="report-actions kb-form-actions">
        <button type="submit" className="report-btn report-btn--primary" disabled={saving || !form.title.trim()}>
          {tk.save}
        </button>
        <button type="button" className="report-btn" onClick={onCancel}>
          {tk.cancel}
        </button>
      </div>
    </form>
  )
}

function SourceForm({ source, onSave, onCancel, saving, tk, lang }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_SOURCE, ...Object.fromEntries(Object.entries(source ?? {}).map(([k, v]) => [k, v ?? ''])) }))
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))
  const input = (key, label, type = 'text') => (
    <label className="report-fact">
      <span className="report-fact-label">{label}</span>
      <input className="report-input report-input--compact" type={type} value={form[key]} onChange={(e) => set(key)(e.target.value)} />
    </label>
  )
  return (
    <form
      className="report-group kb-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ ...form, priority: Number(form.priority) })
      }}
    >
      <div className="report-facts">
        {input('title_ru', tk.sourceTitleRu)}
        {input('title_kk', tk.sourceTitleKk)}
        {input('doc_number', tk.docNumber)}
        {input('doc_date', tk.docDate, 'date')}
        {input('url', tk.url)}
        {input('code', tk.code)}
        <label className="report-fact">
          <span className="report-fact-label">{tk.priority}</span>
          <Select value={String(form.priority)} onChange={set('priority')} options={KB_PRIORITIES.map((p) => ({ ...p, key: String(p.key) }))} lang={lang} />
        </label>
        <label className="report-fact">
          <span className="report-fact-label">{tk.status}</span>
          <Select value={form.status} onChange={set('status')} options={KB_STATUSES} lang={lang} />
        </label>
      </div>
      <div className="report-actions kb-form-actions">
        <button type="submit" className="report-btn report-btn--primary" disabled={saving || !form.title_ru.trim()}>
          {tk.save}
        </button>
        <button type="button" className="report-btn" onClick={onCancel}>
          {tk.cancel}
        </button>
      </div>
    </form>
  )
}

function KnowledgeBasePage() {
  const { lang, t } = useLanguage()
  const tk = t.knowledgeBase
  const { profile } = useAuth()
  const { showToast } = useToast()
  const isAdmin = profile?.role === 'admin'

  const [tab, setTab] = useState('entries')
  const [sources, setSources] = useState([])
  const [entries, setEntries] = useState([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState(null)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ kind: '', category: '', status: '' })
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState(null) // entry / source being edited, or 'new'
  const [saving, setSaving] = useState(false)

  const loadSources = useCallback(async () => {
    const { data } = await supabase.from('kb_sources').select('*').order('priority').order('title_ru')
    setSources(data ?? [])
  }, [])

  const loadStats = useCallback(async () => {
    const count = (q) => q.then((r) => r.count ?? 0)
    const base = () => supabase.from('kb_entries').select('id', { count: 'exact', head: true })
    const [all, official, review, embedded] = await Promise.all([
      count(base()),
      count(base().eq('status', 'official')),
      count(base().eq('status', 'needs_review')),
      count(base().not('embedding', 'is', null)),
    ])
    setStats({ all, official, review, embedded })
  }, [])

  const loadEntries = useCallback(async () => {
    let q = supabase.from('kb_entries').select(ENTRY_COLUMNS, { count: 'exact' })
    if (query.trim()) q = q.ilike('search_text', `%${query.trim().toLowerCase()}%`)
    for (const [key, value] of Object.entries(filters)) if (value) q = q.eq(key, value)
    const { data, count } = await q.order('kind').order('title').range(page * PAGE, page * PAGE + PAGE - 1)
    setEntries(data ?? [])
    setTotal(count ?? 0)
  }, [query, filters, page])

  useEffect(() => {
    loadSources()
    loadStats()
  }, [loadSources, loadStats])

  useEffect(() => {
    const timer = setTimeout(loadEntries, 250)
    return () => clearTimeout(timer)
  }, [loadEntries])

  const sourceById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources])

  const saveEntry = async (form) => {
    setSaving(true)
    const row = blankToNull({ ...form })
    delete row.id
    delete row.term_id
    delete row.is_active
    delete row.updated_at
    if (editing?.term_id) for (const k of ['kind', 'title', 'kk', 'ru', 'en']) delete row[k]
    row.is_active = form.status !== 'outdated'
    const { error } = editing === 'new' ? await supabase.from('kb_entries').insert(row) : await supabase.from('kb_entries').update(row).eq('id', editing.id)
    setSaving(false)
    if (error) return showToast(tk.saveFailed, { type: 'error' })
    showToast(tk.saved)
    setEditing(null)
    loadEntries()
    loadStats()
  }

  const saveSource = async (form) => {
    setSaving(true)
    const row = blankToNull({ ...form })
    delete row.id
    delete row.created_at
    delete row.updated_at
    const { error } = editing === 'new' ? await supabase.from('kb_sources').insert(row) : await supabase.from('kb_sources').update(row).eq('id', editing.id)
    setSaving(false)
    if (error) return showToast(tk.saveFailed, { type: 'error' })
    showToast(tk.saved)
    setEditing(null)
    loadSources()
  }

  const removeEntry = async (entry) => {
    if (!window.confirm(tk.confirmDelete(entry.title))) return
    const { error } = await supabase.from('kb_entries').delete().eq('id', entry.id)
    if (error) return showToast(tk.saveFailed, { type: 'error' })
    loadEntries()
    loadStats()
  }

  if (!isAdmin) {
    return (
      <div className="report-page">
        <p className="report-error">{tk.adminOnly}</p>
      </div>
    )
  }

  return (
    <div className="report-page">
      <header className="report-hero">
        <span className="report-hero-icon" aria-hidden="true">
          <Library size={30} strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="report-hero-title">{tk.title}</h1>
          <p className="report-hero-lead">{tk.lead}</p>
        </div>
      </header>

      {stats && (
        <ul className="report-statusbar">
          <li className="report-statusbar-item report-statusbar-item--found">
            <span className="report-statusbar-num">{stats.all}</span>
            <span className="report-statusbar-label">{tk.statAll}</span>
          </li>
          <li className="report-statusbar-item report-statusbar-item--fixed">
            <span className="report-statusbar-num">{stats.official}</span>
            <span className="report-statusbar-label">{tk.statOfficial}</span>
          </li>
          <li className="report-statusbar-item report-statusbar-item--review">
            <span className="report-statusbar-num">{stats.review}</span>
            <span className="report-statusbar-label">{tk.statReview}</span>
          </li>
          <li className="report-statusbar-item report-statusbar-item--found">
            <span className="report-statusbar-num">
              {stats.embedded}/{stats.all}
            </span>
            <span className="report-statusbar-label">{tk.statEmbedded}</span>
          </li>
        </ul>
      )}

      <section className="report-list-card">
        <div className="report-tabs" role="tablist">
          {['entries', 'sources'].map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`report-tab${tab === key ? ' report-tab--active' : ''}`}
              onClick={() => {
                setTab(key)
                setEditing(null)
              }}
            >
              {tk.tabs[key]}
              <span className="report-tab-count">{key === 'entries' ? total : sources.length}</span>
            </button>
          ))}
        </div>

        {tab === 'entries' && (
          <>
            <div className="kb-toolbar">
              <label className="kb-search">
                <Search size={16} aria-hidden="true" />
                <input
                  className="report-input report-input--compact"
                  value={query}
                  placeholder={tk.searchPlaceholder}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setPage(0)
                  }}
                />
              </label>
              <Select value={filters.kind} onChange={(v) => (setFilters((f) => ({ ...f, kind: v })), setPage(0))} options={KB_KINDS} lang={lang} allLabel={tk.allKinds} />
              <Select value={filters.category} onChange={(v) => (setFilters((f) => ({ ...f, category: v })), setPage(0))} options={KB_CATEGORIES} lang={lang} allLabel={tk.allCategories} />
              <Select value={filters.status} onChange={(v) => (setFilters((f) => ({ ...f, status: v })), setPage(0))} options={KB_STATUSES} lang={lang} allLabel={tk.allStatuses} />
              <button type="button" className="report-btn report-btn--primary" onClick={() => setEditing('new')}>
                <Plus size={18} aria-hidden="true" />
                {tk.addEntry}
              </button>
            </div>

            {editing === 'new' && <EntryForm entry={null} sources={sources} onSave={saveEntry} onCancel={() => setEditing(null)} saving={saving} tk={tk} lang={lang} />}

            <ul className="report-list">
              {entries.map((entry) =>
                editing?.id === entry.id ? (
                  <li key={entry.id}>
                    <EntryForm entry={entry} sources={sources} onSave={saveEntry} onCancel={() => setEditing(null)} saving={saving} tk={tk} lang={lang} />
                  </li>
                ) : (
                  <li key={entry.id} className={`report-list-item${entry.is_active ? '' : ' kb-inactive'}`}>
                    <div className="report-list-main">
                      <span className="report-list-title">{entry.title}</span>
                      <span className="report-list-meta">
                        <span className={`report-dot report-dot--${entry.status === 'official' ? 'base' : entry.status === 'outdated' ? 'missing' : 'assumption'}`}>
                          {labelOf(KB_STATUSES, entry.status, lang)}
                        </span>
                        <span>{labelOf(KB_KINDS, entry.kind, lang)}</span>
                        <span>{labelOf(KB_CATEGORIES, entry.category, lang)}</span>
                        {[entry.ru, entry.kk, entry.en].filter(Boolean).length > 0 && <span>{[entry.ru, entry.kk, entry.en].filter(Boolean).join(' · ')}</span>}
                        {entry.source_id && <span>{sourceById.get(entry.source_id)?.title_ru}{entry.clause ? `, ${entry.clause}` : ''}</span>}
                      </span>
                    </div>
                    <button type="button" className="report-icon-btn kb-edit" onClick={() => setEditing(entry)} aria-label={tk.edit} title={tk.edit}>
                      <Pencil size={18} aria-hidden="true" />
                    </button>
                    {!entry.term_id && (
                      <button type="button" className="report-icon-btn" onClick={() => removeEntry(entry)} aria-label={tk.delete} title={tk.delete}>
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    )}
                  </li>
                ),
              )}
            </ul>
            {total > PAGE && (
              <div className="report-actions kb-pager">
                <button type="button" className="report-btn report-btn--small" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  ←
                </button>
                <span className="report-muted">{tk.pageOf(page + 1, Math.ceil(total / PAGE))}</span>
                <button type="button" className="report-btn report-btn--small" disabled={(page + 1) * PAGE >= total} onClick={() => setPage((p) => p + 1)}>
                  →
                </button>
              </div>
            )}
          </>
        )}

        {tab === 'sources' && (
          <>
            <div className="kb-toolbar">
              <p className="report-muted">{tk.sourcesLead}</p>
              <button type="button" className="report-btn report-btn--primary" onClick={() => setEditing('new')}>
                <Plus size={18} aria-hidden="true" />
                {tk.addSource}
              </button>
            </div>
            {editing === 'new' && <SourceForm source={null} onSave={saveSource} onCancel={() => setEditing(null)} saving={saving} tk={tk} lang={lang} />}
            <ul className="report-list">
              {sources.map((source) =>
                editing?.id === source.id ? (
                  <li key={source.id}>
                    <SourceForm source={source} onSave={saveSource} onCancel={() => setEditing(null)} saving={saving} tk={tk} lang={lang} />
                  </li>
                ) : (
                  <li key={source.id} className="report-list-item">
                    <div className="report-list-main">
                      <span className="report-list-title">{source.title_ru}</span>
                      <span className="report-list-meta">
                        <span className={`report-dot report-dot--${source.status === 'official' ? 'base' : source.status === 'outdated' ? 'missing' : 'assumption'}`}>
                          {labelOf(KB_STATUSES, source.status, lang)}
                        </span>
                        <span>{labelOf(KB_PRIORITIES, source.priority, lang)}</span>
                        {source.doc_number && <span>{source.doc_number}</span>}
                        {source.doc_date && <span>{new Date(source.doc_date).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU')}</span>}
                        {source.url && (
                          <a href={source.url} target="_blank" rel="noreferrer">
                            {tk.link}
                          </a>
                        )}
                      </span>
                    </div>
                    <button type="button" className="report-icon-btn kb-edit" onClick={() => setEditing(source)} aria-label={tk.edit} title={tk.edit}>
                      <Pencil size={18} aria-hidden="true" />
                    </button>
                  </li>
                ),
              )}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}

export default KnowledgeBasePage
