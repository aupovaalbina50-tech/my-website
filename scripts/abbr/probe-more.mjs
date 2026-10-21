// robots.txt and the front pages of the other sources named for checking.
import fs from 'node:fs'
const UA = 'termin-mchs-catalog-bot/1.0 (+https://termin-mchs.vercel.app)'
fs.mkdirSync('out', { recursive: true })
for (const url of ['https://termincom.kz/robots.txt', 'https://termincom.kz/', 'https://www.gov.kz/robots.txt', 'https://www.gov.kz/memleket/entities/emer?lang=ru']) {
  let line
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    const t = await r.text()
    line = `${url} HTTP ${r.status} ${t.length} bytes\n${url.endsWith('robots.txt') ? t.slice(0, 1500) : t.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 800)}\n`
  } catch (e) {
    line = `${url} ERROR ${e.message}\n`
  }
  fs.appendFileSync('out/more-probe.txt', line + '\n')
  await new Promise((s) => setTimeout(s, 1000))
}
