import './documents.css'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  FilePenLine,
  FileText,
  HelpCircle,
  Info,
  Library,
  ListChecks,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import {
  CATEGORIES,
  FREE_TEXT_ID,
  KINDS,
  TEMPLATE_STATUSES,
  TEMPLATES,
  filterCatalog,
  kindOfTemplate,
  requiredFields,
  templateById,
  templateLanguages,
} from './catalog/index.js'
import { suggestDocumentType, useFavoriteTemplates } from './useDocuments.js'
import { docStrings, errorText } from './strings.js'
import { Modal } from './Dialogs.jsx'

// «Создание документа» and «Каталог документов и форм» of «Работа со
// служебными документами». The catalog is the client configuration
// (catalog/templates.js); every type is a working template of the platform
// unless a confirmed source says otherwise. Creating a type asks how to
// fill it (form / own words) and opens the universal editor; «Рапорт» opens
// the existing «Умный рабочий рапорт». Nothing is created before the user
// has chosen the type and the way to fill it.

function StatusBadge({ status, s }) {
  return <span className={`doc-tpl-status doc-tpl-status--${status}`}>{s.templateStatus[status]}</span>
}

const kindTitle = (template, s, lang) => KINDS.find((k) => k.key === kindOfTemplate(template))?.title[lang] ?? s.catalog.otherKind
const langsOf = (template, s) => templateLanguages(template).map((l) => s.catalog.languages[l]).join(', ')
const fmtDate = (iso, lang) => (iso ? new Date(iso).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU') : null)

function TemplateCard({ template, s, lang, favorite, onFavorite, onCreate, onDetails }) {
  const [open, setOpen] = useState(false)
  const required = requiredFields(template)
  return (
    <li className="doc-card">
      <div className="doc-card-top">
        <span className="doc-card-cat">
          {template.categories.map((c) => CATEGORIES.find((x) => x.key === c)?.letter).join(' · ')} · {kindTitle(template, s, lang)}
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
        <span className="doc-card-lang">{langsOf(template, s)}</span>
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
          {s.catalog.openCard}
        </button>
      </div>
      {template.engine !== 'smart' && <p className="doc-card-foot">{`${s.sectionsCount(template.sections.length)} · ${s.requiredCount(required.length)}`}</p>}
    </li>
  )
}

/** The card of a form: everything the catalog knows about it, and «не установлено» where it knows nothing. */
function DetailsDialog({ template, s, lang, onCreate, onClose }) {
  const c = s.catalog
  const required = requiredFields(template)
  const source = template.source ?? null
  return (
    <Modal title={template.title[lang]} onClose={onClose} wide>
      <dl className="doc-details">
        <dt>{s.purpose}</dt>
        <dd>{template.purpose[lang]}</dd>
        <dt>{c.kind}</dt>
        <dd>{kindTitle(template, s, lang)}</dd>
        <dt>{c.scope}</dt>
        <dd>{template.categories.map((cat) => CATEGORIES.find((x) => x.key === cat)?.title[lang]).join('; ')}</dd>
        <dt>{c.language}</dt>
        <dd>{langsOf(template, s)}</dd>
        <dt>{c.requisites}</dt>
        <dd>
          {template.engine === 'smart' ? (
            s.smartInfo
          ) : required.length ? (
            <ul className="doc-details-list">
              {required.map((f) => (
                <li key={f.key}>{f.label[lang]}</li>
              ))}
            </ul>
          ) : (
            c.noRequisites
          )}
        </dd>
        <dt>{c.reliability}</dt>
        <dd>
          <StatusBadge status={template.status} s={s} /> {s.templateStatusInfo[template.status]}
        </dd>
        <dt>{s.source}</dt>
        <dd>
          {source ? (
            <>
              {source.title}
              {source.edition ? `, ${source.edition}` : ''}
              {source.url && (
                <>
                  {' '}
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.url}
                  </a>
                </>
              )}
            </>
          ) : (
            s.sourcePlatform
          )}
        </dd>
        <dt>{c.basis}</dt>
        <dd>{source?.basis ?? template.basis ?? c.basisNone}</dd>
        <dt>{c.checkedAt}</dt>
        <dd>{fmtDate(source?.checkedAt, lang) ?? c.notChecked}</dd>
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

const catalogForAi = (lang) =>
  TEMPLATES.map((t) => ({
    id: t.id,
    title: t.title[lang],
    purpose: `${t.purpose[lang]} (${t.categories.map((c) => CATEGORIES.find((x) => x.key === c)?.title[lang]).join('; ')})`,
  }))

/**
 * «Создать документ по описанию задачи»: the AI reads the task by its meaning
 * and suggests types of the catalog only — with what it understood, how sure
 * it is, how the types differ, and questions when the description is not
 * enough. Nothing is created here: «Выбрать этот вид» asks how to fill it.
 */
function Finder({ s, lang, onCreate, onDetails, autoFocus = false }) {
  const f = s.finder
  const [query, setQuery] = useState('')
  const [answers, setAnswers] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const run = async (text) => {
    setBusy(true)
    setError(null)
    try {
      const out = await suggestDocumentType(text, catalogForAi(lang), lang)
      setResult({
        understood: out.understood ?? null,
        clarify: Array.isArray(out.clarify) ? out.clarify : [],
        suggestions: (out.suggestions ?? []).map((sug) => ({ ...sug, template: templateById(sug.id) })).filter((x) => x.template),
      })
    } catch (e) {
      setError(errorText(s, e))
    } finally {
      setBusy(false)
    }
  }
  const submit = (ev) => {
    ev.preventDefault()
    if (query.trim().length < 5) return
    setAnswers('')
    run(query.trim())
  }
  const refine = () => {
    const q = result.clarify.map((x, i) => `${i + 1}. ${x}`).join('\n')
    run(`${query.trim()}\n\n${f.clarifyTitle}:\n${q}\n${f.clarifyPlaceholder}: ${answers.trim()}`)
  }
  const u = result?.understood
  return (
    <section className="doc-finder" id="finder">
      <div className="doc-finder-head">
        <Sparkles size={20} aria-hidden="true" />
        <div>
          <h2>{f.title}</h2>
          <p>{f.lead}</p>
        </div>
      </div>
      <form className="doc-finder-form" onSubmit={submit}>
        <textarea
          className="doc-input doc-finder-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={f.placeholder}
          maxLength={600}
          rows={3}
          autoFocus={autoFocus}
          aria-label={f.title}
        />
        <button type="submit" className="doc-btn doc-btn--accent" disabled={busy || query.trim().length < 5}>
          {busy ? <Loader2 size={16} className="doc-spin" aria-hidden="true" /> : <Wand2 size={16} aria-hidden="true" />}
          {busy ? f.busy : f.submit}
        </button>
      </form>
      {error && (
        <div className="doc-error" role="alert">
          <p>{error}</p>
          <p>{f.failedHint}</p>
        </div>
      )}
      {result && (
        <div className="doc-finder-result">
          {u && (u.goal || u.addressee || u.circumstances || u.result) && (
            <div className="doc-finder-understood">
              <p className="doc-finder-label">{f.understood}</p>
              <dl>
                {[
                  ['goal', u.goal],
                  ['addressee', u.addressee],
                  ['circumstances', u.circumstances],
                  ['outcome', u.result],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt>{f[k]}</dt>
                    <dd className={v ? undefined : 'is-empty'}>{v || f.notClear}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {result.suggestions.length === 0 ? (
            <p className="doc-finder-none">{f.none}</p>
          ) : (
            <>
              <p className="doc-finder-label">{f.result}</p>
              <ul>
                {result.suggestions.map(({ template, why, confidence, difference }) => (
                  <li key={template.id}>
                    <div>
                      <p className="doc-finder-title">
                        <strong>{template.title[lang]}</strong>
                        {confidence && <span className={`doc-conf doc-conf--${confidence}`}>{f.confidence[confidence]}</span>}
                        <StatusBadge status={template.status} s={s} />
                      </p>
                      <p>{why}</p>
                      {difference && (
                        <p className="doc-finder-diff">
                          <strong>{f.difference}:</strong> {difference}
                        </p>
                      )}
                    </div>
                    <div className="doc-finder-actions">
                      <button type="button" className="doc-btn doc-btn--primary doc-btn--small" onClick={() => onCreate(template)}>
                        {f.choose}
                      </button>
                      <button type="button" className="doc-btn doc-btn--small" onClick={() => onDetails(template)}>
                        {s.catalog.openCard}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="doc-finder-note">
                {f.confirmNote} {f.noLegal}
              </p>
            </>
          )}
          {result.clarify.length > 0 && (
            <div className="doc-finder-clarify">
              <p className="doc-finder-label">
                <HelpCircle size={16} aria-hidden="true" /> {f.clarifyTitle}
              </p>
              <ol>
                {result.clarify.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
              <textarea className="doc-input" rows={2} value={answers} onChange={(e) => setAnswers(e.target.value)} placeholder={f.clarifyPlaceholder} maxLength={400} />
              <button type="button" className="doc-btn doc-btn--small" onClick={refine} disabled={busy || !answers.trim()}>
                <RotateCcw size={14} aria-hidden="true" /> {f.refine}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

const DEFAULT_FILTERS = { query: '', category: 'all', kind: 'all', lang: 'all', status: 'all', favoritesOnly: false, sort: 'category' }

function Catalog({ s, lang, onCreate, onDetails }) {
  const c = s.catalog
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const { favorites, toggle } = useFavoriteTemplates()
  const found = useMemo(() => filterCatalog({ ...filters, favorites, uiLang: lang }), [filters, favorites, lang])
  const changed = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)
  // Grouped by category only when sorted by category and nothing is searched.
  const grouped = filters.sort === 'category' && !filters.query.trim()
  const groups = grouped
    ? CATEGORIES.map((cat) => ({ category: cat, items: found.filter((t) => t.categories.includes(cat.key)) })).filter((g) => g.items.length)
    : [{ category: null, items: found }]
  const usedKinds = useMemo(() => new Set(TEMPLATES.map(kindOfTemplate)), [])
  const card = (t) => (
    <TemplateCard key={t.id} template={t} s={s} lang={lang} favorite={favorites.has(t.id)} onFavorite={toggle} onCreate={onCreate} onDetails={onDetails} />
  )
  return (
    <section className="doc-catalog">
      <div className="doc-catalog-tools">
        <label className="doc-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" value={filters.query} onChange={set('query')} placeholder={c.searchPlaceholder} aria-label={c.searchPlaceholder} />
        </label>
        <div className="doc-filter-row">
          <label>
            <span>{c.category}</span>
            <select className="doc-input" value={filters.category} onChange={set('category')}>
              <option value="all">{c.anyCategory}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.letter}. {cat.title[lang]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{c.kind}</span>
            <select className="doc-input" value={filters.kind} onChange={set('kind')}>
              <option value="all">{c.anyKind}</option>
              {KINDS.filter((k) => usedKinds.has(k.key)).map((k) => (
                <option key={k.key} value={k.key}>
                  {k.title[lang]}
                </option>
              ))}
              {usedKinds.has('other') && <option value="other">{c.otherKind}</option>}
            </select>
          </label>
          <label>
            <span>{c.language}</span>
            <select className="doc-input" value={filters.lang} onChange={set('lang')}>
              <option value="all">{c.anyLanguage}</option>
              <option value="kk">{c.languages.kk}</option>
              <option value="ru">{c.languages.ru}</option>
            </select>
          </label>
          <label>
            <span>{c.status}</span>
            <select className="doc-input" value={filters.status} onChange={set('status')}>
              <option value="all">{c.anyStatus}</option>
              {TEMPLATE_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {s.templateStatus[st]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{c.sort}</span>
            <select className="doc-input" value={filters.sort} onChange={set('sort')}>
              {Object.entries(c.sortBy).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="doc-filter-foot">
          <label className="doc-check">
            <input type="checkbox" checked={filters.favoritesOnly} onChange={set('favoritesOnly')} />
            <Star size={15} aria-hidden="true" /> {c.favoritesOnly}
          </label>
          <span className="doc-filter-count" aria-live="polite">
            {c.found(found.length)}
          </span>
          {changed && (
            <button type="button" className="exp-link" onClick={() => setFilters(DEFAULT_FILTERS)}>
              {c.reset}
            </button>
          )}
        </div>
        <div className="doc-legend">
          {TEMPLATE_STATUSES.map((st) => (
            <StatusBadge key={st} status={st} s={s} />
          ))}
          <p>{s.statusLegendNote}</p>
        </div>
      </div>
      {found.length === 0 && <p className="doc-empty">{filters.favoritesOnly && !filters.query ? s.noFavorites : s.nothingFound}</p>}
      {groups.map((g) => (
        <div key={g.category?.key ?? 'all'} className="doc-group">
          {g.category && (
            <h2 className="doc-group-title">
              <span>{g.category.letter}</span>
              {g.category.title[lang]}
            </h2>
          )}
          <ul className="doc-cards">{g.items.map(card)}</ul>
        </div>
      ))}
    </section>
  )
}

/** «Как подготовить документ?»: the structured form, or a text the helper fills the form from. */
function MethodDialog({ template, lang, onPick, onClose }) {
  const { t } = useLanguage()
  const m = t.workspace.method
  return (
    <Modal title={m.title} onClose={onClose}>
      <p className="doc-method-lead">
        <strong>{template.title[lang]}</strong> — {m.lead}
      </p>
      <div className="doc-method-options">
        <button type="button" className="doc-method-option" onClick={() => onPick('form')}>
          <ListChecks size={26} aria-hidden="true" />
          <span className="doc-method-title">{m.form}</span>
          <span className="doc-method-text">{m.formText}</span>
        </button>
        <button type="button" className="doc-method-option" onClick={() => onPick('text')}>
          <FilePenLine size={26} aria-hidden="true" />
          <span className="doc-method-title">{m.text}</span>
          <span className="doc-method-text">{m.textText}</span>
        </button>
      </div>
      <div className="doc-modal-actions">
        <button type="button" className="doc-btn" onClick={onClose}>
          {m.cancel}
        </button>
      </div>
    </Modal>
  )
}

/** Choosing a type → how to fill it → the editor. Shared by «Создание» and «Каталог». */
function useCreateFlow(lang) {
  const navigate = useNavigate()
  const [methodFor, setMethodFor] = useState(null)
  const [details, setDetails] = useState(null)
  const create = (template) => {
    setDetails(null)
    // The smart report has its own flow and free text is just text; other types ask how to start.
    if (template.engine === 'smart') navigate('/account/smart-report/new')
    else if (template.id === FREE_TEXT_ID) navigate(`/account/documents/new/${template.id}`)
    else setMethodFor(template)
  }
  const startWith = (method) => {
    const template = methodFor
    setMethodFor(null)
    navigate(`/account/documents/new/${template.id}${method === 'text' ? '?mode=text' : ''}`)
  }
  const s = docStrings(lang)
  const dialogs = (
    <>
      {details && <DetailsDialog template={details} s={s} lang={lang} onCreate={create} onClose={() => setDetails(null)} />}
      {methodFor && <MethodDialog template={methodFor} lang={lang} onPick={startWith} onClose={() => setMethodFor(null)} />}
    </>
  )
  return { create, showDetails: setDetails, dialogs }
}

function useDocLang() {
  const { lang: uiLang } = useLanguage()
  return uiLang === 'kk' ? 'kk' : 'ru'
}

/** «Каталог документов и официальных форм». */
export function CatalogView() {
  const lang = useDocLang()
  const s = docStrings(lang)
  const flow = useCreateFlow(lang)
  return (
    <div className="doc-page">
      <Catalog s={s} lang={lang} onCreate={flow.create} onDetails={flow.showDetails} />
      {flow.dialogs}
    </div>
  )
}

/** «Создание документа»: by the description of the task, or the type chosen by the user. */
export function CreateView() {
  const lang = useDocLang()
  const s = docStrings(lang)
  const { t } = useLanguage()
  const w = t.workspace.createPage
  const flow = useCreateFlow(lang)
  const { favorites } = useFavoriteTemplates()
  const favoriteTemplates = TEMPLATES.filter((tpl) => favorites.has(tpl.id))
  const quick = [
    { key: 'catalog', to: '/account/workspace/catalog', Icon: Library },
    { key: 'free', onClick: () => flow.create(templateById(FREE_TEXT_ID)), Icon: FileText },
    { key: 'smart', onClick: () => flow.create(templateById('report')), Icon: Wand2 },
  ]
  return (
    <div className="doc-page">
      <Finder s={s} lang={lang} onCreate={flow.create} onDetails={flow.showDetails} autoFocus />
      <section className="doc-self">
        <h2 className="doc-self-title">{w.selfTitle}</h2>
        <p className="doc-self-lead">{w.selfLead}</p>
        <div className="doc-self-options">
          {quick.map(({ key, to, onClick, Icon }) => {
            const body = (
              <>
                <Icon size={24} aria-hidden="true" />
                <span className="doc-method-title">{w.quick[key].title}</span>
                <span className="doc-method-text">{w.quick[key].text}</span>
              </>
            )
            return to ? (
              <Link key={key} to={to} className="doc-method-option">
                {body}
              </Link>
            ) : (
              <button key={key} type="button" className="doc-method-option" onClick={onClick}>
                {body}
              </button>
            )
          })}
        </div>
        {favoriteTemplates.length > 0 && (
          <>
            <h3 className="doc-self-sub">
              <Star size={16} aria-hidden="true" /> {w.favorites}
            </h3>
            <ul className="doc-self-favorites">
              {favoriteTemplates.map((tpl) => (
                <li key={tpl.id}>
                  <button type="button" className="doc-btn" onClick={() => flow.create(tpl)}>
                    <Plus size={15} aria-hidden="true" /> {tpl.title[lang]}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {flow.dialogs}
    </div>
  )
}
