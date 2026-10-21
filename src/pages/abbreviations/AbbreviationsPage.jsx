import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowLeftRight, BadgeCheck, Check, CircleHelp, Copy, Database, ExternalLink, Search, X } from 'lucide-react'
import SiteSectionLayout from '../../components/SiteSectionLayout.jsx'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { categoryLucideIcon } from '../../constants/categoryIcons.js'
import { ALPHABETS, CATEGORIES, STATUSES, compareAbbr, firstLetter, matches, useAbbreviations } from './model.js'
import { S } from './strings.js'
import './abbreviations.css'

const STATUS_ICONS = { confirmed: BadgeCheck, base: Database, needs_review: CircleHelp }

function StatusBadge({ status, ui, long = false }) {
  const Icon = STATUS_ICONS[status]
  return (
    <span className={`abbr-status abbr-status--${status}`}>
      <Icon size={14} aria-hidden="true" />
      {(long ? S.statuses : S.statusShort)[status][ui]}
    </span>
  )
}

function CopyButton({ text, label, ui }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      setTimeout(() => setDone(false), 1500)
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }
  return (
    <button type="button" className="abbr-btn" onClick={copy}>
      {done ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      {done ? S.card.copied[ui] : label}
    </button>
  )
}

function SourceLink({ url, title }) {
  if (!url) return <span>{title}</span>
  return (
    <a href={url} target="_blank" rel="noreferrer" className="abbr-link">
      {title} <ExternalLink size={13} aria-hidden="true" />
    </a>
  )
}

/** The full card of one meaning: everything the catalog knows, nothing invented. */
function AbbrCard({ row, rows, ui, onOpen, onClose }) {
  const others = rows.filter((r) => r.lang === row.lang && r.abbr === row.abbr && r.id !== row.id)
  const equivalents = row.concept ? rows.filter((r) => r.concept === row.concept && r.lang !== row.lang) : []
  const c = S.card
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const CatIcon = categoryLucideIcon(row.category)
  return (
    <div className="abbr-modal-backdrop" onClick={onClose}>
      <section className="abbr-modal" role="dialog" aria-modal="true" aria-labelledby="abbr-card-title" onClick={(e) => e.stopPropagation()}>
        <header className="abbr-modal-head">
          <div>
            <p className="abbr-modal-lang">{S.tabNote[row.lang][ui]}</p>
            <h2 className="abbr-modal-abbr" id="abbr-card-title" lang={row.lang}>
              {row.abbr}
            </h2>
            <p className="abbr-modal-full" lang={row.lang}>
              {row.full_form}
            </p>
          </div>
          <button type="button" className="abbr-icon-btn" onClick={onClose} aria-label={c.close[ui]}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="abbr-modal-actions">
          <CopyButton text={row.abbr} label={c.copyAbbr[ui]} ui={ui} />
          <CopyButton text={`${row.abbr} — ${row.full_form}`} label={c.copyFull[ui]} ui={ui} />
        </div>

        <div className={`abbr-modal-status abbr-modal-status--${row.status}`}>
          <StatusBadge status={row.status} ui={ui} long />
          <p>{S.statusHelp[row.status][ui]}</p>
        </div>

        <dl className="abbr-fields">
          <dt>{c.equivalent[row.lang][ui]}</dt>
          <dd>
            {equivalents.length ? (
              equivalents.map((eq) => (
                <button key={eq.id} type="button" className="abbr-equivalent" onClick={() => onOpen(eq)}>
                  <ArrowLeftRight size={15} aria-hidden="true" />
                  <strong lang={eq.lang}>{eq.abbr}</strong> — <span lang={eq.lang}>{eq.full_form}</span>
                </button>
              ))
            ) : row.equivalent_full ? (
              <>
                {row.equivalent_full}
                <span className="abbr-muted"> · {c.noEquivalent[ui]}</span>
              </>
            ) : (
              <span className="abbr-muted">{c.notConfirmed[ui]}</span>
            )}
          </dd>
          <dt>{c.english[ui]}</dt>
          <dd>{row.equivalent_en || <span className="abbr-muted">{c.notConfirmed[ui]}</span>}</dd>
          <dt>{c.category[ui]}</dt>
          <dd className="abbr-field-cat">
            <CatIcon size={16} aria-hidden="true" /> {S.categories[row.category]?.[ui] ?? row.category}
          </dd>
          {row.explanation && (
            <>
              <dt>{c.explanation[ui]}</dt>
              <dd>{row.explanation}</dd>
            </>
          )}
          {row.example && (
            <>
              <dt>{c.example[ui]}</dt>
              <dd className="abbr-example">{row.example}</dd>
            </>
          )}
          {(others.length > 0 || row.ambiguity_note) && (
            <>
              <dt>{c.other[ui]}</dt>
              <dd>
                {row.ambiguity_note && <p className="abbr-note">{row.ambiguity_note}</p>}
                {others.map((o) => (
                  <button key={o.id} type="button" className="abbr-other" onClick={() => onOpen(o)}>
                    {o.full_form}
                  </button>
                ))}
              </dd>
            </>
          )}
          <dt>{c.source[ui]}</dt>
          <dd>
            <SourceLink url={row.source_url} title={row.source_title} />
          </dd>
          <dt>{c.official[ui]}</dt>
          <dd>{row.official_url ? <SourceLink url={row.official_url} title={row.official_title || row.official_url} /> : <span className="abbr-muted">{c.noOfficial[ui]}</span>}</dd>
          <dt>{c.checked[ui]}</dt>
          <dd>{row.checked_at ? new Date(row.checked_at).toLocaleDateString(ui === 'kk' ? 'kk-KZ' : 'ru-RU') : '—'}</dd>
        </dl>
      </section>
    </div>
  )
}

export default function AbbreviationsPage() {
  const { lang } = useLanguage()
  const ui = lang === 'kk' ? 'kk' : 'ru'
  const { loading, rows, origin } = useAbbreviations()
  const [params, setParams] = useSearchParams()
  // Filters live in the address: a reload or a shared link shows the same view.
  const tab = params.get('lang') === 'ru' || params.get('lang') === 'kk' ? params.get('lang') : ui
  const query = params.get('q') ?? ''
  const letter = params.get('letter') ?? ''
  const category = params.get('category') ?? ''
  const status = params.get('status') ?? ''
  const withEquivalent = params.get('eq') === '1'
  const openId = params.get('id')

  const set = (patch) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v === null || v === false) next.delete(k)
      else next.set(k, v === true ? '1' : v)
    }
    setParams(next, { replace: true })
  }

  const inTab = useMemo(() => rows.filter((r) => r.lang === tab).sort(compareAbbr), [rows, tab])
  const concepts = useMemo(() => {
    const byConcept = new Map()
    for (const r of rows) if (r.concept) byConcept.set(r.concept, new Set([...(byConcept.get(r.concept) ?? []), r.lang]))
    return byConcept
  }, [rows])
  const shown = inTab.filter(
    (r) =>
      (!letter || firstLetter(r.abbr) === letter) &&
      (!category || r.category === category) &&
      (!status || r.status === status) &&
      (!withEquivalent || (r.concept && concepts.get(r.concept)?.size > 1)) &&
      matches(r, query),
  )
  const letters = new Set(inTab.map((r) => firstLetter(r.abbr)))
  const meaningsOf = (r) => inTab.filter((x) => x.abbr === r.abbr).length
  const open = rows.find((r) => String(r.id) === openId) ?? null

  return (
    <SiteSectionLayout activeSection="abbreviations">
      <section className="abbr-section" id="abbreviations">
        <div className="section-kicker" aria-hidden="true"></div>
        <h1 className="section-title">{S.title[ui]}</h1>
        <p className="section-lead">{S.lead[ui]}</p>

        <div className="abbr-tabs" role="tablist" aria-label={S.tabsAria[ui]}>
          {['kk', 'ru'].map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={tab === l}
              className={`abbr-tab${tab === l ? ' is-on' : ''}`}
              onClick={() => set({ lang: l, letter: '', q: '' })}
            >
              <span className="abbr-tab-name">{S.tabs[l][ui]}</span>
              <span className="abbr-tab-note">{S.tabNote[l][ui]}</span>
            </button>
          ))}
        </div>

        <div className="abbr-panel">
          <label className="abbr-search">
            <Search size={18} aria-hidden="true" />
            <input type="search" value={query} onChange={(e) => set({ q: e.target.value })} placeholder={S.search[ui]} aria-label={S.search[ui]} lang={tab} />
            {query && (
              <button type="button" className="abbr-icon-btn" onClick={() => set({ q: '' })} aria-label={S.clear[ui]}>
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </label>

          <nav className="abbr-alphabet" aria-label={S.alphabet[ui]}>
            <button type="button" className={!letter ? 'is-on' : undefined} onClick={() => set({ letter: '' })}>
              {S.allLetters[ui]}
            </button>
            {ALPHABETS[tab].map((l) => (
              <button key={l} type="button" className={letter === l ? 'is-on' : undefined} disabled={!letters.has(l)} onClick={() => set({ letter: letter === l ? '' : l })}>
                {l}
              </button>
            ))}
          </nav>

          <div className="abbr-filters">
            <label>
              <span>{S.category[ui]}</span>
              <select value={category} onChange={(e) => set({ category: e.target.value })}>
                <option value="">{S.allCategories[ui]}</option>
                {CATEGORIES.filter((k) => inTab.some((r) => r.category === k)).map((k) => (
                  <option key={k} value={k}>
                    {S.categories[k][ui]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{S.status[ui]}</span>
              <select value={status} onChange={(e) => set({ status: e.target.value })}>
                <option value="">{S.allStatuses[ui]}</option>
                {STATUSES.map((k) => (
                  <option key={k} value={k}>
                    {S.statusShort[k][ui]}
                  </option>
                ))}
              </select>
            </label>
            <label className="abbr-check">
              <input type="checkbox" checked={withEquivalent} onChange={(e) => set({ eq: e.target.checked })} />
              <span>{S.withEquivalent[ui]}</span>
            </label>
            <p className="abbr-count" role="status">
              {loading ? S.loading[ui] : S.found(shown.length)[ui]}
            </p>
          </div>
          {origin === 'bundled' && <p className="abbr-origin">{S.bundledNote[ui]}</p>}
        </div>

        {!loading && shown.length === 0 ? (
          <div className="abbr-empty">
            <p>{S.nothing[ui]}</p>
            <p className="abbr-muted">{S.nothingHint[ui]}</p>
            <button type="button" className="abbr-btn" onClick={() => setParams(new URLSearchParams({ lang: tab }), { replace: true })}>
              {S.reset[ui]}
            </button>
          </div>
        ) : (
          <ul className="abbr-list">
            {shown.map((r) => {
              const CatIcon = categoryLucideIcon(r.category)
              const n = meaningsOf(r)
              return (
                <li key={r.id}>
                  <button type="button" className={`abbr-row abbr-row--${r.status}`} onClick={() => set({ id: r.id })}>
                    <span className="abbr-row-abbr" lang={r.lang}>
                      {r.abbr}
                    </span>
                    <span className="abbr-row-main">
                      <span className="abbr-row-full" lang={r.lang}>
                        {r.full_form}
                      </span>
                      <span className="abbr-row-meta">
                        <span className="abbr-cat">
                          <CatIcon size={13} aria-hidden="true" /> {S.categories[r.category]?.[ui]}
                        </span>
                        {n > 1 && <span className="abbr-meanings">{S.meanings(n)[ui]}</span>}
                      </span>
                    </span>
                    <StatusBadge status={r.status} ui={ui} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
      {open && <AbbrCard row={open} rows={rows} ui={ui} onOpen={(r) => set({ id: r.id, lang: r.lang })} onClose={() => set({ id: '' })} />}
    </SiteSectionLayout>
  )
}
