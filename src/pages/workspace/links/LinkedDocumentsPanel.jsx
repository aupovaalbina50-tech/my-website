import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRightLeft, CheckCircle2, ExternalLink, Link2, Loader2, Unlink } from 'lucide-react'
import { useAuth } from '../../../auth/AuthContext.jsx'
import { useLanguage } from '../../../i18n/LanguageContext.jsx'
import { useToast } from '../../../components/ToastContext.jsx'
import { Modal } from '../../account/documents/Dialogs.jsx'
import { templateById } from '../../account/documents/catalog/index.js'
import { docStrings } from '../../account/documents/strings.js'
import { compareDocuments, decisionFor, isOutdated, normalize, provenanceState, transferable } from './consistency.js'
import { createLink, deleteLink, linkCandidates, updateLink } from './linksApi.js'
import './links.css'

// «Связанные документы и контроль согласованности сведений» of one
// document: its links, a card of every linked document, the comparison of
// the shared facts with the user's decision on each discrepancy, the
// transfer of chosen values (with their source), and what became of the
// values transferred earlier. Nothing changes a document by itself: a
// transfer is applied by the editor (onTransfer) after the user confirmed.

const fmt = (iso, lang) => (iso ? new Date(iso).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')
const asDoc = (row) => ({ id: row.id, title: row.title || templateById(row.template_id)?.title.ru || '', template: templateById(row.template_id), values: row.values ?? {}, lang: row.lang ?? 'ru' })

function LastCheck({ other, l, lang }) {
  if (!other.checked_at) return <>{l.notChecked}</>
  const changed = other.content_hash && other.checked_hash && other.content_hash !== other.checked_hash
  return (
    <>
      {l.checked(fmt(other.checked_at, lang), other.issue_count ?? 0)}
      {changed ? ` · ${l.changedAfterCheck}` : ''}
    </>
  )
}

function Where({ fact, l }) {
  return (
    <span className="lnk-where">
      «{fact.fragment}» <span className="lnk-muted">({fact.origin === 'field' ? l.field(fact.label) : l.inText(fact.label)})</span>
    </span>
  )
}

function DiscrepancyItem({ d, link, selfId, other, l, readOnly, onDecide, onApplyHere }) {
  const [mode, setMode] = useState(null) // 'both' | 'intentional'
  const [note, setNote] = useState('')
  const decision = decisionFor(link, d)
  // d.a is this document, d.b the linked one (compareDocuments(self, other)).
  const otherValue = d.b.raw
  const canApplyHere = !readOnly && d.a.origin === 'field' && decision?.status === 'confirmed' && decision.by === other.id && normalize(d.slot, d.a.raw) !== normalize(d.slot, otherValue)
  return (
    <li className={`lnk-diff${decision ? ' is-decided' : ''}`}>
      <p className="lnk-diff-type">
        <AlertTriangle size={15} aria-hidden="true" /> {l.mismatch[d.kind]}
      </p>
      <dl className="lnk-diff-values">
        <div>
          <dt>{l.thisDoc}</dt>
          <dd>
            <Where fact={d.a} l={l} />
          </dd>
        </div>
        <div>
          <dt>
            <Link to={`/account/documents/${other.id}`}>«{other.title}»</Link>
          </dt>
          <dd>
            <Where fact={d.b} l={l} />
          </dd>
        </div>
      </dl>
      {decision ? (
        <div className="lnk-decision">
          <p>
            <CheckCircle2 size={15} aria-hidden="true" />{' '}
            {decision.status === 'confirmed' ? l.decision.confirmed(decision.value) : l.decision[decision.status]}
            {decision.note ? ` — ${decision.note}` : ''}
          </p>
          {!readOnly && (
            <div className="lnk-actions">
              {canApplyHere && (
                <button type="button" className="doc-btn doc-btn--primary doc-btn--small" onClick={() => onApplyHere(d)}>
                  {l.applyHere(otherValue)}
                </button>
              )}
              <button type="button" className="doc-btn doc-btn--small" onClick={() => onDecide(d, null)}>
                {l.undoDecision}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="lnk-muted">{l.notDecided}</p>
          {!readOnly && mode == null && (
            <div className="lnk-actions">
              <button type="button" className="doc-btn doc-btn--small" onClick={() => onDecide(d, { status: 'confirmed', value: d.a.raw, by: selfId })}>
                {l.confirmThis}
              </button>
              <button type="button" className="doc-btn doc-btn--small" onClick={() => onDecide(d, { status: 'confirmed', value: otherValue, by: other.id })}>
                {l.confirmOther(other.title)}
              </button>
              <button type="button" className="doc-btn doc-btn--small" onClick={() => setMode('both')}>
                {l.keepBoth}
              </button>
              <button type="button" className="doc-btn doc-btn--small" onClick={() => setMode('intentional')}>
                {l.intentional}
              </button>
            </div>
          )}
          {mode && (
            <div className="lnk-note">
              <label>
                <span>{l.note}</span>
                <textarea className="doc-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={l.notePlaceholder} maxLength={500} />
              </label>
              <div className="lnk-actions">
                <button
                  type="button"
                  className="doc-btn doc-btn--primary doc-btn--small"
                  disabled={mode === 'both' && !note.trim()}
                  onClick={() => onDecide(d, { status: mode, note: note.trim() })}
                >
                  {l.save}
                </button>
                <button type="button" className="doc-btn doc-btn--small" onClick={() => setMode(null)}>
                  {l.cancel}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </li>
  )
}

function Transfer({ source, self, l, readOnly, onTransfer }) {
  const items = useMemo(() => transferable(source, self), [source, self])
  const [chosen, setChosen] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  if (!items.length) return <p className="lnk-muted">{l.transferNone}</p>
  const run = async () => {
    const list = items.filter((i) => chosen.has(i.key))
    if (!window.confirm(l.transferConfirm(source.title, list.map((i) => `• ${i.label}: «${i.value}»`).join('\n')))) return
    setBusy(true)
    const ok = await onTransfer(list, source)
    setBusy(false)
    if (ok) setChosen(new Set())
  }
  return (
    <div className="lnk-transfer">
      <p className="lnk-muted">{l.transferLead}</p>
      <ul>
        {items.map((i) => (
          <li key={i.key}>
            <label>
              <input
                type="checkbox"
                disabled={readOnly || i.same}
                checked={chosen.has(i.key)}
                onChange={(e) =>
                  setChosen((prev) => {
                    const next = new Set(prev)
                    if (e.target.checked) next.add(i.key)
                    else next.delete(i.key)
                    return next
                  })
                }
              />
              <span>
                <strong>{i.label}:</strong> «{i.value}» <span className="lnk-muted">({i.same ? l.transferSame : l.transferCurrent(i.current)})</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {!readOnly && (
        <button type="button" className="doc-btn doc-btn--primary doc-btn--small" disabled={!chosen.size || busy} onClick={run}>
          {busy ? <Loader2 size={14} className="doc-spin" aria-hidden="true" /> : <ArrowRightLeft size={14} aria-hidden="true" />} {l.transfer}
        </button>
      )}
    </div>
  )
}

function LinkCard({ item, self, l, lang, readOnly, onUnlink, onReviewed, onDecide, onTransfer }) {
  const { link, other } = item
  const s = docStrings(lang)
  if (!other) {
    return (
      <li className="lnk-card is-missing">
        <p>{l.missing}</p>
        {!readOnly && (
          <button type="button" className="doc-btn doc-btn--small" onClick={() => onUnlink(item)}>
            <Unlink size={14} aria-hidden="true" /> {l.unlink}
          </button>
        )}
      </li>
    )
  }
  const source = asDoc(other)
  const cmp = compareDocuments(self, source)
  const outdated = isOutdated(link, self.id, other)
  return (
    <li className="lnk-card">
      <header className="lnk-card-head">
        <div>
          <p className="lnk-kind">
            {l.kinds[link.kind] ?? link.kind}
            {link.topic ? ` · ${link.topic}` : ''}
          </p>
          <h3>
            <Link to={`/account/documents/${other.id}`}>
              {source.title} <ExternalLink size={13} aria-hidden="true" />
            </Link>
          </h3>
        </div>
        {!readOnly && (
          <button type="button" className="doc-btn doc-btn--small" onClick={() => onUnlink(item)}>
            <Unlink size={14} aria-hidden="true" /> {l.unlink}
          </button>
        )}
      </header>
      <dl className="lnk-meta">
        <div>
          <dt>{l.type}</dt>
          <dd>{templateById(other.template_id)?.title[lang] ?? other.template_id}</dd>
        </div>
        <div>
          <dt>{l.status}</dt>
          <dd>
            <span className={`doc-status doc-status--${other.status}`}>{s.docStatus[other.status] ?? other.status}</span>
          </dd>
        </div>
        <div>
          <dt>{l.updated}</dt>
          <dd>{fmt(other.updated_at, lang)}</dd>
        </div>
        <div>
          <dt>{l.lastCheck}</dt>
          <dd>
            <LastCheck other={other} l={l} lang={lang} />
          </dd>
        </div>
      </dl>
      {outdated && (
        <div className="lnk-outdated" role="status">
          <p>
            <AlertTriangle size={15} aria-hidden="true" /> {l.outdated(source.title)}
          </p>
          {!readOnly && (
            <button type="button" className="doc-btn doc-btn--small" onClick={() => onReviewed(item)}>
              {l.markReviewed}
            </button>
          )}
        </div>
      )}
      <section className="lnk-section">
        <h4>{l.compareTitle}</h4>
        {cmp.matches.length + cmp.discrepancies.length === 0 ? (
          <p className="lnk-muted">{l.noShared}</p>
        ) : (
          <>
            <p className="lnk-summary">
              <span className="lnk-ok">{l.matches(cmp.matches.length)}</span> · <span className={cmp.discrepancies.length ? 'lnk-bad' : 'lnk-ok'}>{l.discrepancies(cmp.discrepancies.length)}</span>
            </p>
            {cmp.discrepancies.length === 0 ? (
              <p className="lnk-muted">{l.noDiscrepancies}</p>
            ) : (
              <ul className="lnk-diffs">
                {cmp.discrepancies.map((d) => (
                  <DiscrepancyItem
                    key={d.id}
                    d={d}
                    link={link}
                    selfId={self.id}
                    other={source}
                    l={l}
                    readOnly={readOnly}
                    onDecide={(disc, decision) => onDecide(item, disc, decision)}
                    onApplyHere={(disc) => onTransfer([{ key: disc.a.field, label: disc.a.label, value: disc.b.raw }], source)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
      <section className="lnk-section">
        <h4>{l.transferTitle(source.title)}</h4>
        <Transfer source={source} self={self} l={l} readOnly={readOnly} onTransfer={onTransfer} />
      </section>
    </li>
  )
}

/**
 * The panel. `self` = { id, title, template, values, lang } of the open
 * document; onTransfer(items, source) applies chosen values in the editor
 * and resolves to true when it did.
 */
export function LinkedDocumentsPanel({ self, links, readOnly, onTransfer, onClose }) {
  const { lang: uiLang, t } = useLanguage()
  const lang = uiLang === 'kk' ? 'kk' : 'ru'
  const l = t.workspace.links
  const { user } = useAuth()
  const { showToast } = useToast()
  const [candidates, setCandidates] = useState(null)
  const [pick, setPick] = useState('')
  const [kind, setKind] = useState('incident')
  const [topic, setTopic] = useState('')
  const [busy, setBusy] = useState(false)

  const linkedIds = useMemo(() => new Set(links.items.map((i) => (i.link.document_a === self.id ? i.link.document_b : i.link.document_a))), [links.items, self.id])
  useEffect(() => {
    if (readOnly) return
    let alive = true
    linkCandidates(self.id)
      .then((rows) => alive && setCandidates(rows))
      .catch(() => alive && setCandidates([]))
    return () => {
      alive = false
    }
  }, [self.id, readOnly])
  const available = (candidates ?? []).filter((c) => !linkedIds.has(c.id))

  const markReviewed = (link) => ({ ...(link.reviewed ?? {}), [self.id]: new Date().toISOString() })

  const add = async (e) => {
    e.preventDefault()
    if (!pick) return
    setBusy(true)
    try {
      await createLink({ userId: user.id, documentId: self.id, otherId: pick, kind, topic: topic.trim() })
      setPick('')
      setTopic('')
      showToast(l.linked, { type: 'success' })
      await links.reload()
    } catch {
      showToast(l.linkFailed, { type: 'error' })
    } finally {
      setBusy(false)
    }
  }
  const unlink = async (item) => {
    const name = item.other ? asDoc(item.other).title : ''
    if (!window.confirm(l.unlinkConfirm(name))) return
    try {
      await deleteLink(item.link.id)
      showToast(l.unlinked, { type: 'success' })
      await links.reload()
    } catch {
      showToast(l.linkFailed, { type: 'error' })
    }
  }
  const reviewed = async (item) => {
    try {
      links.replace(await updateLink(item.link.id, { reviewed: markReviewed(item.link) }))
      showToast(l.reviewed, { type: 'success' })
    } catch {
      showToast(l.decisionFailed, { type: 'error' })
    }
  }
  const decide = async (item, d, decision) => {
    const decisions = { ...(item.link.decisions ?? {}) }
    if (decision) decisions[d.id] = { ...decision, at: new Date().toISOString() }
    else delete decisions[d.id]
    try {
      links.replace(await updateLink(item.link.id, { decisions, reviewed: markReviewed(item.link) }))
      showToast(l.decisionSaved, { type: 'success' })
    } catch {
      showToast(l.decisionFailed, { type: 'error' })
    }
  }
  const transfer = async (items, source) => {
    const ok = await onTransfer(items, source)
    const item = links.items.find((i) => i.other?.id === source.id)
    if (ok && item) updateLink(item.link.id, { reviewed: markReviewed(item.link) }).then(links.replace).catch(() => {})
    return ok
  }

  const provenance = provenanceState(self.values, links.sources)

  return (
    <Modal title={l.title} onClose={onClose} wide>
      <div className="lnk-panel">
        <p className="lnk-lead">{l.lead}</p>

        {provenance.length > 0 && (
          <section className="lnk-provenance">
            <h3>{l.provenanceTitle}</h3>
            <ul>
              {provenance.map((p) => (
                <li key={p.key} className={`lnk-prov lnk-prov--${p.state}`}>
                  <strong>{p.label}:</strong> «{p.value}» —{' '}
                  {p.documentId ? <Link to={`/account/documents/${p.documentId}`}>{l.provenanceFrom(p.title, fmt(p.at, lang))}</Link> : l.provenanceFrom(p.title, fmt(p.at, lang))}
                  <span className="lnk-prov-state"> · {p.state === 'source_changed' ? l.provenanceState.source_changed(p.sourceValue) : l.provenanceState[p.state]}</span>
                  {p.sourceMissing && <span className="lnk-muted"> · {l.sourceMissing}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {!readOnly && (
          <form className="lnk-add" onSubmit={add}>
            <h3>
              <Link2 size={17} aria-hidden="true" /> {l.add}
            </h3>
            {candidates && available.length === 0 ? (
              <p className="lnk-muted">{l.noCandidates}</p>
            ) : (
              <div className="lnk-add-row">
                <label>
                  <span>{l.pick}</span>
                  <select className="doc-input" value={pick} onChange={(e) => setPick(e.target.value)} disabled={!candidates}>
                    <option value="">—</option>
                    {available.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title || templateById(c.template_id)?.title[lang]} · {templateById(c.template_id)?.title[lang] ?? c.template_id}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{l.kind}</span>
                  <select className="doc-input" value={kind} onChange={(e) => setKind(e.target.value)}>
                    {Object.entries(l.kinds).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{l.topic}</span>
                  <input className="doc-input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={l.topicPlaceholder} maxLength={200} />
                </label>
                <button type="submit" className="doc-btn doc-btn--primary" disabled={!pick || busy}>
                  {busy ? <Loader2 size={15} className="doc-spin" aria-hidden="true" /> : <Link2 size={15} aria-hidden="true" />} {l.link}
                </button>
              </div>
            )}
          </form>
        )}

        {links.loading ? (
          <p className="lnk-muted">{l.loading}</p>
        ) : links.error ? (
          <p className="doc-error" role="alert">
            {l.loadError}{' '}
            <button type="button" className="exp-link" onClick={links.reload}>
              {l.retry}
            </button>
          </p>
        ) : links.items.length === 0 ? (
          <p className="lnk-muted">{l.none}</p>
        ) : (
          <ul className="lnk-cards">
            {links.items.map((item) => (
              <LinkCard key={item.link.id} item={item} self={self} l={l} lang={lang} readOnly={readOnly} onUnlink={unlink} onReviewed={reviewed} onDecide={decide} onTransfer={transfer} />
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
