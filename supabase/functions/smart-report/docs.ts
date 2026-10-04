// AI steps of «Конструктор профессиональной документации», without HTTP.
// The editor itself is generic (templates are client configuration), so
// every call carries the part of the template it needs: the catalog for
// `suggest`, the fields for `fill`, the rendered blocks for `check`.
//
//   suggestDocument  plain words → up to 3 document types from the given catalog
//   fillFields       description → field values, each with a verbatim quote
//   checkDocument    rendered document → remarks in 7 categories
//   readPhoto        photo of a document → text, unsure fragments marked
//
// Nothing the model returns reaches the user unchecked: a suggested type must
// be in the catalog, a field value must quote the description, a remark that
// changes text must quote that text. The model never invents facts, norms or
// templates — the prompts forbid it and the checks here drop what slips through.

import { callModel, InspectionError, type ImageMediaType } from '../doc-inspector/llm.ts'
import { callReportModel } from './model.ts'
import { basisOf, contextLines, documentRules, type KbEntry, queriesFrom, retrieve } from './kb.ts'
import { glossaryOrFail, type Lang, str, termsIn } from './pipeline.ts'

const bad = (message: string) => new InspectionError(400, 'bad_request', message)
const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_.]*$/
const MAX_TEXT = 8000
const MAX_FIELDS = 80
const MAX_BLOCKS = 120
const MAX_CONTEXT = 40

const langName = (lang: Lang) => (lang === 'kk' ? 'казахском' : 'русском')

// ---- suggest ------------------------------------------------------------------

const SUGGEST_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          why: { type: 'string' },
        },
        required: ['id', 'why'],
        additionalProperties: false,
      },
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
}

export async function suggestDocument(body: any, lang: Lang) {
  const query = str(body.query, 600)
  if (!query) throw bad('query is required')
  const catalog = (Array.isArray(body.catalog) ? body.catalog : [])
    .slice(0, 120)
    .map((c: any) => ({ id: str(c?.id, 60), title: str(c?.title, 160), purpose: str(c?.purpose, 300) }))
    .filter((c: any) => KEY_RE.test(c.id) && c.title)
  if (!catalog.length) throw bad('catalog is required')

  const { json: out, model } = await callReportModel({
    system: `Ты помогаешь сотруднику службы гражданской защиты Республики Казахстан выбрать вид служебного документа.
Выбирай ТОЛЬКО из каталога ниже (по id). Предложи от 1 до 3 видов, самый подходящий — первым.
why — одно-два предложения на ${langName(lang)} языке: почему этот документ подходит к описанной задаче.
Не утверждай, что документ является официально утверждённой формой. Не придумывай других видов документов.
Если ни один вид не подходит — пустой список.

КАТАЛОГ:
${catalog.map((c: any) => `${c.id} — ${c.title}. ${c.purpose}`).join('\n')}`,
    parts: [{ type: 'text', text: `Задача пользователя: «${query}»` }],
    schema: SUGGEST_SCHEMA,
    maxTokens: 1500,
  })
  const ids = new Set(catalog.map((c: any) => c.id))
  const suggestions = (Array.isArray(out?.suggestions) ? out.suggestions : [])
    .map((s: any) => ({ id: str(s?.id, 60), why: str(s?.why, 400) }))
    .filter((s: any, i: number, all: any[]) => ids.has(s.id) && all.findIndex((o: any) => o.id === s.id) === i)
    .slice(0, 3)
  return { suggestions, model }
}

// ---- fill ---------------------------------------------------------------------

const FILL_SCHEMA = {
  type: 'object',
  properties: {
    values: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
          quote: { type: 'string' },
        },
        required: ['key', 'value', 'quote'],
        additionalProperties: false,
      },
    },
  },
  required: ['values'],
  additionalProperties: false,
}

interface FieldSpec {
  key: string
  label: string
  type: string
  hint: string
  options: string[]
}

function parseFields(raw: unknown): FieldSpec[] {
  if (!Array.isArray(raw) || !raw.length || raw.length > MAX_FIELDS) throw bad('fields must be a non-empty array')
  const fields = raw.map((f: any) => ({
    key: str(f?.key, 60),
    label: str(f?.label, 160),
    type: str(f?.type, 20) || 'text',
    hint: str(f?.hint, 300),
    options: Array.isArray(f?.options) ? f.options.slice(0, 30).map((o: unknown) => str(o, 120)).filter(Boolean) : [],
  }))
  if (!fields.every((f) => KEY_RE.test(f.key) && f.label)) throw bad('bad field spec')
  return fields
}

const norm = (s: string) => s.toLowerCase().replace(/[«»"“”„]/g, '').replace(/\s+/g, ' ').trim()

export async function fillFields(body: any, lang: Lang) {
  const text = str(body.text, MAX_TEXT + 1)
  if (!text) throw bad('text is required')
  if (text.length > MAX_TEXT) throw new InspectionError(413, 'payload_too_large', `At most ${MAX_TEXT} characters`)
  const fields = parseFields(body.fields)
  const today = str(body.today, 20)

  const { json: out, model } = await callReportModel({
    system: `Ты распределяешь сведения из описания пользователя по полям служебного документа (гражданская защита, Республика Казахстан).
Документ: «${str(body.documentTitle, 160)}». Язык документа — ${langName(lang)}.

ГЛАВНОЕ ПРАВИЛО: заполняй поле ТОЛЬКО тем, что прямо сказано в описании. Никогда не придумывай фамилии, должности, звания, даты, время, адреса, количество людей и техники, обстоятельства, результаты, нормативные сведения.
Если сведений для поля нет — НЕ включай это поле в ответ.
quote — дословный фрагмент описания (несколько слов), из которого взято значение. Без цитаты значение не принимается.
value — значение для поля: для text/textarea — аккуратно сформулированный текст на ${langName(lang)} языке в официально-деловом стиле, без новых фактов;
для date — ДД.ММ.ГГГГ (если сказано «сегодня» — ${today || 'дата не известна, не заполняй'}); для time — ЧЧ:ММ; для number — только цифры;
для select/radio — одно из перечисленных вариантов дословно; для multiselect — варианты через «; »; для checkbox — «да» или пусто;
для table и repeating — строки через перевод строки, ячейки через « | ».

ПОЛЯ (key — название [тип]: подсказка; варианты):
${fields.map((f) => `${f.key} — ${f.label} [${f.type}]${f.hint ? `: ${f.hint}` : ''}${f.options.length ? `; варианты: ${f.options.join(' / ')}` : ''}`).join('\n')}`,
    parts: [{ type: 'text', text: `Описание пользователя:\n"""\n${text}\n"""` }],
    schema: FILL_SCHEMA,
    maxTokens: 6000,
  })

  // A value survives only with a quote that is really in the description.
  const source = norm(text)
  const byKey = new Map(fields.map((f) => [f.key, f]))
  const values: Array<{ key: string; value: string; quote: string }> = []
  for (const v of Array.isArray(out?.values) ? out.values : []) {
    const key = str(v?.key, 60)
    const field = byKey.get(key)
    const value = str(v?.value, 4000)
    const quote = str(v?.quote, 600)
    if (!field || !value || !quote || !source.includes(norm(quote))) continue
    if (field.options.length && ['select', 'radio'].includes(field.type) && !field.options.includes(value)) continue
    if (values.some((o) => o.key === key)) continue
    values.push({ key, value, quote })
  }
  const missing = fields.filter((f) => !values.some((v) => v.key === f.key)).map((f) => f.key)
  return { values, missing, model }
}

// ---- check --------------------------------------------------------------------

const CATEGORIES = ['critical', 'important', 'term', 'structure', 'language', 'logic', 'advice'] as const

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          target: { type: 'string' },
          was: { type: 'string' },
          now: { type: 'string' },
          title: { type: 'string' },
          reason: { type: 'string' },
          basis: { type: 'string' },
        },
        required: ['category', 'target', 'was', 'now', 'title', 'reason', 'basis'],
        additionalProperties: false,
      },
    },
  },
  required: ['issues'],
  additionalProperties: false,
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The fragment of `text` a remark quotes, as written there ('' if absent). */
function locate(text: string, quote: string): string {
  if (!text || !quote) return ''
  if (text.includes(quote)) return quote
  const words = quote.split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const m = text.match(new RegExp(words.map(escapeRe).join('\\s+')))
  return m ? m[0] : ''
}

export async function checkDocument(body: any, lang: Lang) {
  const blocks = new Map<string, { label: string; text: string }>()
  for (const b of Array.isArray(body.blocks) ? body.blocks.slice(0, MAX_BLOCKS) : []) {
    const key = str(b?.key, 60)
    const text = str(b?.text, 6000)
    if (KEY_RE.test(key) && text) blocks.set(key, { label: str(b?.label, 160), text })
  }
  if (!blocks.size) throw bad('nothing to check')
  const allText = [...blocks.values()].map((b) => b.text).join('\n')

  const [glossary, found, rules] = await Promise.all([glossaryOrFail(), retrieve(queriesFrom([allText])), documentRules()])
  const kb = found.entries.slice(0, MAX_CONTEXT)

  const { json: out, model } = await callReportModel({
    system: `Ты — редактор служебных документов гражданской защиты Республики Казахстан. Проверь документ «${str(body.documentTitle, 160)}» на ${langName(lang)} языке.
Документ разбит на блоки: [key] название поля — текст.

Проверь: терминологию, орфографию, грамматику, пунктуацию, официально-деловой стиль, структуру, реквизиты, даты, время, числовые данные, логическую последовательность, противоречия, повторы, недостающие сведения.
Каждое замечание — отдельный элемент issues; category строго одна из:
- critical — критическая ошибка (документ нельзя подписывать: противоречивые числа, дата в будущем, отсутствует обязательная часть);
- important — важное замечание;
- term — терминологическая ошибка: бытовое слово вместо термина из КОНТЕКСТА БАЗЫ ЗНАНИЙ ниже (basis = его номер [K…]); если термина в контексте нет — не предлагай замену;
- structure — структурное замечание (порядок, недостающий раздел, лишний повтор);
- language — языковая ошибка (орфография, грамматика, пунктуация, стиль);
- logic — логическое противоречие (время, последовательность, числа);
- advice — рекомендация.
target — key блока. was — ДОСЛОВНЫЙ фрагмент текста этого блока (несколько слов), который нужно исправить; now — тот же фрагмент исправленный.
Если замечание нельзя исправить заменой слов (противоречие, недостающие сведения) — was и now пустые.
НЕ добавляй новых фактов: в now нельзя вписывать фамилии, даты, числа, адреса, которых нет в документе. Не придумывай нормативных документов и требований: ссылаться можно только на записи контекста (basis = [K…] или [R…], иначе пусто).
Не утверждай, что документ юридически действителен или соответствует официальной форме.
title — коротко (до 8 слов), reason — пояснение. Оба на ${langName(lang)} языке. Пиши только о реальных проблемах; если их нет — пустой список.

ПРАВИЛА ОФОРМЛЕНИЯ СЛУЖЕБНЫХ ДОКУМЕНТОВ:
${contextLines(rules, lang, 'R') || '—'}

КОНТЕКСТ БАЗЫ ЗНАНИЙ МЧС РК:
${contextLines(kb, lang) || '— ничего не найдено —'}`,
    parts: [{ type: 'text', text: [...blocks].map(([k, b]) => `[${k}] ${b.label}\n${b.text}`).join('\n\n') }],
    schema: CHECK_SCHEMA,
    maxTokens: 8000,
  })

  const entryOf = (ref: unknown): KbEntry | null => {
    const m = /^\s*\[?([KR])(\d+)\]?\s*$/i.exec(str(ref, 12))
    if (!m) return null
    return (m[1].toUpperCase() === 'K' ? kb : rules)[Number(m[2]) - 1] ?? null
  }
  const seen = new Set<string>()
  const issues = (Array.isArray(out?.issues) ? out.issues : [])
    .map((i: any) => {
      const target = str(i?.target, 60)
      const block = blocks.get(target)
      const was = block ? locate(block.text, str(i?.was, 700)) : ''
      const now = was ? str(i?.now, 700) : ''
      const entry = entryOf(i?.basis)
      const category = (CATEGORIES as readonly string[]).includes(str(i?.category, 20)) ? str(i?.category, 20) : 'advice'
      return {
        category,
        target: block ? target : '',
        was,
        now,
        title: str(i?.title, 200),
        reason: str(i?.reason, 800),
        basis: entry ? basisOf(entry) : null,
        // A terminology fix not backed by an official base entry is only a suggestion.
        confirmed: entry && entry.status === 'official' ? 'base' : category === 'term' ? 'needs_review' : null,
      }
    })
    .filter((i: any) => {
      if (!i.title || (i.was && i.was === i.now)) return false
      const key = `${i.target}|${i.was}|${i.title}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 50)

  // Base terms in the text — deterministic, no AI.
  const terms = termsIn(allText, glossary, lang)
  return { issues, ...terms, knowledge: { mode: found.mode, retrieved: kb.length }, model }
}

// ---- photo --------------------------------------------------------------------

const OCR_SCHEMA = {
  type: 'object',
  properties: {
    lines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          sure: { type: 'boolean' },
        },
        required: ['text', 'sure'],
        additionalProperties: false,
      },
    },
    lang: { type: 'string' },
  },
  required: ['lines', 'lang'],
  additionalProperties: false,
}

const IMAGE_TYPES: ImageMediaType[] = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BASE64 = 7_000_000

export async function readPhoto(body: any) {
  const mediaType = str(body.mediaType, 20) as ImageMediaType
  const data = typeof body.data === 'string' ? body.data : ''
  if (!IMAGE_TYPES.includes(mediaType) || !data) throw bad('image is required')
  if (data.length > MAX_IMAGE_BASE64) throw new InspectionError(413, 'payload_too_large', 'Image too large')

  const { json: out, model } = await callModel({
    system: `Распознай текст служебного документа на фотографии (казахский или русский язык).
Верни строки документа по порядку, абзац — одна строка. sure = false, если строку (или её часть) нельзя прочитать уверенно:
тогда НЕ угадывай — замени нечитаемые слова на «[…]». Если часть строки закрыта, размыта, обрезана или залита — НЕ восстанавливай её по смыслу, даже если догадка кажется очевидной: цифры, время, даты, фамилии и числа людей нельзя достраивать.
Ничего не исправляй и не дополняй: только то, что действительно видно на фото.
lang — «kk» или «ru».`,
    parts: [
      { type: 'image', mediaType, data },
      { type: 'text', text: 'Распознай текст документа.' },
    ],
    schema: OCR_SCHEMA,
    maxTokens: 8000,
  })
  const lines = (Array.isArray(out?.lines) ? out.lines : [])
    .slice(0, 400)
    // «[...]» and «[…]» both mark words that could not be read.
    .map((l: any) => {
      const text = str(l?.text, 2000).replace(/\[(?:\.\.\.|…)\]/g, '[…]')
      return { text, sure: l?.sure !== false && !text.includes('[…]') }
    })
    .filter((l: any) => l.text)
  return { lines, lang: out?.lang === 'kk' ? 'kk' : 'ru', model }
}
