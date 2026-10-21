// Checks the LIVE site in a real browser (run by .github/workflows/live-check.yml):
// every public page at desktop and phone width, the document check with the
// real AI on a test report, and — when TEST_EMAIL / TEST_PASSWORD secrets are
// set — sign-in and the account pages. Writes out/report.md and screenshots.
import { chromium } from 'playwright'
import fs from 'node:fs'

const SITE = process.env.SITE_URL || 'https://my-website-nu-eight-78.vercel.app'
const OUT = 'out'
fs.mkdirSync(`${OUT}/shots`, { recursive: true })
const lines = []
const log = (s) => {
  console.log(s)
  lines.push(s)
}

const PUBLIC = ['/', '/terms', '/category/evacuation', '/not-to-confuse', '/term-map', '/ministry', '/committees', '/documents', '/documents/check', '/quotes', '/quotes/1', '/account']
const ACCOUNT = ['/account', '/account/missions', '/account/terms', '/account/my-dictionary', '/account/workspace/create', '/account/workspace/catalog', '/account/workspace/documents', '/account/workspace/history', '/account/smart-report/new', '/account/statistics', '/account/settings']

const browser = await chromium.launch()

async function newPage(width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true, locale: 'ru-RU' })
  await ctx.addInitScript(() => localStorage.setItem('ai_consent_v1', 'always'))
  const page = await ctx.newPage()
  page.problems = []
  page.on('pageerror', (e) => page.problems.push(`JS: ${e.message.slice(0, 160)}`))
  page.on('console', (m) => m.type() === 'error' && page.problems.push(`console: ${m.text().slice(0, 160)}`))
  page.on('response', (r) => {
    const u = r.url()
    if (r.status() >= 400 && /supabase\.co|vercel\.app/.test(u)) page.problems.push(`HTTP ${r.status()} ${u.replace(/\?.*/, '').slice(0, 120)}`)
  })
  await page.goto(SITE + '/', { waitUntil: 'networkidle' }).catch(() => {})
  await page.getByText('РУС', { exact: true }).first().click().catch(() => {})
  return page
}

async function visit(page, path, width, name) {
  page.problems = []
  const t0 = Date.now()
  await page.goto(SITE + path, { waitUntil: 'networkidle', timeout: 45000 }).catch((e) => page.problems.push(`load: ${e.message.slice(0, 80)}`))
  await page.waitForTimeout(1500)
  const info = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, len: document.body.innerText.trim().length, path: location.pathname }))
  const issues = [...new Set(page.problems)]
  if (info.sw > width + 1) issues.push(`шире экрана: ${info.sw}px`)
  if (info.len < 80) issues.push(`почти пустая страница (${info.len} симв.)`)
  log(`| ${issues.length ? '❌' : '✅'} | ${width === 390 ? 'телефон' : 'компьютер'} | ${path}${info.path !== path ? ` → ${info.path}` : ''} | ${((Date.now() - t0) / 1000).toFixed(1)} с | ${issues.join('; ') || '—'} |`)
  if (name) await page.screenshot({ path: `${OUT}/shots/${name}.png`, fullPage: true })
}

log(`# Проверка живого сайта ${SITE}`)
log(`Время: ${new Date().toISOString()}\n`)
log('## Страницы\n\n| | Экран | Адрес | Загрузка | Замечания |\n|---|---|---|---|---|')
for (const width of [1440, 390]) {
  const page = await newPage(width)
  for (const path of PUBLIC) await visit(page, path, width, width === 1440 ? `page${path.replace(/\//g, '_') || '_home'}` : null)
  await page.context().close()
}

// ---- Search on the home page ------------------------------------------------
{
  const page = await newPage(1440)
  await page.fill('.hero-search-input', 'пожар').catch(() => {})
  await page.waitForTimeout(2500)
  const n = await page.locator('text=/пожар/i').count()
  log(`\n## Поиск на главной\n${n >= 3 ? '✅' : '❌'} «пожар»: совпадений на странице ${n}`)
  await page.context().close()
}

// ---- Document check with the real AI ------------------------------------------
{
  log('\n## Экспертиза документа (настоящий сервер и ИИ)')
  const page = await newPage(1440)
  const calls = []
  page.on('response', async (r) => {
    if (!r.url().includes('/functions/v1/doc-inspector')) return
    let body = ''
    try {
      body = await r.text()
    } catch {}
    let ai = ''
    try {
      const j = JSON.parse(body)
      ai = j.ai ? `ai=${j.ai.status}${j.ai.model ? ' ' + j.ai.model : ''}${j.ai.error ? ' ' + j.ai.error : ''}; результатов сервера ${j.results?.length ?? '—'}` : j.error || ''
    } catch {
      ai = body.slice(0, 80)
    }
    calls.push(`HTTP ${r.status()} ${ai}`)
  })
  await page.goto(SITE + '/documents/check', { waitUntil: 'networkidle' })
  const t0 = Date.now()
  await page.setInputFiles('input[type=file]', 'scripts/live-check/fire-report-with-errors.docx')
  await page.waitForTimeout(1500)
  await page.locator('.insp-btn--primary:not([disabled])').last().click()
  // Results, an error, or 170 s.
  await page
    .waitForFunction(() => document.querySelector('.insp-finding, .insp-tabs, [class*="insp-error"]') || /Экспертиза не выполнена|Результаты терминологической/.test(document.body.innerText), null, { timeout: 170000 })
    .catch(() => {})
  const toResults = page.locator('.insp-btn--primary', { hasText: /результат|Перейти|Открыть/i }).first()
  if (await toResults.count()) await toResults.click().catch(() => {})
  await page.waitForTimeout(2000)
  const secs = ((Date.now() - t0) / 1000).toFixed(0)
  const text = await page.evaluate(() => document.body.innerText)
  const tabs = (text.match(/(Все|Ошибки|Несоответствия|Требуют внимания|Неоднозначные|Соответствуют)\s*\n?\s*\d+/g) || []).map((s) => s.replace(/\s+/g, ' ')).join(', ')
  const notes = await page.locator('.insp-notes li').allInnerTexts().catch(() => [])
  const failed = /Экспертиза не выполнена/.test(text)
  log(`${failed ? '❌' : '✅'} за ${secs} с. ${failed ? 'Экспертиза не выполнена: ' + (text.match(/Экспертиза не выполнена\s*\n([^\n]+)/)?.[1] ?? '') : 'Вкладки: ' + tabs}`)
  log(`Ответы сервера: ${calls.join(' | ') || 'нет'}`)
  if (notes.length) log(`Пометки: ${notes.join(' / ')}`)
  await page.screenshot({ path: `${OUT}/shots/check-results.png`, fullPage: true })
  // AI findings are the ones not from the reference list: count cards whose basis is the base/AI.
  await page.context().close()
}

// ---- Account (only with a test account) --------------------------------------------
if (process.env.TEST_EMAIL && process.env.TEST_PASSWORD) {
  log('\n## Личный кабинет (тестовый аккаунт)')
  const page = await newPage(1440)
  await page.goto(SITE + '/account', { waitUntil: 'networkidle' })
  await page.fill('input[type=email]', process.env.TEST_EMAIL)
  await page.fill('input[type=password]', process.env.TEST_PASSWORD)
  await page.locator('button[type=submit]').first().click()
  await page.waitForTimeout(4000)
  const signedIn = !(await page.locator('input[type=password]').count())
  log(`${signedIn ? '✅' : '❌'} вход`)
  if (signedIn) {
    log('\n| | Экран | Адрес | Загрузка | Замечания |\n|---|---|---|---|---|')
    for (const path of ACCOUNT) await visit(page, path, 1440, `acc${path.replace(/\//g, '_')}`)
    // Smart report with the real AI.
    await page.goto(SITE + '/account/smart-report/new', { waitUntil: 'networkidle' })
    await page.fill('.report-textarea--source', 'Сегодня в 10:15 на складе по ул. Промышленная, 12 произошёл пожар. Караул прибыл в 10:22, пожар ликвидирован в 11:05. Пострадавших нет.')
    const t0 = Date.now()
    await page.locator('.report-btn--primary').first().click()
    await page.waitForFunction(() => /Шаг 2|Основные сведения|report-error/.test(document.body.innerText) && !/Выделяем сведения/.test(document.body.innerText), null, { timeout: 150000 }).catch(() => {})
    const err = await page.locator('.report-error').allInnerTexts().catch(() => [])
    log(`${err.length ? '❌' : '✅'} умный рапорт: выделение сведений за ${((Date.now() - t0) / 1000).toFixed(0)} с ${err.join(' ')} → ${page.url().replace(SITE, '')}`)
    await page.screenshot({ path: `${OUT}/shots/smart-report.png`, fullPage: true })
  }
  await page.context().close()
} else {
  log('\n## Личный кабинет\nНе проверен: не заданы секреты TEST_EMAIL / TEST_PASSWORD.')
}

await browser.close()
fs.writeFileSync(`${OUT}/report.md`, lines.join('\n') + '\n')
