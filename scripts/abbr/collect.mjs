// Collects candidate abbreviations for the civil-protection catalog:
//   1. emle.kz — every letter page of the Kazakh abbreviations catalog
//      (robots.txt: none; one request per second; identified bot);
//   2. adilet.zan.kz — Russian and Kazakh texts of key civil-protection acts
//      and of the civil-protection acts they link to: every abbreviation an
//      act introduces as «(далее – X)» / «(бұдан әрі – X)», with the words
//      before it (the full name is in them).
// Output: out/emle.json, out/adilet.json, out/summary.md. Nothing is
// written anywhere else; selection and checking happen afterwards.
import fs from 'node:fs'

const UA = 'termin-mchs-catalog-bot/1.0 (+https://termin-mchs.vercel.app)'
fs.mkdirSync('out', { recursive: true })
const sleep = (ms) => new Promise((s) => setTimeout(s, ms))
async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } })
      const text = await r.text()
      await sleep(1000)
      if (r.ok) return text
      if (r.status === 404) return null
    } catch {}
    await sleep(3000)
  }
  return null
}
const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&ndash;|&mdash;/g, '–').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim()

// ---- 1. emle.kz -------------------------------------------------------------
const LETTERS = 'А Ә Б В Г Ғ Д Е Ё Ж З И Й К Қ Л М Н Ң О Ө П Р С Т У Ұ Ү Ф Х Һ Ц Ч Ш Щ Ъ Ы І Ь Э Ю Я'.split(' ')
const emle = []
const perLetter = {}
for (const letter of LETTERS) {
  const url = `https://emle.kz/kz/abbreviations/${encodeURIComponent(letter)}`
  const html = await get(url)
  if (!html) {
    perLetter[letter] = 'нет ответа'
    continue
  }
  let n = 0
  for (const m of html.matchAll(/<div class="d-flex">\s*<p>([\s\S]*?)<\/p>\s*<div>([\s\S]*?)<\/div>/g)) {
    const abbr = clean(m[1])
    const full = clean(m[2]).replace(/^[–—-]\s*/, '')
    if (abbr && full) {
      emle.push({ abbr, full, letter, url: `https://emle.kz/kz/abbreviations/${letter}` })
      n++
    }
  }
  perLetter[letter] = n
}
fs.writeFileSync('out/emle.json', JSON.stringify(emle, null, 1))

// ---- 2. adilet.zan.kz -------------------------------------------------------------
const SEED = ['Z1400000188', 'V1700015430', 'V2100024045', 'Z030000387_', 'V14C0010151']
const TOPIC = /чрезвычайн|гражданск(ой|ая) (защит|оборон)|пожар|спасат|аварийно|өрт|төтенше|азаматтық қорға|құтқару|промышленн(ой|ая) безопасн|өнеркәсіптік қауіпсіз/i
const docs = new Map() // id -> { title_ru, title_kk }
const adilet = []
const queue = [...SEED]
const seen = new Set()
const MAX_DOCS = 45
while (queue.length && docs.size < MAX_DOCS) {
  const id = queue.shift()
  if (seen.has(id)) continue
  seen.add(id)
  const ru = await get(`https://adilet.zan.kz/rus/docs/${id}`)
  if (!ru) continue
  const titleRu = clean(ru.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? ru.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? id)
  const isSeed = SEED.includes(id)
  if (!isSeed && !TOPIC.test(titleRu)) continue
  const kk = await get(`https://adilet.zan.kz/kaz/docs/${id}`)
  const titleKk = kk ? clean(kk.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '') : ''
  docs.set(id, { title_ru: titleRu, title_kk: titleKk })
  for (const [lang, html] of [['ru', ru], ['kk', kk]]) {
    if (!html) continue
    const text = clean(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' '))
    const re = lang === 'ru' ? /\(\s*далее\s*[–—-]\s*([^()]{1,40}?)\s*\)/g : /\(\s*бұдан\s+әрі\s*[–—-]\s*([^()]{1,40}?)\s*\)/g
    for (const m of text.matchAll(re)) {
      const abbr = m[1].replace(/[«»"]/g, '').trim()
      // Abbreviations only: mostly capitals, short.
      if (!/^[A-ZА-ЯЁӘҒҚҢӨҰҮҺІ][A-ZА-ЯЁӘҒҚҢӨҰҮҺІа-яёәғқңөұүһі0-9\-–/ ]{0,14}$/.test(abbr) || (abbr.match(/[A-ZА-ЯЁӘҒҚҢӨҰҮҺІ]/g) ?? []).length < 2) continue
      adilet.push({ doc: id, lang, abbr, before: text.slice(Math.max(0, m.index - 220), m.index).trim(), url: `https://adilet.zan.kz/${lang === 'ru' ? 'rus' : 'kaz'}/docs/${id}` })
    }
  }
  // Acts this one links to.
  for (const m of ru.matchAll(/\/rus\/docs\/([VZKPU][0-9A-Za-z_]{6,14})/g)) if (!seen.has(m[1])) queue.push(m[1])
}
fs.writeFileSync('out/adilet.json', JSON.stringify({ docs: Object.fromEntries(docs), entries: adilet }, null, 1))

fs.writeFileSync(
  'out/summary.md',
  `# Сбор аббревиатур ${new Date().toISOString()}\n\nemle.kz: ${emle.length} записей\n\n${Object.entries(perLetter).map(([l, n]) => `${l}: ${n}`).join(', ')}\n\nadilet: ${docs.size} актов, ${adilet.length} вводов сокращений\n\n${[...docs].map(([id, d]) => `- ${id} ${d.title_ru.slice(0, 140)}`).join('\n')}\n`,
)
console.log(fs.readFileSync('out/summary.md', 'utf8'))
