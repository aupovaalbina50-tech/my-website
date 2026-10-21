// Which abbreviations the Ministry for Emergency Situations actually uses:
// MChS articles on gov.kz (sitemap; allowed by robots.txt), Russian and
// Kazakh. For every capital-letter token: how many articles use it and up to
// four sentences with it (each with the article address). One request per
// second.
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
const plain = (html) => {
  const body = html.match(/<article[\s\S]*?<\/article>/)?.[0] ?? html
  return body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&quot;/g, '"').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ')
}
const index = await get('https://www.gov.kz/sitemap.xml')
const subs = [...(index ?? '').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => /\/emer[\w-]*-sitemap/.test(u) || /emer/.test(u))
const urls = []
for (const sub of subs.slice(0, 40)) {
  const x = await get(sub)
  for (const m of (x ?? '').matchAll(/<loc>([^<]+)<\/loc>/g)) if (/\/press\/(?:news|article)\/details\/\d+/.test(m[1])) urls.push(m[1].replace(/\?.*$/, ''))
}
// Newest first, spread over the Ministry and its departments.
const list = [...new Set(urls)].sort((a, b) => Number(b.match(/(\d+)$/)[1]) - Number(a.match(/(\d+)$/)[1])).slice(0, 650)
const stats = { ru: new Map(), kk: new Map() }
const TOKEN = /(?<![\p{L}\d])([A-ZА-ЯЁӘҒҚҢӨҰҮҺІ]{2,}(?:[-–][A-ZА-ЯЁӘҒҚҢӨҰҮҺІ0-9]{1,6})?)(?![\p{L}\d])/gu
let done = 0
for (const base of list) {
  for (const lang of ['ru', 'kk']) {
    const html = await get(`${base}?lang=${lang}`)
    if (!html) continue
    const t = plain(html)
    const inArticle = new Set()
    for (const m of t.matchAll(TOKEN)) {
      const tok = m[1]
      if (tok.length > 12) continue
      const s = stats[lang].get(tok) ?? { n: 0, examples: [] }
      if (!inArticle.has(tok)) {
        s.n++
        inArticle.add(tok)
        if (s.examples.length < 4) {
          const from = Math.max(0, t.lastIndexOf('.', m.index) + 1)
          const to = t.indexOf('.', m.index + tok.length)
          s.examples.push({ text: t.slice(from, to === -1 ? m.index + 200 : Math.min(to + 1, m.index + 300)).trim().slice(0, 320), url: `${base}?lang=${lang}` })
        }
      }
      stats[lang].set(tok, s)
    }
  }
  done++
}
const dump = (m) => Object.fromEntries([...m].filter(([, s]) => s.n >= 2).sort((a, b) => b[1].n - a[1].n))
fs.writeFileSync('out/usage.json', JSON.stringify({ articles: done, sitemaps: subs.length, ru: dump(stats.ru), kk: dump(stats.kk) }, null, 1))
fs.writeFileSync('out/usage-summary.md', `статей: ${done}; вложенных карт МЧС: ${subs.length}\nru: ${stats.ru.size} токенов, kk: ${stats.kk.size}\n`)
console.log(fs.readFileSync('out/usage-summary.md', 'utf8'))
