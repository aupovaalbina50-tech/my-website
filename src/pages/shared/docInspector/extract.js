// Text extraction for the inspector — runs in the browser.
//
//   DOCX  -> word/document.xml paragraphs (incl. tables), page numbers from
//            Word's rendered page breaks. Keeps a map offset -> <w:t> node so
//            corrections can later be written back into the same runs.
//   PDF   -> pdf.js text layer per page, with each character range mapped to
//            its text item (position on the page). Pages without a usable
//            text layer (scans) are rendered to an image for OCR.
//   Image -> downscaled JPEG for OCR.
//
// Every page ends up as { number, text, source: 'text'|'ocr' } so the rest of
// the pipeline doesn't care where the text came from.

import { InspectorError } from './inspectorClient.js'

export const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
export const MAX_FILE_BYTES = 30 * 1024 * 1024
export const MAX_PAGES = 60

// Longest side of a page image sent to OCR: legible for the model, small upload.
const OCR_MAX_SIDE = 2000
const JPEG_QUALITY = 0.88

/** 'docx' | 'pdf' | 'image' from the file's first bytes (not its name). */
export async function detectKind(file) {
  if (!file || file.size === 0) throw new InspectorError('empty_file')
  if (file.size > MAX_FILE_BYTES) throw new InspectorError('file_too_large')
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const is = (...sig) => sig.every((b, i) => head[i] === b)
  if (is(0x25, 0x50, 0x44, 0x46)) return 'pdf' // %PDF
  if (is(0xff, 0xd8, 0xff) || is(0x89, 0x50, 0x4e, 0x47)) return 'image'
  if (is(0x52, 0x49, 0x46, 0x46) && file.type === 'image/webp') return 'image'
  if (is(0x50, 0x4b, 0x03, 0x04)) return 'docx' // ZIP; checked for word/document.xml below
  if (is(0xd0, 0xcf, 0x11, 0xe0)) throw new InspectorError('legacy_doc') // old binary .doc
  throw new InspectorError('unsupported_file')
}

// ---- DOCX ------------------------------------------------------------------

/**
 * Parses document.xml into pages of text + a run map. Pure and repeatable:
 * the same XML always gives the same offsets, which is what lets the writer
 * re-parse the original and apply fixes by offset.
 */
export function parseDocxXml(xml) {
  const dom = new DOMParser().parseFromString(xml, 'application/xml')
  if (dom.getElementsByTagName('parsererror').length) throw new InspectorError('unsupported_file')
  const body = dom.getElementsByTagNameNS(W_NS, 'body')[0]
  if (!body) throw new InspectorError('unsupported_file')

  const paragraphs = []
  let page = 1
  let pageBreaks = 0

  for (const p of body.getElementsByTagNameNS(W_NS, 'p')) {
    const runs = []
    let text = ''
    let breakAfter = 0
    // Walk this paragraph's own content (not nested text-box paragraphs).
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType !== 1) continue
        if (child.namespaceURI === W_NS) {
          const name = child.localName
          if (name === 'p' || name === 'delText' || name === 'instrText') continue
          if (name === 't') {
            const value = child.textContent
            runs.push({ node: child, start: text.length, end: text.length + value.length })
            text += value
            continue
          }
          if (name === 'tab') {
            text += '\t'
            continue
          }
          const isPageBreak = name === 'lastRenderedPageBreak' || (name === 'br' && child.getAttributeNS(W_NS, 'type') === 'page')
          if (isPageBreak) {
            pageBreaks++
            // A break before any text starts this paragraph on the next page.
            if (text.trim() === '') page++
            else breakAfter++
            continue
          }
          if (name === 'br' || name === 'cr') {
            text += '\n'
            continue
          }
        }
        walk(child)
      }
    }
    walk(p)
    paragraphs.push({ page, text, runs })
    page += breakAfter
  }

  // Assemble page texts: paragraphs joined by "\n"; record each paragraph's
  // offset inside its page.
  const pages = new Map()
  paragraphs.forEach((para, index) => {
    const entry = pages.get(para.page) ?? { number: para.page, text: '', source: 'text' }
    if (entry.text.length) entry.text += '\n'
    para.index = index
    para.offset = entry.text.length
    entry.text += para.text
    pages.set(para.page, entry)
  })

  return { dom, paragraphs, pages: [...pages.values()], pagesKnown: pageBreaks > 0 }
}

async function extractDocx(file) {
  const { default: JSZip } = await import('jszip')
  let zip
  try {
    zip = await JSZip.loadAsync(file)
  } catch {
    throw new InspectorError('unsupported_file')
  }
  const xml = await zip.file('word/document.xml')?.async('string')
  if (!xml) throw new InspectorError('unsupported_file')
  const parsed = parseDocxXml(xml)

  // Word stores the page count it last rendered in docProps/app.xml.
  const app = await zip.file('docProps/app.xml')?.async('string')
  const declared = Number(/<Pages>(\d+)<\/Pages>/.exec(app ?? '')?.[1])
  const totalPages = parsed.pagesKnown ? Math.max(declared || 0, parsed.pages.at(-1).number) : declared || null

  return {
    kind: 'docx',
    pages: parsed.pages,
    pagesKnown: parsed.pagesKnown,
    totalPages,
    paragraphs: parsed.paragraphs.map(({ page, offset, text, index }) => ({ page, offset, length: text.length, index })),
    docx: { zip, xml },
  }
}

// ---- PDF -------------------------------------------------------------------

let pdfjsPromise = null

export function loadPdfjs() {
  pdfjsPromise ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(
    ([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default
      return pdfjs
    },
  )
  return pdfjsPromise
}

/**
 * One page's text layer -> text + spans. Each span maps a character range of
 * the page text to the pdf.js item that drew it (position, width, size), so
 * a finding can be highlighted and corrected at its place on the page.
 */
function pageTextFromItems(items) {
  let text = ''
  const spans = []
  let line = 0
  let lastY = null
  let lastXEnd = null
  for (const item of items) {
    if (typeof item.str !== 'string') continue // marked-content markers
    const [a, b, c, d, x, y] = item.transform
    const size = Math.hypot(c, d) || item.height || 10
    if (lastY !== null && Math.abs(y - lastY) > size * 0.5) {
      if (!text.endsWith('\n')) text += '\n'
      line++
      lastXEnd = null
    } else if (lastXEnd !== null && x - lastXEnd > size * 0.15 && !/\s$/.test(text) && !/^\s/.test(item.str)) {
      text += ' '
    }
    if (item.str.length) {
      spans.push({
        start: text.length,
        end: text.length + item.str.length,
        line,
        x,
        y,
        width: item.width,
        size,
        rotated: Math.abs(b) > 0.01 || Math.abs(c) > 0.01 || a < 0,
      })
      text += item.str
    }
    lastY = y
    lastXEnd = x + item.width
    if (item.hasEOL) {
      if (!text.endsWith('\n')) text += '\n'
      line++
      lastXEnd = null
    }
  }
  return { text: text.replace(/\n+$/, ''), spans }
}

/** Does this text layer actually carry the page's text (not a scan / broken encoding)? */
function hasUsableText(text) {
  const visible = text.replace(/\s/g, '')
  if (visible.length < 25) return false
  const letters = visible.match(/\p{L}/gu)?.length ?? 0
  return letters / visible.length > 0.5
}

/** Renders a PDF page to a canvas with its longest side ≈ maxSide px. */
export async function renderPdfPage(page, maxSide) {
  const base = page.getViewport({ scale: 1 })
  const scale = maxSide / Math.max(base.width, base.height)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(viewport.width)
  canvas.height = Math.round(viewport.height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, canvas, viewport }).promise
  return { canvas, viewport }
}

function canvasToJpeg(canvas) {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new InspectorError('unsupported_file'))), 'image/jpeg', JPEG_QUALITY),
  )
}

async function extractPdf(file) {
  const pdfjs = await loadPdfjs()
  const bytes = new Uint8Array(await file.arrayBuffer())
  let pdf
  try {
    // pdf.js may transfer (detach) the buffer it gets, so give it a copy.
    pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise
  } catch (error) {
    throw new InspectorError(error?.name === 'PasswordException' ? 'pdf_encrypted' : 'unsupported_file')
  }
  if (pdf.numPages > MAX_PAGES) throw new InspectorError('too_many_pages')

  const pages = []
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number)
    const { text, spans } = pageTextFromItems((await page.getTextContent()).items)
    pages.push(hasUsableText(text) ? { number, text, source: 'text', spans } : { number, text: '', source: 'ocr', spans: [] })
  }
  return { kind: 'pdf', pages, pagesKnown: true, totalPages: pdf.numPages, pdf, bytes }
}

/** JPEG of a scanned PDF page, for OCR. */
export async function pdfPageImage(pdf, number) {
  const { canvas } = await renderPdfPage(await pdf.getPage(number), OCR_MAX_SIDE)
  return canvasToJpeg(canvas)
}

// ---- Image -----------------------------------------------------------------

/** Decodes (applying EXIF rotation), downscales and re-encodes as JPEG. */
async function extractImage(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new InspectorError('unsupported_file')
  }
  const scale = Math.min(1, OCR_MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff' // transparent PNGs become white paper, not black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await canvasToJpeg(canvas)
  return {
    kind: 'image',
    pages: [{ number: 1, text: '', source: 'ocr', spans: [], imageUrl: URL.createObjectURL(blob) }],
    pagesKnown: true,
    totalPages: 1,
    imageBlob: blob,
  }
}

export async function extractDocument(file) {
  const kind = await detectKind(file)
  if (kind === 'docx') return extractDocx(file)
  if (kind === 'pdf') return extractPdf(file)
  return extractImage(file)
}
