// Supabase function logs for the time of the live check: HTTP status and
// execution time of doc-inspector calls, and the function's own warnings
// and platform events (boot, shutdown, limits). Messages are filtered to
// known service lines, so document text never gets into the report.
// Needs SUPABASE_ACCESS_TOKEN (the secret the deploy workflows use).
import fs from 'node:fs'

const REF = 'znfuaxqpvdpvjrtmiupj'
const token = process.env.SUPABASE_ACCESS_TOKEN
const out = ['\n## Журнал сервера (последние 30 минут)']
if (!token) {
  out.push('Нет SUPABASE_ACCESS_TOKEN.')
} else {
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 60 * 1000)
  const query = async (sql) => {
    const u = new URL(`https://api.supabase.com/v1/projects/${REF}/analytics/endpoints/logs.all`)
    u.searchParams.set('sql', sql)
    u.searchParams.set('iso_timestamp_start', start.toISOString())
    u.searchParams.set('iso_timestamp_end', end.toISOString())
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } })
    const j = await r.json().catch(() => ({}))
    if (!r.ok || j.error) throw new Error(`${r.status} ${JSON.stringify(j.error ?? j).slice(0, 200)}`)
    return j.result ?? []
  }
  const time = (us) => new Date(Number(us) / 1000).toISOString().slice(11, 19)
  try {
    const rows = await query(
      "select timestamp, response.status_code as status, m.execution_time_ms as ms, request.url as url from function_edge_logs cross join unnest(metadata) as m cross join unnest(m.response) as response cross join unnest(m.request) as request order by timestamp desc limit 40",
    )
    out.push('\n| Время (UTC) | Функция | HTTP | Длительность |\n|---|---|---|---|')
    for (const r of rows.filter((r) => /doc-inspector|smart-report/.test(r.url))) {
      out.push(`| ${time(r.timestamp)} | ${r.url.match(/functions\/v1\/([\w-]+)/)?.[1]} | ${r.status} | ${(Number(r.ms) / 1000).toFixed(1)} с |`)
    }
  } catch (e) {
    out.push(`Журнал вызовов недоступен: ${e.message}`)
  }
  try {
    const rows = await query(
      'select timestamp, event_message, metadata.event_type as type, metadata.level as level from function_logs cross join unnest(metadata) as metadata order by timestamp desc limit 200',
    )
    const SAFE = /falling back|AI error|did not answer|unavailable|quota|Gemini|shutdown|boot|CPU|memory|wall ?clock|limit|timeout|exceeded|InspectionError|glossary/i
    const shown = rows
      .filter((r) => r.type !== 'log' || SAFE.test(r.event_message))
      .map((r) => `- ${time(r.timestamp)} ${r.type ?? ''} ${r.level ?? ''}: ${String(r.event_message).replace(/\s+/g, ' ').replace(/«[^»]{30,}»/g, '«…»').slice(0, 220)}`)
    out.push('\n### События функции', ...(shown.length ? shown.slice(0, 40) : ['— нет']))
  } catch (e) {
    out.push(`Журнал функции недоступен: ${e.message}`)
  }
}
fs.mkdirSync('out', { recursive: true })
fs.appendFileSync('out/report.md', out.join('\n') + '\n')
console.log(out.join('\n'))
