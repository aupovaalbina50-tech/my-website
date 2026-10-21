// «Паспорт документа» as a separate PDF: the same page builder as the
// documents (exportDocument.js), fed with a document-shaped structure of the
// passport. The text of the service document is not in it and is not changed.

const block = (text, label = '', inline = true) => ({ kind: 'para', text: String(text ?? ''), label, inline })
const section = (text) => ({ kind: 'section', text })
// A date the user typed (YYYY-MM-DD) as written, without a time zone shift.
const day = (v) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ''))
  return m ? `${m[3]}.${m[2]}.${m[1]}` : v
}

export function passportDocument({ p, x, r, route, lang, info, stage, template, check, runs, feed, sources, origins, vkinds, docStatus, fmt }) {
  const blocks = []
  const add = (label, value, empty = p.notSet) => blocks.push(block(value || empty, label))

  blocks.push(section(p.mainTitle))
  add(p.f.title, info.title)
  add(p.f.type, template.title[lang])
  add(p.f.number, info.number, info.hasNumberField ? p.notAssigned : p.noNumberField)
  add(p.f.created, fmt(info.createdAt))
  add(p.f.updated, fmt(info.updatedAt))
  add(p.f.documentDate, day(info.documentDate))
  add(p.f.eventDate, day(info.eventDate?.value))
  add(p.f.author, info.author)
  add(p.f.version, info.version ? p.versionN(info.version) : null, p.noVersions)
  add(p.f.lang, info.lang ? p.langs[info.lang] : null)
  add(p.f.organization, info.organization)
  add(p.f.unit, info.unit)
  add(p.f.status, docStatus[info.status] ?? info.status)
  add(p.stageLabel, `${p.stages[stage.stage]}${stage.outdated ? ` — ${p.outdated}` : ''}`)

  if (route) {
    blocks.push(section(r.passportTitle))
    for (const st of route.stages) blocks.push(block([r.status[st.status], st.at ? fmt(st.at) : '', st.count ? r.count(st.count) : ''].filter(Boolean).join(' · '), r.stages[st.key].title))
    const fin = route.stages.find((st) => st.key === 'final')
    blocks.push(block(fin?.at ? r.finalAt(fmt(fin.at), fin.version) : r.noFinal))
  }

  blocks.push(section(p.tabs.checks))
  if (!runs.length) blocks.push(block(p.noRuns))
  for (const r of runs) {
    const cats = r.categories
      ? Object.entries(r.categories)
          .filter(([, n]) => n > 0)
          .map(([c, n]) => `${x.qc.categories[c]}: ${n}`)
          .join('; ')
      : p.categoriesNotSaved
    blocks.push(
      block(
        [p.runType[r.type], r.version ? p.versionN(r.version) : p.versionUnknown, p.outcome[r.outcome], r.outcome !== 'failed' ? p.remarksTotal(r.total ?? 0) : '', r.outcome !== 'failed' ? cats : '', r.outdated ? p.runOutdated : '']
          .filter(Boolean)
          .join(' · '),
        fmt(r.at),
      ),
    )
  }

  blocks.push(section(p.tabs.sources))
  if (!check) blocks.push(block(p.sourcesNoCheck))
  else {
    const list = (title, items, line) => {
      blocks.push(block(items.length ? '' : p.srcNone, title, true))
      items.forEach((it, i) => blocks.push(block(line(it), `${i + 1}.`)))
    }
    list(p.srcCat.normative, sources.normative, (s) => [s.title ?? p.notInRegistry, s.number, s.date, `${p.inText}: «${s.fragment}»`, x.refs.actuality[s.actuality] ?? s.actuality, s.url].filter(Boolean).join(' · '))
    list(p.srcCat.state, sources.state, (s) => [s.title ?? s.fragment, s.url, `${p.accessed}: ${fmt(s.accessed)}`].filter(Boolean).join(' · '))
    blocks.push(block(sources.termBase ? p.termBaseUsed(sources.termBase.size, sources.termBase.termsFound, fmt(sources.termBase.accessed)) : p.termBaseNotUsed, p.srcCat.termBase))
    list(p.srcCat.internal, sources.internal, () => `${p.templateRules(template.title[lang])}. ${p.templateRulesNote}`)
    list(p.srcCat.other, sources.other, (s) => [s.title, p.kbNote, s.sourceTitle, s.url].filter(Boolean).join(' · '))
  }

  blocks.push(section(p.originTitle))
  if (!origins.length) blocks.push(block(p.originNone))
  for (const o of origins) blocks.push(block(`${p.origin[o.kind]}${o.unconfirmed ? ` (${p.unconfirmed})` : ''}`, o.label[lang]))

  blocks.push(section(p.historyTitle))
  if (!feed.length) blocks.push(block(p.noEvents))
  for (const e of feed.slice(0, 200)) {
    const what = e.kind === 'version' ? p.ev.version(e.version, vkinds[e.versionKind] ?? e.versionKind, e.note) : e.kind === 'check' ? p.ev.check(p.outcome[e.run.outcome], e.run.total ?? 0, e.run.version) : p.evKind[e.kind] ?? e.kind
    blocks.push(block(what, fmt(e.at)))
  }

  return {
    org: null,
    approve: [],
    meta: [],
    to: [],
    from: [],
    title: p.pdfTitle,
    subject: { key: null, text: info.title || template.title[lang] },
    blocks: [block(`${p.generatedAt(fmt(new Date().toISOString()))}. ${p.disclaimer}`), ...blocks],
    attachments: [],
    signature: { lines: [], name: null },
  }
}
