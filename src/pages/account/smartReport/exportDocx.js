import JSZip from 'jszip'

// DOCX export of a composed report: requisites on the right, centred title,
// justified body paragraphs with a first-line indent, date and signature
// line. Built directly as WordprocessingML so no extra library is needed.

const escapeXml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function run(text, { bold = false } = {}) {
  const rPr = `<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${bold ? '<w:b/>' : ''}<w:sz w:val="28"/></w:rPr>`
  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
}

function paragraph(text, { align = 'both', indent = false, bold = false, after = 0, before = 0 } = {}) {
  const ind = indent ? '<w:ind w:firstLine="709"/>' : align === 'right' ? '<w:ind w:left="4820"/>' : ''
  const pPr = `<w:pPr><w:jc w:val="${align === 'right' ? 'left' : align}"/>${ind}<w:spacing w:before="${before}" w:after="${after}" w:line="276" w:lineRule="auto"/></w:pPr>`
  return `<w:p>${pPr}${run(text, { bold })}</w:p>`
}

/**
 * @param {{ header: Array<{label:string,value:string}>, title: string,
 *           paragraphs: string[], date: string, signature: string }} doc
 */
export async function reportToDocx(doc) {
  // Requisites and signature may span several lines (position / rank / name).
  const lines = (text) => String(text ?? '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const requisites = doc.header.filter((h) => h.value?.trim())
  const body = [
    ...requisites.flatMap((h, i) =>
      lines(h.value).map((line, j) => paragraph(line, { align: 'right', before: i > 0 && j === 0 ? 120 : 0 })),
    ),
    paragraph(doc.title, { align: 'center', bold: true, before: 360, after: 240 }),
    ...doc.paragraphs.filter((p) => p?.trim()).map((p) => paragraph(p, { indent: true, after: 120 })),
    paragraph(doc.date, { align: 'left', before: 480 }),
    ...lines(doc.signature).map((line, j) => paragraph(line, { align: 'left', before: j === 0 ? 120 : 0 })),
  ].join('')

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
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  )
  return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
}
