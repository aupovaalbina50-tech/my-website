// How adilet.zan.kz serves an act's text: the page, and any document /
// text URLs it refers to.
import fs from 'node:fs'
const UA = 'termin-mchs-catalog-bot/1.0 (+https://termin-mchs.vercel.app)'
fs.mkdirSync('out', { recursive: true })
for (const url of ['https://adilet.zan.kz/robots.txt', 'https://adilet.zan.kz/rus/docs/V1700015430', 'https://adilet.zan.kz/kaz/docs/V1700015430']) {
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  const t = await r.text()
  const name = url.split('/').slice(-2).join('-').replace(/[^\w.-]/g, '_')
  fs.writeFileSync(`out/adilet-${name}.html`, t)
  const refs = [...new Set([...t.matchAll(/(?:src|href|url)\s*[=:]\s*["']([^"']+)["']/g)].map((m) => m[1]))].filter((u) => !/\.(css|png|svg|ico|woff)/.test(u))
  fs.appendFileSync('out/adilet-probe.txt', `${url} HTTP ${r.status} ${t.length} bytes; contains «далее»: ${(t.match(/далее/g) ?? []).length}\n${refs.slice(0, 60).join('\n')}\n\n`)
  await new Promise((s) => setTimeout(s, 1000))
}
