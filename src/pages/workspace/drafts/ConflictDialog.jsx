import { useMemo } from 'react'
import { GitCompare } from 'lucide-react'
import { Modal } from '../../account/documents/Dialogs.jsx'
import { documentText, renderDocument } from '../../account/documents/render.js'
import { diffStats, diffText } from '../versions/diff.js'
import { Diff } from '../versions/VersionsPanel.jsx'
import './drafts.css'

// Two texts of one document: the one on the server (changed from another tab
// or device) and the one in this editor / on this device. The user compares
// them and chooses; the text not chosen is kept as a version, never lost.

export function ConflictDialog({ template, server, mine, mineAt, lang, c, busy, onKeepMine, onTakeServer, onLater }) {
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : '')
  const parts = useMemo(() => {
    const text = (p) => `${p.title ?? ''}\n${documentText(renderDocument(template, p.values ?? {}, p.lang ?? 'ru'), p.lang ?? 'ru')}`
    return diffText(text(server), text(mine))
  }, [template, server, mine])
  const stats = diffStats(parts)
  return (
    <Modal title={c.title} onClose={onLater} wide>
      <div className="draft-conflict">
        <p>{c.lead}</p>
        <dl className="draft-conflict-sides">
          <div>
            <dt>{c.server}</dt>
            <dd>{c.changedAt(fmt(server.updated_at))}</dd>
          </div>
          <div>
            <dt>{c.mine}</dt>
            <dd>{mineAt ? c.changedAt(fmt(mineAt)) : c.unsaved}</dd>
          </div>
        </dl>
        <p className="draft-conflict-stats">
          <GitCompare size={15} aria-hidden="true" /> {c.legend} {c.stats(stats)}
        </p>
        <div className="draft-conflict-diff">
          <Diff parts={parts} />
        </div>
        <p className="draft-conflict-note">{c.note}</p>
        <div className="doc-modal-actions">
          <button type="button" className="doc-btn" onClick={onLater} disabled={busy}>
            {c.later}
          </button>
          <button type="button" className="doc-btn" onClick={onTakeServer} disabled={busy}>
            {c.takeServer}
          </button>
          <button type="button" className="doc-btn doc-btn--primary" onClick={onKeepMine} disabled={busy}>
            {c.keepMine}
          </button>
        </div>
      </div>
    </Modal>
  )
}
