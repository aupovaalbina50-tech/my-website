import JSZip from 'jszip'
import { approveLines, metaLine } from './render.js'

// DOCX and PDF of a rendered document (render.js). DOCX is real
// WordprocessingML (A4, fields 30/15/20/20 mm, Times New Roman 14, tables
// with borders), PDF is drawn with pdf-lib in the same font as the on-screen
// preview (DejaVu Sans — the one bundled font with every Kazakh letter), so
// the PDF looks like the preview.

// ---- DOCX ---------------------------------------------------------------------

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function run(text, { bold = false, size = 28 } = {}) {
  return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${bold ? '<w:b/>' : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`
}

function para(runs, { align = 'both', firstLine = 0, left = 0, before = 0, after = 0, keepNext = false } = {}) {
  const ind = firstLine || left ? `<w:ind${left ? ` w:left="${left}"` : ''}${firstLine ? ` w:firstLine="${firstLine}"` : ''}/>` : ''
  return `<w:p><w:pPr>${keepNext ? '<w:keepNext/>' : ''}<w:spacing w:before="${before}" w:after="${after}" w:line="276" w:lineRule="auto"/>${ind}<w:jc w:val="${align}"/></w:pPr>${runs}</w:p>`
}

function table(columns, rows) {
  const width = Math.floor(9355 / columns.length)
  const border = '<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>'
  const cell = (text, bold) =>
    `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr>${para(run(text, { bold, size: 24 }), { align: bold ? 'center' : 'left' })}</w:tc>`
  const header = `<w:tr><w:trPr><w:tblHeader/></w:trPr>${columns.map((c) => cell(c.label, true)).join('')}</w:tr>`
  const body = rows.map((row) => `<w:tr>${columns.map((c) => cell(row[c.key] ?? '', false)).join('')}</w:tr>`).join('')
  return `<w:tbl><w:tblPr><w:tblW w:w="9355" w:type="dxa"/><w:tblBorders>${border}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${columns.map(() => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${header}${body}</w:tbl>${para('', { after: 120 })}`
}

const RIGHT_BLOCK = 5103 // requisites start at 9 cm from the left field

export async function documentToDocx(doc, lang) {
  const out = []
  if (doc.org) out.push(para(run(doc.org, { bold: true }), { align: 'center', after: 240 }))
  const approve = approveLines(doc, lang)
  approve.forEach((l, i) => out.push(para(run(l.text, { bold: l.bold }), { align: 'left', left: RIGHT_BLOCK, after: i === approve.length - 1 ? 240 : 0 })))
  doc.to.forEach((l) => out.push(para(run(l.text), { align: 'left', left: RIGHT_BLOCK })))
  doc.from.forEach((l, i) => out.push(para(run(l.text), { align: 'left', left: RIGHT_BLOCK, before: i === 0 && doc.to.length ? 120 : 0 })))
  out.push(para(run(doc.title, { bold: true }), { align: 'center', before: 360, after: doc.subject ? 0 : 120 }))
  if (doc.subject) out.push(para(run(doc.subject.text, { bold: true }), { align: 'center', after: 120 }))
  const meta = metaLine(doc)
  if (meta) out.push(para(run(meta), { align: 'center', after: 240 }))
  for (const b of doc.blocks) {
    if (b.kind === 'section') out.push(para(run(b.text, { bold: true }), { align: 'center', before: 200, after: 80, keepNext: true }))
    else if (b.kind === 'heading') out.push(para(run(b.text, { bold: true }), { align: 'left', firstLine: 709, before: 120, keepNext: true }))
    else if (b.kind === 'list') {
      out.push(para(run(`${b.label}:`, { bold: true }), { align: 'left', firstLine: 709, keepNext: true }))
      b.items.forEach((it, i) => out.push(para(run(`${i + 1}. ${it.text}`), { align: 'left', firstLine: 709 })))
    } else if (b.kind === 'table') {
      out.push(para(run(`${b.label}:`, { bold: true }), { align: 'left', firstLine: 709, after: 60, keepNext: true }))
      out.push(table(b.columns, b.rows))
    } else {
      const label = b.label ? run(b.inline ? `${b.label}: ` : `${b.label}. `, { bold: true }) : ''
      out.push(para(label + run(b.text), { firstLine: 709, after: 60 }))
    }
  }
  if (doc.attachments.length) {
    out.push(para(run(`${lang === 'kk' ? 'Қосымша' : 'Приложение'}: `, { bold: true }) + run(doc.attachments.join('; ')), { align: 'left', before: 240 }))
  }
  doc.signature.lines.forEach((l, i) => out.push(para(run(l.text), { align: 'left', before: i === 0 ? 480 : 0 })))
  if (doc.signature.name) {
    out.push(para(run(`__________ ${doc.signature.name.text}`), { align: 'right', before: doc.signature.lines.length ? 0 : 480 }))
  }

  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  )
  zip.file(
    '_rels/.rels',
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  )
  zip.file(
    'word/document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${out.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  )
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}

// ---- PDF ----------------------------------------------------------------------

const MM = 72 / 25.4
const PAGE = { w: 595.28, h: 841.89 }
const MARGIN = { left: 30 * MM, right: 15 * MM, top: 20 * MM, bottom: 20 * MM }
const SIZE = 11.5
const LEAD = SIZE * 1.45
const INDENT = 12.5 * MM

export async function documentToPdf(doc, lang) {
  const [{ PDFDocument, rgb }, { default: fontkit }] = await Promise.all([import('pdf-lib'), import('@pdf-lib/fontkit')])
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const fontBytes = await fetch(`${import.meta.env.BASE_URL}fonts/DejaVuSans.ttf`).then((r) => r.arrayBuffer())
  // Full embed: subsetting in fontkit occasionally drops Cyrillic glyphs.
  const font = await pdf.embedFont(fontBytes, { subset: false })
  const black = rgb(0, 0, 0)
  const width = (s, size = SIZE) => font.widthOfTextAtSize(s, size)
  const contentW = PAGE.w - MARGIN.left - MARGIN.right

  let page = pdf.addPage([PAGE.w, PAGE.h])
  let y = PAGE.h - MARGIN.top
  const newPage = () => {
    page = pdf.addPage([PAGE.w, PAGE.h])
    y = PAGE.h - MARGIN.top
  }
  const need = (h) => {
    if (y - h < MARGIN.bottom) newPage()
  }
  // DejaVu Sans has no bold face in the bundle: bold is drawn twice, 0.3 pt apart.
  const draw = (s, x, yy, { bold = false, size = SIZE } = {}) => {
    page.drawText(s, { x, y: yy, size, font, color: black })
    if (bold) page.drawText(s, { x: x + 0.3, y: yy, size, font, color: black })
  }

  /** Greedy word wrap; the first line can be narrower (indent) and start with a bold label. */
  function wrap(text, maxW, firstW = maxW, size = SIZE) {
    const words = String(text).split(/\s+/).filter(Boolean)
    const out = []
    let line = ''
    for (const w of words) {
      const limit = out.length ? maxW : firstW
      const next = line ? `${line} ${w}` : w
      if (width(next, size) <= limit || !line) line = next
      else {
        out.push(line)
        line = w
      }
    }
    if (line) out.push(line)
    return out
  }

  /** A paragraph: `align` left / center / right / justify, optional bold label run in. */
  function paragraph(text, { align = 'justify', indent = 0, left = 0, bold = false, label = '', before = 0, after = 0, size = SIZE } = {}) {
    y -= before
    const full = label ? `${label} ${text}` : text
    const maxW = contentW - left
    const lines = wrap(full, maxW, maxW - indent, size)
    lines.forEach((ln, i) => {
      need(LEAD)
      y -= LEAD
      const x0 = MARGIN.left + left + (i === 0 ? indent : 0)
      const avail = maxW - (i === 0 ? indent : 0)
      const w = width(ln, size)
      let x = x0
      if (align === 'center') x = MARGIN.left + left + (maxW - w) / 2
      if (align === 'right') x = MARGIN.left + left + maxW - w
      const last = i === lines.length - 1
      if (align === 'justify' && !last && ln.includes(' ')) {
        const parts = ln.split(' ')
        const gap = (avail - width(parts.join(''), size)) / (parts.length - 1)
        let cx = x0
        let labelLeft = i === 0 && label ? label.split(' ').length : 0
        for (const p of parts) {
          draw(p, cx, y, { bold: bold || labelLeft > 0, size })
          labelLeft -= 1
          cx += width(p, size) + gap
        }
        return
      }
      if (i === 0 && label && !bold) {
        draw(label, x, y, { bold: true, size })
        draw(ln.slice(label.length), x + width(label, size), y, { size })
      } else draw(ln, x, y, { bold, size })
    })
    y -= after
  }

  function drawTable(columns, rows) {
    const size = SIZE - 1.5
    const lead = size * 1.4
    const colW = contentW / columns.length
    const pad = 4
    const drawRow = (cells, bold) => {
      const wrapped = cells.map((c) => wrap(String(c ?? ''), colW - pad * 2, colW - pad * 2, size))
      const h = Math.max(1, ...wrapped.map((w) => w.length)) * lead + pad * 2
      need(h)
      const top = y
      wrapped.forEach((ls, ci) => {
        const x = MARGIN.left + ci * colW
        ls.forEach((l, li) => draw(l, x + pad, top - pad - (li + 1) * lead + 2.5, { bold, size }))
        page.drawRectangle({ x, y: top - h, width: colW, height: h, borderColor: black, borderWidth: 0.6 })
      })
      y = top - h
    }
    drawRow(columns.map((c) => c.label), true)
    rows.forEach((row) => drawRow(columns.map((c) => row[c.key] ?? ''), false))
    y -= 8
  }

  const RIGHT = contentW * 0.48
  if (doc.org) paragraph(doc.org, { align: 'center', bold: true, after: 12 })
  const approve = approveLines(doc, lang)
  approve.forEach((l, i) => paragraph(l.text, { align: 'left', left: RIGHT, bold: l.bold, after: i === approve.length - 1 ? 12 : 0 }))
  doc.to.forEach((l) => paragraph(l.text, { align: 'left', left: RIGHT }))
  doc.from.forEach((l, i) => paragraph(l.text, { align: 'left', left: RIGHT, before: i === 0 && doc.to.length ? 6 : 0 }))
  paragraph(doc.title, { align: 'center', bold: true, before: 18, after: doc.subject ? 0 : 6 })
  if (doc.subject) paragraph(doc.subject.text, { align: 'center', bold: true, after: 6 })
  const meta = metaLine(doc)
  if (meta) paragraph(meta, { align: 'center', after: 12 })
  for (const b of doc.blocks) {
    if (b.kind === 'section') paragraph(b.text, { align: 'center', bold: true, before: 10, after: 4 })
    else if (b.kind === 'heading') paragraph(b.text, { align: 'left', bold: true, indent: INDENT, before: 6 })
    else if (b.kind === 'list') {
      paragraph(`${b.label}:`, { align: 'left', bold: true, indent: INDENT })
      b.items.forEach((it, i) => paragraph(`${i + 1}. ${it.text}`, { align: 'left', indent: INDENT }))
    } else if (b.kind === 'table') {
      paragraph(`${b.label}:`, { align: 'left', bold: true, indent: INDENT, after: 4 })
      drawTable(b.columns, b.rows)
    } else {
      const label = b.label ? (b.inline ? `${b.label}:` : `${b.label}.`) : ''
      paragraph(b.text, { indent: INDENT, label, after: 3 })
    }
  }
  if (doc.attachments.length) paragraph(doc.attachments.join('; '), { align: 'left', label: `${lang === 'kk' ? 'Қосымша' : 'Приложение'}:`, before: 12 })
  doc.signature.lines.forEach((l, i) => paragraph(l.text, { align: 'left', before: i === 0 ? 24 : 0 }))
  if (doc.signature.name) paragraph(`__________ ${doc.signature.name.text}`, { align: 'right', before: doc.signature.lines.length ? 0 : 24 })

  const bytes = await pdf.save()
  return new Blob([bytes], { type: 'application/pdf' })
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** A file name from the document title: letters, digits, spaces → «_». */
export const fileNameOf = (title, ext) => `${String(title || 'document').replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_|_$/g, '').slice(0, 80) || 'document'}.${ext}`
