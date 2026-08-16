import { useCallback, useEffect, useRef, useState } from 'react'
import { Bot, X, Send, Copy, Check, RotateCcw, Trash2, Sparkles } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { askAssistant, RateLimitError } from '../../ai/aiClient'
import './AIAssistant.css'

const STORAGE_KEY = 'cd_ai_chat_history'
let msgIdCounter = 0
const nextId = () => `m${Date.now()}_${++msgIdCounter}`

// Assistant replies come back as Markdown (the LLM isn't told not to use it),
// so bold/headings/lists need real rendering — otherwise users see literal
// **/#/- characters. Deliberately small and dependency-free: bold, italic,
// inline code, headings, and (un)ordered lists cover what the model actually
// produces here.
function renderInline(text, keyPrefix) {
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  const parts = []
  let lastIndex = 0
  let match
  let i = 0
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const token = match[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={`${keyPrefix}-${i++}`}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('`')) {
      parts.push(<code key={`${keyPrefix}-${i++}`}>{token.slice(1, -1)}</code>)
    } else {
      parts.push(<em key={`${keyPrefix}-${i++}`}>{token.slice(1, -1)}</em>)
    }
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

function renderMarkdown(content) {
  const blocks = []
  let list = null

  const flushList = () => {
    if (!list) return
    const ListTag = list.type
    blocks.push(
      <ListTag key={`list-${blocks.length}`} className="ai-md-list">
        {list.items.map((item, idx) => (
          <li key={idx}>{renderInline(item, `li-${blocks.length}-${idx}`)}</li>
        ))}
      </ListTag>,
    )
    list = null
  }

  content.split('\n').forEach((rawLine, idx) => {
    const line = rawLine.trim()
    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    const ul = line.match(/^[-*]\s+(.*)$/)
    const ol = line.match(/^\d+\.\s+(.*)$/)

    if (heading) {
      flushList()
      const HeadingTag = `h${Math.min(heading[1].length + 3, 6)}`
      blocks.push(
        <HeadingTag key={`h-${idx}`} className="ai-md-heading">
          {renderInline(heading[2], `h-${idx}`)}
        </HeadingTag>,
      )
    } else if (ul) {
      if (!list || list.type !== 'ul') {
        flushList()
        list = { type: 'ul', items: [] }
      }
      list.items.push(ul[1])
    } else if (ol) {
      if (!list || list.type !== 'ol') {
        flushList()
        list = { type: 'ol', items: [] }
      }
      list.items.push(ol[1])
    } else if (line === '') {
      flushList()
    } else {
      flushList()
      blocks.push(
        <p key={`p-${idx}`} className="ai-md-p">
          {renderInline(line, `p-${idx}`)}
        </p>,
      )
    }
  })
  flushList()
  return blocks
}

function loadStoredMessages() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function makeWelcomeMessage(text) {
  return { id: nextId(), role: 'assistant', content: text, timestamp: Date.now(), isWelcome: true }
}

function AIAssistant() {
  const { lang, t } = useLanguage()
  const a = t.assistant

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(loadStoredMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const listRef = useRef(null)
  const textareaRef = useRef(null)
  const lastMessageRef = useRef(null)

  // Seed the welcome message the first time the widget is opened.
  useEffect(() => {
    if (open) {
      setMessages((current) => (current.length === 0 ? [makeWelcomeMessage(a.welcomeMessage)] : current))
    }
  }, [open, a.welcomeMessage])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch {
      /* storage unavailable (private mode, quota, etc.) — chat still works this session */
    }
  }, [messages])

  useEffect(() => {
    // Scroll so the START of the newest message is visible, not its end —
    // long replies would otherwise land the view on their last line, making
    // the user scroll back up to read from the top.
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ block: 'start', behavior: 'auto' })
    } else if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, loading])

  useEffect(() => {
    if (!open) return undefined
    const timer = setTimeout(() => textareaRef.current?.focus(), 220)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    document.documentElement.classList.toggle('ai-chat-open', open)
    return () => document.documentElement.classList.remove('ai-chat-open')
  }, [open])

  // Auto-grow the textarea up to a max height (CSS caps it, this just
  // keeps scrollHeight in sync so it doesn't stay clipped at one line).
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [input])

  const runAssistant = useCallback(
    async (userMessage, historyBase) => {
      setLoading(true)
      // historyBase's last entry is always the current turn (already appended
      // by the caller) — drop it here since askAssistant sends it separately
      // as `message`; otherwise it would reach the LLM twice in a row.
      const historyForApi = historyBase
        .slice(0, -1)
        .filter((m) => !m.isWelcome && !m.isError)
        .map((m) => ({ role: m.role, content: m.content }))

      try {
        const { reply, found } = await askAssistant({ message: userMessage, history: historyForApi })
        const content = found ? reply : a.notFound
        setMessages((current) => [
          ...current,
          { id: nextId(), role: 'assistant', content, timestamp: Date.now() },
        ])
      } catch (err) {
        const content = err instanceof RateLimitError ? a.rateLimited : a.errorMessage
        setMessages((current) => [
          ...current,
          { id: nextId(), role: 'assistant', content, timestamp: Date.now(), isError: true },
        ])
      } finally {
        setLoading(false)
      }
    },
    [a.notFound, a.errorMessage, a.rateLimited],
  )

  const handleSend = useCallback(() => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { id: nextId(), role: 'user', content: text, timestamp: Date.now() }
    const next = [...messages, userMsg]
    setInput('')
    setMessages(next)
    runAssistant(text, next)
  }, [input, loading, messages, runAssistant])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleRegenerate = useCallback(() => {
    if (loading) return
    const reversedIdx = [...messages].reverse().findIndex((m) => m.role === 'user')
    if (reversedIdx === -1) return
    const idx = messages.length - 1 - reversedIdx
    const lastUserMessage = messages[idx].content
    const trimmed = messages.slice(0, idx + 1)
    setMessages(trimmed)
    runAssistant(lastUserMessage, trimmed)
  }, [loading, messages, runAssistant])

  const handleClear = useCallback(() => {
    if (!window.confirm(a.clearConfirm)) return
    setMessages([makeWelcomeMessage(a.welcomeMessage)])
  }, [a.clearConfirm, a.welcomeMessage])

  const handleCopy = useCallback((msg) => {
    if (!navigator.clipboard) return
    navigator.clipboard
      .writeText(msg.content)
      .then(() => {
        setCopiedId(msg.id)
        setTimeout(() => setCopiedId((current) => (current === msg.id ? null : current)), 1600)
      })
      .catch(() => {})
  }, [])

  const formatTime = useCallback(
    (ts) =>
      new Intl.DateTimeFormat(lang === 'kk' ? 'kk-KZ' : 'ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(ts),
    [lang],
  )

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant' && !m.isWelcome)?.id

  return (
    <div className="ai-widget">
      <div className={`ai-window${open ? ' open' : ''}`} role="dialog" aria-modal="false" aria-label={a.name} inert={!open}>
        <div className="ai-window-header">
          <div className="ai-header-identity">
            <span className="ai-avatar">
              <Sparkles size={18} aria-hidden="true" />
            </span>
            <div className="ai-header-text">
              <span className="ai-header-name">{a.name}</span>
              <span className="ai-header-status">
                <span className="ai-status-dot" aria-hidden="true"></span>
                {a.online}
              </span>
            </div>
          </div>
          <div className="ai-header-actions">
            <button
              type="button"
              className="ai-icon-btn"
              onClick={handleClear}
              title={a.clearChat}
              aria-label={a.clearChat}
            >
              <Trash2 size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="ai-icon-btn"
              onClick={() => setOpen(false)}
              aria-label={a.closeAria}
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="ai-messages" ref={listRef}>
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              ref={idx === messages.length - 1 ? lastMessageRef : null}
              className={`ai-message-row ai-message-${msg.role}`}
            >
              <div className={`ai-bubble ai-bubble-${msg.role}${msg.isError ? ' ai-bubble-error' : ''}`}>
                <div className="ai-bubble-text">
                  {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
                </div>
                <div className="ai-bubble-meta">
                  <span className="ai-bubble-time">{formatTime(msg.timestamp)}</span>
                  {msg.role === 'assistant' && !msg.isWelcome && (
                    <span className="ai-bubble-actions">
                      <button
                        type="button"
                        className="ai-bubble-action"
                        onClick={() => handleCopy(msg)}
                        title={a.copy}
                        aria-label={a.copy}
                      >
                        {copiedId === msg.id ? (
                          <Check size={13} aria-hidden="true" />
                        ) : (
                          <Copy size={13} aria-hidden="true" />
                        )}
                      </button>
                      {msg.id === lastAssistantId && !loading && (
                        <button
                          type="button"
                          className="ai-bubble-action"
                          onClick={handleRegenerate}
                          title={a.regenerate}
                          aria-label={a.regenerate}
                        >
                          <RotateCcw size={13} aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="ai-message-row ai-message-assistant">
              <div className="ai-bubble ai-bubble-assistant ai-bubble-typing" aria-label={a.typing}>
                <span className="ai-typing-dot"></span>
                <span className="ai-typing-dot"></span>
                <span className="ai-typing-dot"></span>
              </div>
            </div>
          )}
        </div>

        <div className="ai-input-row">
          <textarea
            ref={textareaRef}
            className="ai-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={a.placeholder}
          />
          <button
            type="button"
            className="ai-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            aria-label={a.sendAria}
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <button
        type="button"
        className={`ai-fab${open ? ' open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? a.closeAria : a.openAria}
        aria-expanded={open}
      >
        <Bot size={24} className="ai-fab-icon ai-fab-icon-bot" aria-hidden="true" />
        <X size={22} className="ai-fab-icon ai-fab-icon-close" aria-hidden="true" />
      </button>
    </div>
  )
}

export default AIAssistant
