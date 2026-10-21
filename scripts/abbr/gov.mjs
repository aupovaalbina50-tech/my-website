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
// Article addresses from the sitemap: the Ministry («emer») and its
// departments (entities whose name starts with «emer»).
const urls = new Set()
const index = await get('https://www.gov.kz/sitemap.xml')
log.push(`sitemap.xml: ${index ? index.length + ' байт' : 'нет ответа'}`)
const subs = index ? [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]) : []
log.push(`вложенных карт: ${subs.length}; пример: ${subs.slice(0, 3).join(' ')}`)
const wanted = (u) => /\/(?:org|memleket\/entities)\/emer[\w-]*\/press\/(?:news|article)\/details\/\d+/.test(u)
for (const sub of subs.filter((u) => /emer|news|press/i.test(u)).slice(0, 40)) {
  const x = await get(sub)
  if (!x) continue
  for (const m of x.matchAll(/<loc>([^<]+)<\/loc>/g)) if (wanted(m[1])) urls.add(m[1].replace(/\?.*$/, ''))
  if (urls.size > 600) break
}
if (!urls.size) {
  // No per-ministry sitemap: scan all sub-sitemaps until enough MChS articles.
  for (const sub of subs.slice(0, 120)) {
    const x = await get(sub)
    if (!x) continue
    for (const m of x.matchAll(/<loc>([^<]+)<\/loc>/g)) if (wanted(m[1])) urls.add(m[1].replace(/\?.*$/, ''))
    if (urls.size > 600) break
  }
}
log.push(`статей МЧС в карте сайта: ${urls.size}`)
const list = [...urls].sort().reverse().slice(0, 260)
for (const base of list) {
  for (const lang of ['ru', 'kk']) {
    const url = `${base}?lang=${lang}`
    const a = await get(url)
    if (!a) continue
    const t = text(a)
    for (const m of t.matchAll(ABBR)) {
      const abbr = m[1].trim()
      if ((abbr.match(new RegExp(`[${CAP}]`, 'g')) ?? []).length < 2) continue
      found.push({ lang, abbr, before: t.slice(Math.max(0, m.index - 200), m.index).trim(), url })
    }
  }
}
log.push(`обработано статей: ${list.length} × 2 языка`)
fs.writeFileSync('out/gov.json', JSON.stringify(found, null, 1))
fs.writeFileSync('out/gov-summary.md', `${log.join('\n')}\n\nнайдено вводов сокращений: ${found.length}\n`)
console.log(fs.readFileSync('out/gov-summary.md', 'utf8'))
