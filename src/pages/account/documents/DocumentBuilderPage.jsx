import './documents.css'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  ChevronUp,
  FilePenLine,
  FileSearch,
  HelpCircle,
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
  CATALOG,
  CATEGORIES,
  FREE_TEXT_ID,
  KINDS,
  TEMPLATES,
  filterCatalog,
  kindOfTemplate,
  requiredFields,
  templateById,
  templateLanguages,
} from './catalog/index.js'
import { documentPath, useWorkspaceActivity } from '../../workspace/documentModel.js'
import { suggestDocumentType, useFavoriteTemplates } from './useDocuments.js'
import { docStrings, errorText } from './strings.js'
import { Modal } from './Dialogs.jsx'

// «Создание документа» and «Каталог профессиональных форм» of «Центр работы
// со служебными документами». Both open with «Умный рабочий рапорт», the
// main tool. The catalog shows the main forms only (CATALOG_IDS in
// catalog/templates.js); every type is a working template of the platform
// unless a confirmed source says otherwise. Creating a type asks how to
// fill it (form / own words) and opens the universal editor; «Рапорт» opens
// the existing «Умный рабочий рапорт». Nothing is created before the user
// has chosen the type and the way to fill it.

function StatusBadge({ status, s }) {
  return <span className={`doc-tpl-status doc-tpl-status--${status}`}>{s.templateStatus[status]}</span>
}

const categoryOf = (template) => CATEGORIES.find((x) => template.categories.includes(x.key)) ?? null
const kindTitle = (template, s, lang) => KINDS.find((k) => k.key === kindOfTemplate(template))?.title[lang] ?? s.catalog.otherKind
const langsOf = (template, s) => templateLanguages(template).map((l) => s.catalog.languages[l]).join(', ')
const fmtDate = (iso, lang) => (iso ? new Date(iso).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU') : null)

/**
 * One form of the catalog: category, name, purpose, languages and the status
 * of the form, «Создать» and — on demand — its structure.
 */
function TemplateCard({ template, s, lang, favorite, onFavorite, onCreate }) {
  const [open, setOpen] = useState(false)
  const category = categoryOf(template)
  return (
    <li className="doc-card">
      <div className="doc-card-top">
        {category && (
          <span className="doc-card-cat">
            {category.letter}. {category.title[lang]}
          </span>
        )}
        <button
          type="button"
          className={`doc-star${favorite ? ' is-on' : ''}`}
          onClick={() => onFavorite(template.id)}
          aria-pressed={favorite}
          aria-label={favorite ? s.favoriteRemove : s.favoriteAdd}
          title={favorite ? s.favoriteRemove : s.favoriteAdd}
        >
          <Star size={16} aria-hidden="true" />
        </button>
      </div>
      <h3 className="doc-card-title">{template.title[lang]}</h3>
      <p className="doc-card-purpose">{template.purpose[lang]}</p>
      <p className="doc-card-meta">
        {langsOf(template, s)} · <span className={`doc-card-status doc-card-status--${template.status}`}>{s.templateStatus[template.status]}</span>
      </p>
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
          {s.create}
        </button>
        <button type="button" className="doc-link-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? s.hideStructure : s.structure}
          {open ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
        </button>
      </div>
    </li>
  )
}

/** «Умный рабочий рапорт» — the main tool of the section, first on both screens. */
function SmartReportCard({ onCreate }) {
  const { t } = useLanguage()
  const sc = t.workspace.createPage.smart
  return (
    <section className="doc-smart" aria-labelledby="doc-smart-title">
      <div className="doc-smart-body">
        <p className="doc-smart-kicker">{sc.kicker}</p>
        <h2 className="doc-smart-title" id="doc-smart-title">
          {sc.title}
        </h2>
        <p className="doc-smart-text">{sc.text}</p>
        <ol className="doc-smart-steps">
          {sc.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <div className="doc-smart-side">
        <button type="button" className="doc-btn doc-btn--primary doc-btn--large" onClick={() => onCreate(templateById('report'))}>
          <Wand2 size={18} aria-hidden="true" />
          {sc.cta}
        </button>
        <p className="doc-smart-note">{sc.note}</p>
      </div>
    </section>
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
  CATALOG.map((t) => ({
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

/** The compact catalog: search, a few categories, simple cards. */
function Catalog({ s, lang, onCreate }) {
  const c = s.catalog
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const { favorites, toggle } = useFavoriteTemplates()
  // The smart report has its own card above the catalog.
  const forms = (cat) => filterCatalog({ query, category: cat, uiLang: lang }).filter((t) => t.id !== 'report')
  const found = useMemo(() => forms(category), [query, category, lang]) // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => Object.fromEntries(['all', ...CATEGORIES.map((x) => x.key)].map((k) => [k, forms(k).length])), [query, lang]) // eslint-disable-line react-hooks/exhaustive-deps
  const grouped = category === 'all' && !query.trim()
  const groups = grouped
    ? CATEGORIES.map((cat) => ({ category: cat, items: found.filter((t) => t.categories.includes(cat.key)) })).filter((g) => g.items.length)
    : [{ category: null, items: found }]
  return (
    <section className="doc-catalog" aria-label={c.title}>
      <div className="doc-catalog-tools">
        <label className="doc-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={c.searchPlaceholder} aria-label={c.searchPlaceholder} />
        </label>
        <div className="doc-chips" role="tablist" aria-label={c.category}>
          {[{ key: 'all', title: { [lang]: c.anyCategory } }, ...CATEGORIES].map((cat) => (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={category === cat.key}
              className={category === cat.key ? 'is-on' : undefined}
              onClick={() => setCategory(cat.key)}
            >
              {cat.letter ? `${cat.letter}. ` : ''}
              {cat.title[lang]}
              <small>{counts[cat.key]}</small>
            </button>
          ))}
        </div>
      </div>
      {found.length === 0 && <p className="doc-empty">{s.nothingFound}</p>}
      {groups.map((g) => (
        <div key={g.category?.key ?? 'all'} className="doc-group">
          {g.category && (
            <h2 className="doc-group-title">
              <span>{g.category.letter}</span>
              {g.category.title[lang]}
            </h2>
          )}
          <ul className="doc-cards">
            {g.items.map((t) => (
              <TemplateCard key={t.id} template={t} s={s} lang={lang} favorite={favorites.has(t.id)} onFavorite={toggle} onCreate={onCreate} />
            ))}
          </ul>
        </div>
      ))}
      <p className="doc-legend-note">{s.statusLegendNote}</p>
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

/** «Каталог профессиональных форм». */
export function CatalogView() {
  const lang = useDocLang()
  const s = docStrings(lang)
  const flow = useCreateFlow(lang)
  return (
    <div className="doc-page">
      <SmartReportCard onCreate={flow.create} />
      <Catalog s={s} lang={lang} onCreate={flow.create} />
      {flow.dialogs}
    </div>
  )
}

/** The user's latest documents (from «Мои документы»), so work can be picked up again. */
function RecentDocuments({ lang }) {
  const { t } = useLanguage()
  const w = t.workspace
  const cp = w.createPage
  const statusLabels = docStrings(lang).docStatus
  const { signedIn, documents, documentsLoading } = useWorkspaceActivity({ historyLimit: 1 })
  if (!signedIn) return null
  const recent = documents.filter((d) => d.status !== 'archive').slice(0, 5)
  const typeOf = (item) => (item.kind === 'report' ? w.activity.report : templateById(item.template_id)?.title[lang] ?? item.template_id)
  return (
    <section className="doc-recent" aria-labelledby="doc-recent-title">
      <div className="doc-recent-head">
        <h2 className="doc-self-title" id="doc-recent-title">
          {cp.recentTitle}
        </h2>
        <Link to="/account/workspace/documents" className="doc-link-btn">
          {cp.recentAll} →
        </Link>
      </div>
      {documentsLoading ? (
        <p className="doc-empty">{w.activity.loading}</p>
      ) : recent.length === 0 ? (
        <p className="doc-empty">{cp.recentNone}</p>
      ) : (
        <ul className="doc-recent-list">
          {recent.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <Link to={documentPath(item)} className="doc-recent-row">
                <span className="doc-recent-title">{item.title || typeOf(item)}</span>
                <span className="doc-recent-meta">
                  {typeOf(item)} · {fmtDate(item.updated_at, lang)}
                </span>
                <span className={`doc-status doc-status--${item.status}`}>{statusLabels[item.status] ?? item.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** «Создание документа»: the smart report first, then the other ways, then recent work. */
export function CreateView() {
  const lang = useDocLang()
  const s = docStrings(lang)
  const { t } = useLanguage()
  const cp = t.workspace.createPage
  const flow = useCreateFlow(lang)
  const { favorites } = useFavoriteTemplates()
  const favoriteTemplates = TEMPLATES.filter((tpl) => favorites.has(tpl.id))
  const quick = [
    { key: 'free', onClick: () => flow.create(templateById(FREE_TEXT_ID)), Icon: FilePenLine },
    { key: 'check', to: '/account/workspace/check', Icon: FileSearch },
    { key: 'catalog', to: '/account/workspace/catalog', Icon: Library },
  ]
  return (
    <div className="doc-page">
      <SmartReportCard onCreate={flow.create} />
      <section className="doc-self" aria-labelledby="doc-other-title">
        <h2 className="doc-self-title" id="doc-other-title">
          {cp.otherTitle}
        </h2>
        <div className="doc-self-options">
          {quick.map(({ key, to, onClick, Icon }) => {
            const text = cp.quick[key].text
            const body = (
              <>
                <Icon size={22} aria-hidden="true" />
                <span className="doc-method-title">{cp.quick[key].title}</span>
                <span className="doc-method-text">{typeof text === 'function' ? text(CATALOG.length) : text}</span>
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
              <Star size={16} aria-hidden="true" /> {cp.favorites}
            </h3>
            <ul className="doc-self-favorites">
              {favoriteTemplates.map((tpl) => (
                <li key={tpl.id}>
                  <button type="button" className="doc-btn" onClick={() => flow.create(tpl)}>
                    {tpl.title[lang]}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      <Finder s={s} lang={lang} onCreate={flow.create} onDetails={flow.showDetails} />
      <RecentDocuments lang={lang} />
      {flow.dialogs}
    </div>
  )
}
