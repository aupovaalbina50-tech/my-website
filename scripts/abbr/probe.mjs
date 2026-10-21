// Step 1 of collecting abbreviations from emle.kz: read robots.txt and the
// catalog's first page, record how the catalog is organised (links,
// pagination, letters). One request per second, identified user agent.
import fs from 'node:fs'
const UA = 'termin-mchs-catalog-bot/1.0 (+https://termin-mchs.vercel.app)'
fs.mkdirSync('out', { recursive: true })
const get = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'kk,ru' } })
  const text = await r.text()
  await new Promise((s) => setTimeout(s, 1000))
  return { status: r.status, text, type: r.headers.get('content-type') }
}
const robots = await get('https://emle.kz/robots.txt')
fs.writeFileSync('out/robots.txt', `HTTP ${robots.status}\n${robots.text}`)
for (const [name, url] of [['page1', 'https://emle.kz/kz/abbreviations/'], ['ru', 'https://emle.kz/ru/abbreviations/']]) {
  const p = await get(url)
  fs.writeFileSync(`out/${name}.html`, p.text)
  const links = [...new Set([...p.text.matchAll(/href="([^"]+)"/g)].map((m) => m[1]))]
  const apis = [...new Set([...p.text.matchAll(/["'](\/?api\/[^"']+|https?:\/\/[^"']*api[^"']*)["']/g)].map((m) => m[1]))]
  fs.writeFileSync(`out/${name}-summary.txt`, `HTTP ${p.status} ${p.type} ${p.text.length} bytes\n\nLINKS:\n${links.join('\n')}\n\nAPI-LIKE:\n${apis.join('\n')}\n`)
}
