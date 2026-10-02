import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { renderPdfPage } from './extract.js'

// Left pane of the results screen: the document page with findings marked.
//   PDF page with a text layer -> rendered page + highlight boxes at the
//                                 fragments' real positions
//   scanned PDF page / photo   -> the page image; fragment shown as text
//   any page                   -> "Text" view: page text with <mark>s
// Selecting a finding on the right jumps here to its page and fragment.

function xAt(spans, offset) {
  const span = spans.find((s) => offset >= s.start && offset <= s.end) ?? spans.find((s) => s.start >= offset)
  if (!span) return null
  return span.x + (span.width * (Math.min(offset, span.end) - span.start)) / Math.max(1, span.end - span.start)
}

/** Highlight rectangles (PDF user space) of [start, end) on a text-layer page, one per line. */
function fragmentRects(page, start, end) {
  const spans = page.spans.filter((s) => s.start < end && start < s.end && !s.rotated)
  const lines = new Map()
  for (const s of spans) {
    if (!lines.has(s.line)) lines.set(s.line, [])
    lines.get(s.line).push(s)
  }
  return [...lines.values()].map((lineSpans) => {
    const a = Math.max(start, lineSpans[0].start)
    const b = Math.min(end, lineSpans.at(-1).end)
    const size = Math.max(...lineSpans.map((s) => s.size))
    const y = lineSpans[0].y
    return [xAt(lineSpans, a), y - size * 0.25, xAt(lineSpans, b), y + size * 0.95]
  }).filter((rect) => rect[0] !== null && rect[2] !== null)
}

function PdfPageView({ pdf, page, results, selectedId }) {
  const holderRef = useRef(null)
  const [rendered, setRendered] = useState(null) // { url, viewport, width, height }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const pdfPage = await pdf.getPage(page.number)
      const { canvas, viewport } = await renderPdfPage(pdfPage, 1400)
      if (cancelled) return
      setRendered({ url: canvas.toDataURL('image/jpeg', 0.9), viewport, width: canvas.width, height: canvas.height })
    })().catch((error) => console.error('PDF page render failed:', error))
    return () => {
      cancelled = true
    }
  }, [pdf, page.number])

  useEffect(() => {
    holderRef.current?.querySelector('.inspector-hl--selected')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selectedId, rendered])

  if (!rendered) return <div className="inspector-preview-loading" aria-busy="true" />

  const boxes =
    page.source === 'text'
      ? results.flatMap((r) =>
          fragmentRects(page, r.start, r.end).map((rect, i) => {
            const [x0, y0] = rendered.viewport.convertToViewportPoint(rect[0], rect[1])
            const [x1, y1] = rendered.viewport.convertToViewportPoint(rect[2], rect[3])
            return {
              key: `${r.id}-${i}`,
              status: r.status,
              selected: r.id === selectedId,
              style: {
                left: `${(Math.min(x0, x1) / rendered.width) * 100}%`,
                top: `${(Math.min(y0, y1) / rendered.height) * 100}%`,
                width: `${(Math.abs(x1 - x0) / rendered.width) * 100}%`,
                height: `${(Math.abs(y1 - y0) / rendered.height) * 100}%`,
              },
            }
          }),
        )
      : []

  return (
    <div className="inspector-page-image" ref={holderRef}>
      <img src={rendered.url} alt="" />
      {boxes.map((box) => (
        <span
          key={box.key}
          className={`inspector-hl inspector-hl--${box.status}${box.selected ? ' inspector-hl--selected' : ''}`}
          style={box.style}
        />
      ))}
    </div>
  )
}

function TextView({ page, results, selectedId, ti }) {
  const holderRef = useRef(null)
  useEffect(() => {
    holderRef.current?.querySelector('.inspector-mark--selected')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [selectedId, page.number])

  if (!page.text.trim()) return <p className="inspector-preview-empty">{ti.emptyPage}</p>

  const parts = []
  let pos = 0
  for (const r of results) {
    if (r.start < pos) continue
    parts.push(page.text.slice(pos, r.start))
    parts.push(
      <mark
        key={r.id}
        className={`inspector-mark inspector-mark--${r.status}${r.id === selectedId ? ' inspector-mark--selected' : ''}`}
      >
        {page.text.slice(r.start, r.end)}
      </mark>,
    )
    pos = r.end
  }
  parts.push(page.text.slice(pos))
  return (
    <div className="inspector-page-text" ref={holderRef}>
      {parts}
    </div>
  )
}

function DocPreview({ doc, pageNumber, onPageChange, results, selected, ti }) {
  const pages = doc.pages
  const index = Math.max(0, pages.findIndex((p) => p.number === pageNumber))
  const page = pages[index]
  const visualAvailable = doc.kind !== 'docx'
  const [mode, setMode] = useState(visualAvailable ? 'page' : 'text')
  const pageResults = results.filter((r) => r.page === page.number).sort((a, b) => a.start - b.start)
  const selectedOnPage = selected && selected.page === page.number ? selected : null

  return (
    <div className="inspector-preview">
      <div className="inspector-preview-bar">
        {pages.length > 1 && (
          <div className="inspector-pager">
            <button
              type="button"
              className="inspector-icon-btn"
              onClick={() => onPageChange(pages[index - 1].number)}
              disabled={index === 0}
              aria-label={ti.prevPage}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="inspector-pager-label">{ti.pageOf(page.number, pages.at(-1).number)}</span>
            <button
              type="button"
              className="inspector-icon-btn"
              onClick={() => onPageChange(pages[index + 1].number)}
              disabled={index === pages.length - 1}
              aria-label={ti.nextPage}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
        {page.source === 'ocr' && <span className="inspector-badge">{ti.ocrBadge}</span>}
        {visualAvailable && (
          <div className="inspector-toggle" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'page'} onClick={() => setMode('page')}>
              {ti.previewPage}
            </button>
            <button type="button" role="tab" aria-selected={mode === 'text'} onClick={() => setMode('text')}>
              {ti.previewText}
            </button>
          </div>
        )}
      </div>

      <div className="inspector-preview-body">
        {mode === 'page' && doc.kind === 'pdf' && (
          <PdfPageView pdf={doc.pdf} page={page} results={pageResults} selectedId={selectedOnPage?.id} />
        )}
        {mode === 'page' && doc.kind === 'image' && (
          <div className="inspector-page-image">
            <img src={page.imageUrl} alt="" />
          </div>
        )}
        {mode === 'text' && <TextView page={page} results={pageResults} selectedId={selectedOnPage?.id} ti={ti} />}
      </div>

      {/* Scans have no positions for the fragment — show it as text instead. */}
      {mode === 'page' && selectedOnPage && page.source === 'ocr' && (
        <p className="inspector-preview-fragment">
          {ti.fragmentLabel}: <mark className={`inspector-mark inspector-mark--${selectedOnPage.status}`}>{selectedOnPage.text}</mark>
        </p>
      )}
    </div>
  )
}

export default DocPreview
