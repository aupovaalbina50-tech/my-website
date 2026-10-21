import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Crosshair, Download, ExternalLink, FileText, Loader2, Printer, RotateCcw } from 'lucide-react'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useToast } from '../../../components/ToastContext.jsx'
import { Modal } from '../../account/documents/Dialogs.jsx'
import { documentToPdf, downloadBlob, fileNameOf } from '../../account/documents/exportDocument.js'
import { docStrings } from '../../account/documents/strings.js'
import { fieldsOf } from '../../account/documents/catalog/index.js'
import { contentHash } from '../documentModel.js'
import { classify } from '../expertise/model.js'
import { diffStats, diffText } from '../versions/diff.js'
import { Diff } from '../versions/VersionsPanel.jsx'
import { basicInfo, changedFields, checkRuns, fieldOrigins, preparationStage, remarkDiff, requisiteChanges, sourcesOfCheck, timeline } from './passportModel.js'
import { loadPassportData } from './passportApi.js'
import { routeOf } from '../route/routeModel.js'
import { passportDocument } from './passportExport.js'
import '../route/route.css'
import './passport.css'

// «Паспорт документа»: what the system knows about the document — basic
// facts, stage, checks, sources, where the data came from, the history of
// actions and the versions. Only stored facts are shown; what is not stored
// says so. The passport is not part of the document and is not an official
// registration or certifying document.

const TABS = ['main', 'checks', 'sources', 'history', 'versions']

const fmt = (iso, lang, withTime = true) => {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return d.toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', withTime ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: '2-digit', year: 'numeric' })
}
// A date the user typed (YYYY-MM-DD) shown as written, without a time zone shift.
const fmtDay = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ''))
  return m ? `${m[3]}.${m[2]}.${m[1]}` : v
}

function Row({ label, value, empty }) {
  return (
    <div className="pp-row">
      <dt>{label}</dt>
      <dd className={value ? undefined : 'is-empty'}>{value || empty}</dd>
    </div>
  )
}

function Section({ title, children, note }) {
  return (
    <section className="pp-section">
      <h3>{title}</h3>
      {note && <p className="pp-note">{note}</p>}
      {children}
    </section>
  )
}

// ---- А, Б ----
function MainTab({ info, stage, route, check, values, template, versions, p, x, lang, onGoTo }) {
  const { t } = useLanguage()
  const r = t.workspace.route
  const s = docStrings(lang)
  const fields = new Map(fieldsOf(template).map((f) => [f.key, f]))
  // What changed after the last check: the checked version against the current text.
  const checkedVersion = check?.version ? versions?.find((v) => v.version === check.version) : null
  const changed = stage.outdated && checkedVersion ? changedFields(template, checkedVersion.values ?? {}, values) : null
  const label = (key) => fields.get(key)?.label[lang] ?? key
  const open = (check?.items ?? []).filter((i) => i.status === 'open')
  const byPriority = ['high', 'medium', 'low', 'info'].map((pr) => [pr, open.filter((i) => classify(i).priority === pr).length])
  return (
    <>
      <div className={`pp-stage pp-stage--${stage.stage}`}>
        <p className="pp-stage-label">{p.stageLabel}</p>
        <p className="pp-stage-value">{p.stages[stage.stage]}</p>
        {stage.outdated && (
          <p className="pp-warn">
            <AlertTriangle size={15} aria-hidden="true" /> {p.outdated}
          </p>
        )}
        <p className="pp-note">{p.stageNote}</p>
      </div>
      <Section title={p.mainTitle}>
        <dl className="pp-dl">
          <Row label={p.f.title} value={info.title} empty={p.notSet} />
          <Row label={p.f.type} value={template.title[lang]} empty={p.notSet} />
          <Row label={p.f.number} value={info.number} empty={info.hasNumberField ? p.notAssigned : p.noNumberField} />
          <Row label={p.f.created} value={fmt(info.createdAt, lang)} empty={p.notSet} />
          <Row label={p.f.updated} value={fmt(info.updatedAt, lang)} empty={p.notSet} />
          <Row label={p.f.documentDate} value={info.documentDate ? fmtDay(info.documentDate) : null} empty={p.notSet} />
          <Row label={info.eventDate ? `${p.f.eventDate} (${label(info.eventDate.key)})` : p.f.eventDate} value={info.eventDate ? fmtDay(info.eventDate.value) : null} empty={p.notSet} />
          <Row label={p.f.author} value={info.author} empty={p.notSet} />
          <Row label={p.f.version} value={info.version ? p.versionN(info.version) : null} empty={p.noVersions} />
          <Row label={p.f.lang} value={info.lang ? p.langs[info.lang] : null} empty={p.notSet} />
          <Row label={p.f.organization} value={info.organization} empty={p.notSet} />
          <Row label={p.f.unit} value={info.unit} empty={p.notSet} />
          <Row label={p.f.status} value={s.docStatus[info.status] ?? info.status} empty={p.notSet} />
        </dl>
      </Section>
      <Section title={r.passportTitle} note={route.stages.find((st) => st.key === 'final')?.at ? r.finalAt(fmt(route.stages.find((st) => st.key === 'final').at, lang), route.stages.find((st) => st.key === 'final').version) : r.noFinal}>
        <ol className="pp-route">
          {route.stages.map((st) => (
            <li key={st.key}>
              <span>{r.stages[st.key].title}</span>
              <span className={`rt-badge rt-badge--${st.status}`}>{r.status[st.status]}</span>
              {st.at && <span className="pp-muted">{fmt(st.at, lang)}</span>}
              {st.count > 0 && <span className="pp-muted">{r.count(st.count)}</span>}
            </li>
          ))}
        </ol>
      </Section>
      <Section title={p.lastCheckTitle}>
        {!check ? (
          <p className="pp-muted">{p.noCheck}</p>
        ) : (
          <>
            <p>
              {p.checkedAt(fmt(check.at, lang))} · {check.version ? p.versionN(check.version) : p.versionUnknown}
            </p>
            <ul className="pp-chips">
              {byPriority.map(([pr, n]) => (
                <li key={pr} className={`exp-prio exp-prio--${pr}`}>
                  {x.qc.priorities[pr]}: {n}
                </li>
              ))}
            </ul>
            {changed && (changed.text.length > 0 || changed.requisites.length > 0) && (
              <p className="pp-warn">
                <AlertTriangle size={15} aria-hidden="true" /> {p.changedSince([...changed.text, ...changed.requisites].map(label).join(', '))}
              </p>
            )}
            {stage.outdated && !checkedVersion && <p className="pp-muted">{p.changedUnknown}</p>}
            {open.length > 0 && (
              <ul className="pp-remarks">
                {open.slice(0, 50).map((i) => (
                  <RemarkLine key={i.id} item={i} check={check} x={x} p={p} lang={lang} onGoTo={onGoTo} />
                ))}
              </ul>
            )}
          </>
        )}
      </Section>
    </>
  )
}

function RemarkLine({ item, check, x, p, onGoTo }) {
  const qc = classify(item)
  return (
    <li className="pp-remark">
      <span className={`exp-prio exp-prio--${qc.priority}`}>{x.qc.priorities[qc.priority]}</span>
      <span className={`exp-chip exp-chip--qc-${qc.category}`}>{x.qc.categories[qc.category]}</span>
      <span className="pp-remark-text">
        {item.fragment ? <>«{item.fragment}»{item.suggestion ? ` → «${item.suggestion}»` : ''}</> : item.title}
      </span>
      <span className="pp-muted">
        {x.confirmation[item.confirmation] ?? ''} · {check.version ? p.versionN(check.version) : p.versionUnknown} · {item.start == null ? p.notLocated : x.status[item.status]}
      </span>
      {item.target && item.status === 'open' && (
        <button type="button" className="exp-link" onClick={() => onGoTo(item)}>
          <Crosshair size={13} aria-hidden="true" /> {x.goTo}
        </button>
      )}
    </li>
  )
}

// ---- В ----
function ChecksTab({ runs, loadError, check, p, x, lang, onGoTo }) {
  return (
    <>
      <Section title={p.runsTitle} note={p.runsNote}>
        {loadError ? (
          <p className="doc-error">{p.loadPartError}</p>
        ) : runs.length === 0 ? (
          <p className="pp-muted">{p.noRuns}</p>
        ) : (
          <ol className="pp-runs">
            {runs.map((r) => (
              <li key={r.id} className={`pp-run pp-run--${r.outcome}`}>
                <p className="pp-run-head">
                  <strong>{fmt(r.at, lang)}</strong> · {p.runType[r.type]} · {r.version ? p.versionN(r.version) : p.versionUnknown}
                  <span className={`pp-badge pp-badge--${r.outcome}`}>{p.outcome[r.outcome]}</span>
                </p>
                {r.outcome !== 'failed' && <p>{p.remarksTotal(r.total ?? 0)}</p>}
                {r.categories ? (
                  <ul className="pp-chips">
                    {Object.entries(r.categories)
                      .filter(([, n]) => n > 0)
                      .map(([c, n]) => (
                        <li key={c} className={`exp-chip exp-chip--qc-${c}`}>
                          {x.qc.categories[c]}: {n}
                        </li>
                      ))}
                  </ul>
                ) : (
                  r.outcome !== 'failed' && <p className="pp-muted">{p.categoriesNotSaved}</p>
                )}
                {r.errors.length > 0 && <p className="pp-warn">{p.runErrors(r.errors.map((e) => `${x.parts[e.part] ?? e.part}: ${x.errorCode(e.code)}`).join('; '))}</p>}
                {r.sources ? <p className="pp-muted">{p.runSources(r.sources.length)}</p> : r.outcome !== 'failed' && <p className="pp-muted">{p.sourcesNotSaved}</p>}
                {r.outdated === true && <p className="pp-warn">{p.runOutdated}</p>}
                {r.outdated === null && r.outcome !== 'failed' && <p className="pp-muted">{p.runOutdatedUnknown}</p>}
              </li>
            ))}
          </ol>
        )}
      </Section>
      {check && (
        <Section title={p.remarksTitle} note={p.remarksNote}>
          <ul className="pp-remarks">
            {(check.items ?? []).map((i) => (
              <RemarkLine key={i.id} item={i} check={check} x={x} p={p} lang={lang} onGoTo={onGoTo} />
            ))}
          </ul>
        </Section>
      )}
    </>
  )
}

// ---- Г, Д ----
function SourceList({ list, render, empty }) {
  if (!list.length) return <p className="pp-muted">{empty}</p>
  return <ul className="pp-sources">{list.map(render)}</ul>
}

function RemarkRefs({ remarks, p, x }) {
  if (!remarks?.length) return null
  return (
    <p className="pp-muted">
      {p.usedFor}: {remarks.map((r) => `${r.fragment ? `«${r.fragment}»` : r.title ?? ''} (${x.qc.categories[r.category]}, ${x.status[r.status]})`).join('; ')}
    </p>
  )
}

function SourcesTab({ check, template, values, issues, p, x, lang }) {
  const src = useMemo(() => sourcesOfCheck(check, template), [check, template])
  const origins = useMemo(() => fieldOrigins({ template, values, issues }), [template, values, issues])
  const r = x.refs
  return (
    <>
      <p className="pp-note">{check ? p.sourcesLead(fmt(check.at, lang)) : p.sourcesNoCheck}</p>
      {check && (
        <>
          <Section title={p.srcCat.normative}>
            <SourceList
              list={src.normative}
              empty={p.srcNone}
              render={(s, i) => (
                <li key={i} className={`pp-source pp-source--${s.actuality}`}>
                  <p>
                    <strong>{s.title ?? p.notInRegistry}</strong>
                    {s.number ? ` · ${s.number}` : ''}
                    {s.date ? ` · ${fmtDay(s.date)}` : ''}
                  </p>
                  <p className="pp-muted">
                    {p.inText}: «{s.fragment}» · {p.clause}: {s.clause ?? p.notSet} · {p.accessed}: {fmt(s.accessed, lang)}
                  </p>
                  <p className={s.actuality === 'confirmed' ? 'pp-ok' : 'pp-warn'}>{r.actuality[s.actuality] ?? s.actuality}</p>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.url} <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  )}
                  <RemarkRefs remarks={s.remarks} p={p} x={x} />
                </li>
              )}
            />
          </Section>
          <Section title={p.srcCat.state}>
            <SourceList
              list={src.state}
              empty={p.srcNone}
              render={(s, i) => (
                <li key={i} className="pp-source">
                  <p>
                    <strong>{s.title ?? s.fragment}</strong>
                  </p>
                  {s.officialTerm && <p className="pp-muted">{x.officialTerm}: «{s.officialTerm}»</p>}
                  <p className="pp-muted">
                    {p.accessed}: {fmt(s.accessed, lang)} · {p.foundBySearch}
                  </p>
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.url} <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  )}
                  <RemarkRefs remarks={s.remarks} p={p} x={x} />
                </li>
              )}
            />
          </Section>
          <Section title={p.srcCat.termBase}>
            {src.termBase ? (
              <>
                <p>{p.termBaseUsed(src.termBase.size, src.termBase.termsFound, fmt(src.termBase.accessed, lang))}</p>
                <SourceList
                  list={src.termBase.terms}
                  empty={p.termBaseNoRemarks}
                  render={(t, i) => (
                    <li key={i} className="pp-source">
                      <p>
                        <strong>{(lang === 'kk' ? t.term.kk : t.term.ru) || t.term.ru}</strong> · KZ: {t.term.kk || '—'} · RU: {t.term.ru || '—'}
                      </p>
                      <RemarkRefs remarks={[t.remark]} p={p} x={x} />
                    </li>
                  )}
                />
              </>
            ) : (
              <p className="pp-muted">{p.termBaseNotUsed}</p>
            )}
          </Section>
          <Section title={p.srcCat.internal}>
            <SourceList
              list={src.internal}
              empty={p.srcNone}
              render={(s, i) => (
                <li key={i} className="pp-source">
                  <p>
                    <strong>{p.templateRules(template.title[lang])}</strong>
                  </p>
                  <p className="pp-muted">{p.templateRulesNote}</p>
                  <RemarkRefs remarks={s.remarks} p={p} x={x} />
                </li>
              )}
            />
          </Section>
          <Section title={p.srcCat.other}>
            <SourceList
              list={src.other}
              empty={p.srcNone}
              render={(s, i) => (
                <li key={i} className="pp-source">
                  <p>
                    <strong>{s.title}</strong> · {p.kbNote}
                  </p>
                  {(s.sourceTitle || s.number) && <p className="pp-muted">{[s.sourceTitle, s.number, s.date, s.clause].filter(Boolean).join(', ')}</p>}
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.url} <ExternalLink size={12} aria-hidden="true" />
                    </a>
                  )}
                  <RemarkRefs remarks={s.remarks} p={p} x={x} />
                </li>
              )}
            />
          </Section>
        </>
      )}
      <Section title={p.originTitle} note={p.originNote}>
        {origins.length === 0 ? (
          <p className="pp-muted">{p.originNone}</p>
        ) : (
          <ul className="pp-origins">
            {origins.map((o) => (
              <li key={o.key} className={o.unconfirmed ? 'is-unconfirmed' : undefined}>
                <strong>{o.label[lang]}:</strong> {p.origin[o.kind]}
                {o.kind === 'linked' && o.detail && (
                  <>
                    {' '}
                    — <Link to={`/account/documents/${o.detail.documentId}`}>«{o.detail.title}»</Link>
                  </>
                )}
                {o.kind === 'upload' && o.detail?.fileName ? ` — ${o.detail.fileName}` : ''}
                {o.kind === 'version' && o.detail?.version ? ` — ${p.versionN(o.detail.version)}` : ''}
                {o.detail?.at && o.kind !== 'linked' ? ` · ${fmt(o.detail.at, lang)}` : ''}
                {o.unconfirmed && <span className="pp-warn-inline"> · {p.unconfirmed}</span>}
                {o.corrections.length > 0 && (
                  <span className="pp-muted">
                    {' '}
                    · {p.corrections(o.corrections.map((c) => `«${c.was}» → «${c.now}»${c.confirmation ? ` (${x.confirmation[c.confirmation] ?? c.confirmation})` : ''}`).join('; '))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}

// ---- Е ----
function HistoryTab({ feed, logSince, loadError, p, lang, vkinds }) {
  const s = docStrings(lang)
  const describe = (e) => {
    switch (e.kind) {
      case 'created':
        return e.source === 'document' ? p.ev.createdNoLog : p.ev.created
      case 'version':
        return p.ev.version(e.version, vkinds[e.versionKind] ?? e.versionKind, e.note)
      case 'check':
        return p.ev.check(p.outcome[e.run.outcome], e.run.total ?? 0, e.run.version)
      case 'edited':
        return p.ev.edited(e.details.text?.length ?? 0, e.details.requisites?.length ?? 0)
      case 'check_failed':
        return p.ev.checkFailed
      case 'remark_accepted':
        return p.ev.accepted(e.details.was, e.details.now)
      case 'remark_edited':
        return p.ev.editedRemark(e.details.was, e.details.now)
      case 'remark_rejected':
        return p.ev.rejected(e.details.fragment)
      case 'remark_undone':
        return p.ev.undone
      case 'status_changed':
        return p.ev.status(s.docStatus[e.details.from] ?? e.details.from, s.docStatus[e.details.to] ?? e.details.to)
      case 'exported':
        return p.ev.exported(p.formats[e.details.format] ?? e.details.format)
      case 'version_restored':
        return p.ev.restored(e.details.from)
      case 'values_transferred':
        return p.ev.transferred(e.details.title, e.details.keys?.length ?? 0)
      case 'draft_restored':
        return p.ev.draftRestored
      case 'conflict_resolved':
        return p.ev.conflict(e.details.kept)
      default:
        return e.summary || e.kind
    }
  }
  return (
    <Section title={p.historyTitle} note={logSince ? p.logSince(fmt(logSince, lang)) : p.noLog}>
      {loadError && <p className="doc-error">{p.loadPartError}</p>}
      <ol className="pp-feed">
        {feed.map((e, i) => (
          <li key={i} className={`pp-ev pp-ev--${e.kind}`}>
            <span className="pp-ev-at">{fmt(e.at, lang)}</span>
            <span className="pp-ev-kind">{p.evKind[e.kind] ?? e.kind}</span>
            <span className="pp-ev-text">{describe(e)}</span>
          </li>
        ))}
      </ol>
      {feed.length === 0 && <p className="pp-muted">{p.noEvents}</p>}
      <p className="pp-note">{p.historyNote}</p>
    </Section>
  )
}

// ---- versions ----
function VersionsTab({ versions, runs, template, values, docLang, lang, p, x, vkinds, readOnly, onRestore }) {
  const all = useMemo(() => [{ id: 'current', version: null, kind: 'current', values, created_at: null }, ...(versions ?? [])], [versions, values])
  const [a, setA] = useState(all[1]?.id ?? null)
  const [b, setB] = useState('current')
  const byId = (id) => all.find((v) => v.id === id)
  const name = (v) => (v.id === 'current' ? p.currentText : `${p.versionN(v.version)} · ${vkinds[v.kind] ?? v.kind}`)
  const va = byId(a)
  const vb = byId(b)
  const textOf = (v) => {
    const fields = fieldsOf(template).filter((f) => ['body', 'subject', 'table', 'attachments'].includes(f.role ?? 'body'))
    return fields
      .map((f) => {
        const raw = v.values?.[f.key]
        const t = Array.isArray(raw) ? raw.map((r) => (typeof r === 'object' ? Object.values(r).join(' | ') : r)).join('\n') : (raw ?? '')
        return t ? `${f.label[docLang]}:\n${t}` : ''
      })
      .filter(Boolean)
      .join('\n\n')
  }
  const parts = va && vb ? diffText(textOf(va), textOf(vb)) : null
  const stats = parts ? diffStats(parts) : null
  const reqs = va && vb ? requisiteChanges(template, va.values, vb.values) : []
  // Remarks of the checks of each version (a check stores which version it checked).
  const runOf = (v) => (v?.id === 'current' ? null : runs.find((r) => r.version === v?.version && r.items))
  const ra = runOf(va)
  const rb = runOf(vb)
  const rdiff = ra && rb ? remarkDiff(ra.items, rb.items) : null
  if (!versions) return <p className="pp-muted">{p.loading}</p>
  return (
    <>
      <Section title={p.versionsTitle} note={p.versionsNote}>
        <ul className="pp-versions">
          {(versions ?? []).map((v) => (
            <li key={v.id}>
              <span>
                <strong>{p.versionN(v.version)}</strong> · {vkinds[v.kind] ?? v.kind} · {fmt(v.created_at, lang)}
                {v.note ? ` · ${v.note}` : ''}
              </span>
              {!readOnly && (
                <button type="button" className="doc-btn doc-btn--small" onClick={() => onRestore(v)}>
                  <RotateCcw size={13} aria-hidden="true" /> {p.restore}
                </button>
              )}
            </li>
          ))}
        </ul>
        {!versions.length && <p className="pp-muted">{p.noVersions}</p>}
      </Section>
      {versions.length > 0 && (
        <Section title={p.compareTitle}>
          <div className="pp-compare-pick">
            <label>
              <span>{p.older}</span>
              <select className="doc-input" value={a ?? ''} onChange={(e) => setA(e.target.value)}>
                {all.map((v) => (
                  <option key={v.id} value={v.id}>
                    {name(v)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{p.newer}</span>
              <select className="doc-input" value={b ?? ''} onChange={(e) => setB(e.target.value)}>
                {all.map((v) => (
                  <option key={v.id} value={v.id}>
                    {name(v)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {parts && (
            <>
              <h4 className="pp-sub">{p.textChanges}</h4>
              <p className="pp-muted">{p.diffStats(stats)}</p>
              <div className="pp-diff">
                <Diff parts={parts} />
              </div>
              <h4 className="pp-sub">{p.requisiteChanges}</h4>
              {reqs.length ? (
                <ul className="pp-reqs">
                  {reqs.map((r) => (
                    <li key={r.key}>
                      <strong>{r.label[docLang]}:</strong> <del>{r.was || '—'}</del> → <ins>{r.now || '—'}</ins>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pp-muted">{p.noRequisiteChanges}</p>
              )}
              <h4 className="pp-sub">{p.remarkChanges}</h4>
              {rdiff ? (
                <div className="pp-rdiff">
                  {[
                    ['appeared', rdiff.appeared],
                    ['resolved', rdiff.resolved],
                    ['remained', rdiff.remained],
                  ].map(([k, list]) => (
                    <div key={k}>
                      <p>
                        <strong>{p.rdiff[k](list.length)}</strong>
                      </p>
                      <ul>
                        {list.slice(0, 30).map((i) => (
                          <li key={i.key}>
                            {x.qc.categories[i.category]}: {i.fragment ? `«${i.fragment}»` : i.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="pp-muted">{p.noRemarkDiff}</p>
              )}
            </>
          )}
        </Section>
      )}
    </>
  )
}

export function PassportPanel({ doc, template, values, title, status, check, docLang, readOnly, onClose, onRestore, onGoTo }) {
  const { lang: uiLang, t } = useLanguage()
  const lang = uiLang === 'kk' ? 'kk' : 'ru'
  const p = t.workspace.passport
  const x = t.workspace.expertise
  const vkinds = t.workspace.versions.kinds
  const { profile } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState('main')
  const [data, setData] = useState(null)
  const [exporting, setExporting] = useState(false)
  useEffect(() => {
    let alive = true
    loadPassportData(doc.id).then((d) => alive && setData(d))
    return () => {
      alive = false
    }
  }, [doc.id])

  const hash = contentHash(values)
  const authorName = [profile?.last_name, profile?.first_name].filter(Boolean).join(' ').trim() || null
  const info = basicInfo({ doc: { ...doc, title, status }, template, values, authorName })
  const stage = preparationStage({ status, issues: check, values, contentHash: hash, checkedHash: doc.checked_hash ?? null })
  const route = useMemo(() => routeOf({ template, values, issues: check, contentHash: hash }), [template, values, check, hash])
  const runs = useMemo(() => (data ? checkRuns({ history: data.history.data, events: data.events.data, currentHash: hash }).map((r) => ({ ...r, items: data.history.data.find((h) => h.id === r.id)?.snapshot?.items ?? null })) : []), [data, hash])
  const tl = useMemo(() => (data ? timeline({ doc, versions: data.versions.data, runs, events: data.events.data }) : { feed: [], logSince: null }), [data, doc, runs])

  const exportPdf = async (print = false) => {
    setExporting(true)
    try {
      const pdfDoc = passportDocument({ p, x, r: t.workspace.route, route, lang, info, stage, template, check, runs, feed: tl.feed, sources: sourcesOfCheck(check, template), origins: fieldOrigins({ template, values, issues: check }), vkinds, docStatus: docStrings(lang).docStatus, fmt: (iso) => fmt(iso, lang) })
      const blob = await documentToPdf(pdfDoc, lang)
      if (print) {
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank', 'noopener')
        setTimeout(() => URL.revokeObjectURL(url), 60_000)
      } else downloadBlob(blob, fileNameOf(`${p.fileName} ${title || template.title[docLang]}`, 'pdf'))
    } catch {
      showToast(p.exportFailed, { type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <Modal title={p.title} onClose={onClose} wide>
      <div className="pp">
        <p className="pp-disclaimer">
          <FileText size={15} aria-hidden="true" /> {p.disclaimer}
        </p>
        <div className="pp-top">
          <nav className="pp-tabs" role="tablist">
            {TABS.map((k) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : undefined} onClick={() => setTab(k)}>
                {p.tabs[k]}
              </button>
            ))}
          </nav>
          <div className="pp-export">
            <button type="button" className="doc-btn doc-btn--small" onClick={() => exportPdf(false)} disabled={exporting || !data}>
              {exporting ? <Loader2 size={14} className="doc-spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />} {p.exportPdf}
            </button>
            <button type="button" className="doc-btn doc-btn--small" onClick={() => exportPdf(true)} disabled={exporting || !data}>
              <Printer size={14} aria-hidden="true" /> {p.print}
            </button>
          </div>
        </div>
        {!data && (
          <p className="pp-muted" role="status">
            <Loader2 size={15} className="doc-spin" aria-hidden="true" /> {p.loading}
          </p>
        )}
        {tab === 'main' && <MainTab info={info} stage={stage} route={route} check={check} values={values} template={template} versions={data?.versions.data} p={p} x={x} lang={lang} onGoTo={onGoTo} />}
        {tab === 'checks' && data && <ChecksTab runs={runs} loadError={data.history.error || data.events.error} check={check} p={p} x={x} lang={lang} onGoTo={onGoTo} />}
        {tab === 'sources' && <SourcesTab check={check} template={template} values={values} issues={check} p={p} x={x} lang={lang} />}
        {tab === 'history' && data && <HistoryTab feed={tl.feed} logSince={tl.logSince} loadError={data.versions.error || data.history.error || data.events.error} p={p} lang={lang} vkinds={vkinds} />}
        {tab === 'versions' && data && (
          <VersionsTab versions={data.versions.error ? [] : data.versions.data} runs={runs} template={template} values={values} docLang={docLang} lang={lang} p={p} x={x} vkinds={vkinds} readOnly={readOnly} onRestore={onRestore} />
        )}
        {stage.stage === 'checked' && (
          <p className="pp-ok">
            <CheckCircle2 size={15} aria-hidden="true" /> {p.checkedNote}
          </p>
        )}
      </div>
    </Modal>
  )
}
