// Official usage of abbreviations by the Ministry for Emergency Situations:
// its news on gov.kz (allowed by gov.kz robots.txt), Russian and Kazakh.
// Every «Полное наименование (АББР)» found, with the article address.
// One request per second.
import fs from 'node:fs'
const UA = 'termin-mchs-catalog-bot/1.0 (+https://termin-mchs.vercel.app)'
fs.mkdirSync('out', { recursive: true })
const sleep = (ms) => new Promise((s) => setTimeout(s, ms))
async function get(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    const t = await r.text()
    await sleep(1000)
    return r.ok ? t : null
  } catch {
    await sleep(2000)
    return null
  }
}
const text = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&quot;/g, '"').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ')
const CAP = 'A-ZА-ЯЁӘҒҚҢӨҰҮҺІ'
const ABBR = new RegExp(`\\(\\s*([${CAP}][${CAP}a-zа-яёәғқңөұүһі0-9\\-–/ ]{1,14})\\s*\\)`, 'g')
const log = []
const found = []
for (const lang of ['ru', 'kk']) {
  const seenArticles = new Set()
  for (let page = 0; page < 12 && seenArticles.size < 160; page++) {
    const listUrl = `https://www.gov.kz/org/emer/press/news?lang=${lang}&page=${page}`
    const html = await get(listUrl)
    if (!html) {
      log.push(`${listUrl}: нет ответа`)
      break
    }
    const links = [...new Set([...html.matchAll(/\/(?:org|memleket\/entities)\/emer\/press\/news\/details\/(\d+)/g)].map((m) => m[1]))]
    log.push(`${listUrl}: ${links.length} статей, ${html.length} байт`)
    if (page === 0) fs.writeFileSync(`out/gov-list-${lang}.html`, html)
    let fresh = 0
    for (const id of links) {
      if (seenArticles.has(id)) continue
      seenArticles.add(id)
      fresh++
      const url = `https://www.gov.kz/org/emer/press/news/details/${id}?lang=${lang}`
      const a = await get(url)
      if (!a) continue
      const t = text(a)
      for (const m of t.matchAll(ABBR)) {
        const abbr = m[1].trim()
        if ((abbr.match(new RegExp(`[${CAP}]`, 'g')) ?? []).length < 2) continue
        found.push({ lang, abbr, before: t.slice(Math.max(0, m.index - 200), m.index).trim(), url })
      }
    }
    if (!fresh) break
  }
}
fs.writeFileSync('out/gov.json', JSON.stringify(found, null, 1))
fs.writeFileSync('out/gov-summary.md', `${log.join('\n')}\n\nнайдено вводов сокращений: ${found.length}\n`)
console.log(fs.readFileSync('out/gov-summary.md', 'utf8'))
