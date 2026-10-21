// Abbreviations that civil-protection acts define themselves, from the
// Russian and Kazakh texts on adilet.zan.kz. adilet's robots.txt closes its
// API to crawlers but opens act pages, including to agents acting on a
// person's request; so this opens a short list of acts one by one in a real
// browser, as a reader would (3 s apart, identified), and never calls the
// API itself or the search. Seed: the acts the platform already cites; plus
// civil-protection acts they link to, up to MAX_DOCS.
// Output: out/adilet.json — per act: title, and every «(далее – X)» /
// «(бұдан әрі – X)» with the words before it and the point it stands in,
// plus lines of abbreviation lists («X – full form»); out/texts/<id>.<lang>.txt.gz —
// the act texts, to check where an abbreviation is used.
import { chromium } from 'playwright'
import fs from 'node:fs'
import zlib from 'node:zlib'

const SEED = ['Z1400000188', 'V1700015430', 'V2100024045', 'Z030000387_', 'V14C0010151']
const MAX_DOCS = Number(process.env.MAX_DOCS ?? 160)
const TOPIC = /чрезвычайн|гражданск(ой|ая|ую) (защит|оборон)|пожар|спасат|аварийно|промышленн\S* безопасн|опасн\S* производствен|эвакуац|оповещен|государственн\S* материальн\S* резерв|медицин\S* катастроф|сейсм|паводк|наводнен|селе|лавин|радиац|химическ\S* опасн/i
fs.mkdirSync('out/texts', { recursive: true })
const save = (id, lang, text) => text && fs.writeFileSync(`out/texts/${id}.${lang}.txt.gz`, zlib.gzipSync(text))
const browser = await chromium.launch()
const page = await browser.newPage({ userAgent: 'termin-mchs-catalog-bot/1.0 (by a person\'s request; +https://termin-mchs.vercel.app)' })
const sleep = (ms) => new Promise((s) => setTimeout(s, ms))

async function read(id, lang) {
  const url = `https://adilet.zan.kz/${lang === 'ru' ? 'rus' : 'kaz'}/docs/${id}`
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForFunction(() => document.body.innerText.length > 3000, null, { timeout: 30000 }).catch(() => {})
    const text = await page.evaluate(() => document.body.innerText)
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href*="/docs/"]')].map((a) => a.getAttribute('href')))
    const title = await page.evaluate(() => (document.querySelector('h1')?.innerText || document.title || '').trim())
    await sleep(3000)
    return { url, text, links, title }
  } catch (e) {
    await sleep(3000)
    return { url, text: '', links: [], title: '', error: e.message }
  }
}

/** The point a position stands in: the nearest «N.» / «N)» paragraph start, and the article. */
function placeOf(text, at) {
  const before = text.slice(Math.max(0, at - 4000), at)
  const art = [...before.matchAll(/(?:^|\n)\s*(Статья|бап)\s+(\d+[\d-]*)/gi)].pop()
  const point = [...before.matchAll(/(?:^|\n)\s*(\d{1,3}(?:-\d)?)[.)]\s/g)].pop()
  return [art && `${art[1]} ${art[2]}`, point && `п. ${point[1]}`].filter(Boolean).join(', ')
}

const RU = /\(\s*(?:далее|далее по тексту)\s*[–—-]\s*([^()\n]{1,40}?)\s*\)/g
const KK = /\(\s*бұдан\s+әрі\s*[–—-]\s*([^()\n]{1,40}?)\s*\)/g
// A line of an abbreviation list: «ГПС – Государственная противопожарная служба;».
const LIST = /^[ \t]*([A-ZА-ЯЁӘҒҚҢӨҰҮҺІ][A-ZА-ЯЁӘҒҚҢӨҰҮҺІа-яёәғқңөұүһі0-9\-/]{1,12})[ \t]+[–—-][ \t]+([а-яёәғқңөұүһіA-Za-zА-ЯЁ«"][^\n]{5,200})$/gm
const isAbbr = (s) => /^[«"]?[A-ZА-ЯЁӘҒҚҢӨҰҮҺІ][A-ZА-ЯЁӘҒҚҢӨҰҮҺІа-яёәғқңөұүһі0-9\-–/ .]{0,16}[»"]?$/.test(s) && (s.match(/[A-ZА-ЯЁӘҒҚҢӨҰҮҺІ]/g) ?? []).length >= 2

const docs = []
const queue = [...SEED]
const seen = new Set()
while (queue.length && docs.length < MAX_DOCS) {
  const id = queue.shift()
  if (seen.has(id)) continue
  seen.add(id)
  const ru = await read(id, 'ru')
  if (!ru.text) {
    docs.push({ id, error: ru.error ?? 'пустая страница' })
    continue
  }
  if (!SEED.includes(id) && !TOPIC.test(ru.title + ' ' + ru.text.slice(0, 600))) continue
  const kk = await read(id, 'kk')
  const entries = []
  for (const [lang, d, re] of [['ru', ru, RU], ['kk', kk, KK]]) {
    for (const m of d.text.matchAll(re)) {
      const abbr = m[1].replace(/[«»"]/g, '').trim()
      if (!isAbbr(abbr)) continue
      entries.push({ lang, abbr, before: d.text.slice(Math.max(0, m.index - 260), m.index).replace(/\s+/g, ' ').trim(), place: placeOf(d.text, m.index), url: d.url })
    }
    for (const m of d.text.matchAll(LIST)) {
      if (!isAbbr(m[1])) continue
      entries.push({ lang, abbr: m[1], full: m[2].replace(/[;.,]\s*$/, '').trim(), kind: 'list', place: placeOf(d.text, m.index), url: d.url })
    }
  }
  save(id, 'ru', ru.text)
  save(id, 'kk', kk.text)
  docs.push({ id, title_ru: ru.title, title_kk: kk.title, url_ru: ru.url, url_kk: kk.url, chars: ru.text.length, entries })
  for (const href of ru.links) {
    const m = /\/docs\/([VZKPU][0-9A-Za-z_]{6,14})/.exec(href ?? '')
    if (m && !seen.has(m[1])) queue.push(m[1])
  }
}
await browser.close()
fs.writeFileSync('out/adilet.json', JSON.stringify(docs, null, 1))
const n = docs.reduce((a, d) => a + (d.entries?.length ?? 0), 0)
fs.writeFileSync('out/adilet-summary.md', `актов открыто: ${docs.length}, вводов сокращений: ${n}\n\n${docs.map((d) => `- ${d.id} ${d.error ? 'ОШИБКА ' + d.error : (d.title_ru || '').slice(0, 120) + ` — ${d.entries.length}`}`).join('\n')}\n`)
console.log(fs.readFileSync('out/adilet-summary.md', 'utf8'))
