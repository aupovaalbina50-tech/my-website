import { approveLines, metaLine } from './render.js'

// The live A4 preview — the same blocks the DOCX and PDF are built from, in
// the PDF's font. Placeholders of empty required fields are marked; a block
// with a remark under the cursor is highlighted (`focusKey`). Clicking a
// block jumps to its field in the form.

const keyOf = (path) => String(path ?? '').split('.')[0]

function Text({ item, focusKey }) {
  return (
    <span className={`${item.missing ? 'doc-paper-missing' : ''}${focusKey && keyOf(item.key) === focusKey ? ' doc-paper-focus' : ''}`}>
      {item.text}
    </span>
  )
}

export default function DocumentPreview({ doc, lang, focusKey, onPick }) {
  const pick = (key) => () => key && onPick?.(keyOf(key))
  const cls = (key, base) => `${base}${focusKey && keyOf(key) === focusKey ? ' doc-paper-focus' : ''}`
  const approve = approveLines(doc, lang)
  const meta = metaLine(doc)
  return (
    <article className="doc-paper" lang={lang} aria-label={doc.title}>
      {doc.org && <p className="doc-paper-org">{doc.org}</p>}
      {approve.length > 0 && (
        <div className="doc-paper-right doc-paper-approve">
          {approve.map((l, i) => (
            <p key={i} className={l.bold ? 'doc-paper-strong' : undefined} onClick={pick(l.key)}>
              <Text item={l} focusKey={focusKey} />
            </p>
          ))}
        </div>
      )}
      {(doc.to.length > 0 || doc.from.length > 0) && (
        <div className="doc-paper-right">
          {doc.to.map((l, i) => (
            <p key={`to${i}`} onClick={pick(l.key)}>
              <Text item={l} focusKey={focusKey} />
            </p>
          ))}
          {doc.from.length > 0 && <p className="doc-paper-gap" aria-hidden="true" />}
          {doc.from.map((l, i) => (
            <p key={`from${i}`} onClick={pick(l.key)}>
              <Text item={l} focusKey={focusKey} />
            </p>
          ))}
        </div>
      )}
      <h2 className="doc-paper-title">{doc.title}</h2>
      {doc.subject && (
        <p className="doc-paper-subject" onClick={pick(doc.subject.key)}>
          <Text item={doc.subject} focusKey={focusKey} />
        </p>
      )}
      {meta && <p className="doc-paper-meta">{meta}</p>}

      {doc.blocks.map((b, i) => {
        if (b.kind === 'section') return <h3 key={i} className="doc-paper-section">{b.text}</h3>
        if (b.kind === 'heading')
          return (
            <p key={i} className={cls(b.key, 'doc-paper-heading')} onClick={pick(b.key)}>
              {b.text}
            </p>
          )
        if (b.kind === 'list')
          return (
            <div key={i} className={cls(b.key, 'doc-paper-list')} onClick={pick(b.key)}>
              <p className="doc-paper-p">
                <strong>{b.label}:</strong>
              </p>
              <ol>
                {b.items.map((it) => (
                  <li key={it.key}>{it.text}</li>
                ))}
              </ol>
            </div>
          )
        if (b.kind === 'table')
          return (
            <div key={i} className={cls(b.key, 'doc-paper-tablewrap')} onClick={pick(b.key)}>
              <p className="doc-paper-p">
                <strong>{b.label}:</strong>
              </p>
              <table className="doc-paper-table">
                <thead>
                  <tr>
                    {b.columns.map((c) => (
                      <th key={c.key}>{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, r) => (
                    <tr key={r}>
                      {b.columns.map((c) => (
                        <td key={c.key}>{row[c.key] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        return (
          <p key={i} className={cls(b.key, 'doc-paper-p')} onClick={pick(b.key)}>
            {b.label && <strong>{b.inline ? `${b.label}: ` : `${b.label}. `}</strong>}
            <span className={b.missing ? 'doc-paper-missing' : undefined}>{b.text}</span>
          </p>
        )
      })}

      {doc.attachments.length > 0 && (
        <p className="doc-paper-attach">
          <strong>{lang === 'kk' ? 'Қосымша' : 'Приложение'}: </strong>
          {doc.attachments.join('; ')}
        </p>
      )}
      {(doc.signature.lines.length > 0 || doc.signature.name) && (
        <div className="doc-paper-sign">
          <div>
            {doc.signature.lines.map((l, i) => (
              <p key={i} onClick={pick(l.key)}>
                <Text item={l} focusKey={focusKey} />
              </p>
            ))}
          </div>
          {doc.signature.name && (
            <p className="doc-paper-sign-name" onClick={pick(doc.signature.name.key)}>
              __________ <Text item={doc.signature.name} focusKey={focusKey} />
            </p>
          )}
        </div>
      )}
    </article>
  )
}
