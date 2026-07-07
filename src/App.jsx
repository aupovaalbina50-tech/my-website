import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

const DELETE_PASSWORD = 'termincom2026'
const AUDIO_BUCKET = 'term-audio'

async function uploadAudio(file) {
  const ext = file.name.split('.').pop()
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(AUDIO_BUCKET).upload(path, file)
  if (error) throw error
  const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function PlayButton({ src, label }) {
  if (!src) return null
  return (
    <button
      type="button"
      className="btn-play"
      onClick={() => new Audio(src).play()}
      aria-label={`Прослушать произношение: ${label}`}
      title="Прослушать произношение"
    >
      🔊
    </button>
  )
}

function speakText(text, lang) {
  if (!text || !('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  const voices = window.speechSynthesis.getVoices()
  const voice =
    voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)))
  if (voice) utterance.voice = voice
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

function AiSpeakButton({ text, lang }) {
  if (!text) return null
  return (
    <button
      type="button"
      className="btn-ai-play"
      onClick={() => speakText(text, lang)}
      aria-label={`Озвучить автоматически: ${text}`}
      title="Озвучить автоматически (ИИ, без записи диктора)"
    >
      🤖
    </button>
  )
}

const TABS = [
  { id: 'search', label: 'Іздеу' },
  { id: 'add', label: 'Термин қосу' },
  { id: 'quotes', label: 'Мәлік Ғабдуллин нақыл сөздері' },
  { id: 'ministry', label: 'Төтенше жағдайлар министрлігі' },
  { id: 'docs', label: 'Құжаттама' },
]

const CATEGORIES = [
  'Чрезвычайные ситуации',
  'Гражданская оборона',
  'Пожарная безопасность',
  'Аварийно-спасательные работы',
  'Промышленная безопасность',
  'Медицина катастроф',
  'Эвакуация',
  'Оповещение и связь',
  'Государственный резерв',
  'Управление и координация',
]

function App() {
  const [activeTab, setActiveTab] = useState('search')
  const [terms, setTerms] = useState([])
  const [form, setForm] = useState({ ru: '', kk: '', en: '', category: '' })
  const [audioFiles, setAudioFiles] = useState({ ru: null, kk: null, en: null })
  const [fileInputKey, setFileInputKey] = useState(0)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ ru: '', kk: '', en: '', category: '' })

  const fetchTerms = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('terms')
      .select('id, ru, kk, en, category, audio_ru, audio_kk, audio_en')
      .order('ru', { ascending: true })

    if (error) {
      setError('Не удалось загрузить термины. Проверьте подключение.')
    } else {
      setError('')
      setTerms(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTerms()
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    const ru = form.ru.trim()
    const kk = form.kk.trim()
    const en = form.en.trim()
    const category = form.category
    if (!ru && !kk && !en) return

    setSaving(true)
    try {
      const [audio_ru, audio_kk, audio_en] = await Promise.all([
        audioFiles.ru ? uploadAudio(audioFiles.ru) : null,
        audioFiles.kk ? uploadAudio(audioFiles.kk) : null,
        audioFiles.en ? uploadAudio(audioFiles.en) : null,
      ])

      const { error } = await supabase
        .from('terms')
        .insert({ ru, kk, en, category, audio_ru, audio_kk, audio_en })
      if (error) throw error

      setError('')
      setForm({ ru: '', kk: '', en: '', category: '' })
      setAudioFiles({ ru: null, kk: null, en: null })
      setFileInputKey((k) => k + 1)
      await fetchTerms()
    } catch {
      setError('Не удалось добавить термин. Попробуйте ещё раз.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (term) => {
    const label = term.ru || term.kk || term.en
    if (!window.confirm(`Удалить термин "${label}"? Это действие нельзя отменить.`)) {
      return
    }
    const password = window.prompt('Введите пароль для удаления термина:')
    if (password === null) return
    if (password !== DELETE_PASSWORD) {
      setError('Неверный пароль. Термин не удалён.')
      return
    }

    const { error } = await supabase.from('terms').delete().eq('id', term.id)
    if (error) {
      setError('Не удалось удалить термин. Попробуйте ещё раз.')
      return
    }
    setError('')
    await fetchTerms()
  }

  const handleEditStart = (term) => {
    setEditingId(term.id)
    setEditForm({ ru: term.ru, kk: term.kk, en: term.en, category: term.category || '' })
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditForm({ ru: '', kk: '', en: '', category: '' })
  }

  const handleEditSave = async (id) => {
    const ru = editForm.ru.trim()
    const kk = editForm.kk.trim()
    const en = editForm.en.trim()
    const category = editForm.category
    if (!ru && !kk && !en) return

    const { error } = await supabase
      .from('terms')
      .update({ ru, kk, en, category })
      .eq('id', id)

    if (error) {
      setError('Не удалось сохранить изменения. Попробуйте ещё раз.')
      return
    }
    setError('')
    setEditingId(null)
    await fetchTerms()
  }

  const visibleTerms = useMemo(() => {
    const query = search.trim().toLowerCase()
    let filtered = query
      ? terms.filter(
          (term) =>
            term.ru.toLowerCase().includes(query) ||
            term.kk.toLowerCase().includes(query) ||
            term.en.toLowerCase().includes(query),
        )
      : terms

    if (categoryFilter) {
      filtered = filtered.filter((term) => term.category === categoryFilter)
    }

    return [...filtered].sort((a, b) =>
      a.ru.localeCompare(b.ru, 'ru') ||
      a.kk.localeCompare(b.kk, 'ru') ||
      a.en.localeCompare(b.en, 'en'),
    )
  }, [terms, search, categoryFilter])

  return (
    <>
      <header className="site-nav">
        <nav className="tabs" aria-label="Разделы сайта">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-btn${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="page-header">
        <h1>Азаматтық қорғау саласының кәсіби терминологиясы</h1>
        <p>Русский &middot; Қазақша &middot; English</p>
      </div>

      {error && <div className="alert">{error}</div>}

      {activeTab === 'search' && (
        <section className="hero-search">
          <input
            type="search"
            className="hero-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Введите термин на русском, казахском или английском..."
            aria-label="Поиск термина"
            autoFocus
          />
          <p className="hero-search-hint">
            {search.trim()
              ? `Найдено: ${visibleTerms.length}`
              : `Всего терминов в словаре: ${terms.length}`}
          </p>
        </section>
      )}

      {activeTab === 'add' && (
      <section className="card">
        <h2>Добавить термин</h2>
        <form className="term-form" onSubmit={handleAdd}>
          <div className="field">
            <label htmlFor="ru">Русский</label>
            <input
              id="ru"
              type="text"
              value={form.ru}
              onChange={(e) => setForm({ ...form, ru: e.target.value })}
              placeholder="например, эвакуация"
            />
            <input
              key={`audio-ru-${fileInputKey}`}
              type="file"
              accept="audio/*"
              className="audio-input"
              onChange={(e) =>
                setAudioFiles({ ...audioFiles, ru: e.target.files[0] || null })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="kk">Қазақша</label>
            <input
              id="kk"
              type="text"
              value={form.kk}
              onChange={(e) => setForm({ ...form, kk: e.target.value })}
              placeholder="мысалы, эвакуация"
            />
            <input
              key={`audio-kk-${fileInputKey}`}
              type="file"
              accept="audio/*"
              className="audio-input"
              onChange={(e) =>
                setAudioFiles({ ...audioFiles, kk: e.target.files[0] || null })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="en">English</label>
            <input
              id="en"
              type="text"
              value={form.en}
              onChange={(e) => setForm({ ...form, en: e.target.value })}
              placeholder="e.g. evacuation"
            />
            <input
              key={`audio-en-${fileInputKey}`}
              type="file"
              accept="audio/*"
              className="audio-input"
              onChange={(e) =>
                setAudioFiles({ ...audioFiles, en: e.target.files[0] || null })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="category">Категория</label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Без категории</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-add" disabled={saving}>
            {saving ? 'Добавление...' : 'Добавить термин'}
          </button>
        </form>
      </section>
      )}

      {activeTab === 'search' && (
      <section className="card">
        <div className="table-toolbar">
          <h2>Термины ({terms.length})</h2>
          <select
            className="category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Фильтр по категории"
          >
            <option value="">Все категории</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="table-wrap">
          <table className="terms-table">
            <thead>
              <tr>
                <th>Русский</th>
                <th>Қазақша</th>
                <th>English</th>
                <th>Категория</th>
                <th className="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="empty-state" colSpan={5}>
                    Загрузка...
                  </td>
                </tr>
              )}
              {!loading && visibleTerms.length === 0 && (
                <tr>
                  <td className="empty-state" colSpan={5}>
                    {terms.length === 0
                      ? 'Терминов пока нет. Добавьте первый термин выше.'
                      : 'Ничего не найдено.'}
                  </td>
                </tr>
              )}
              {!loading &&
                visibleTerms.map((term) => {
                  const isEditing = editingId === term.id
                  return (
                    <tr key={term.id}>
                      {isEditing ? (
                        <>
                          <td>
                            <input
                              className="row-input"
                              value={editForm.ru}
                              onChange={(e) =>
                                setEditForm({ ...editForm, ru: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="row-input"
                              value={editForm.kk}
                              onChange={(e) =>
                                setEditForm({ ...editForm, kk: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <input
                              className="row-input"
                              value={editForm.en}
                              onChange={(e) =>
                                setEditForm({ ...editForm, en: e.target.value })
                              }
                            />
                          </td>
                          <td>
                            <select
                              className="row-input"
                              value={editForm.category}
                              onChange={(e) =>
                                setEditForm({ ...editForm, category: e.target.value })
                              }
                            >
                              <option value="">Без категории</option>
                              {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="col-actions">
                            <div className="row-actions">
                              <button
                                type="button"
                                className="btn-save"
                                onClick={() => handleEditSave(term.id)}
                              >
                                Сохранить
                              </button>
                              <button
                                type="button"
                                className="btn-cancel"
                                onClick={handleEditCancel}
                              >
                                Отмена
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <span className="cell-text">{term.ru}</span>
                            <PlayButton src={term.audio_ru} label={term.ru} />
                            {!term.audio_ru && (
                              <AiSpeakButton text={term.ru} lang="ru-RU" />
                            )}
                          </td>
                          <td>
                            <span className="cell-text">{term.kk}</span>
                            <PlayButton src={term.audio_kk} label={term.kk} />
                          </td>
                          <td>
                            <span className="cell-text">{term.en}</span>
                            <PlayButton src={term.audio_en} label={term.en} />
                            {!term.audio_en && (
                              <AiSpeakButton text={term.en} lang="en-US" />
                            )}
                          </td>
                          <td>
                            {term.category ? (
                              <span className="category-badge">{term.category}</span>
                            ) : (
                              <span className="cell-text">—</span>
                            )}
                          </td>
                          <td className="col-actions">
                            <div className="row-actions">
                              <button
                                type="button"
                                className="btn-edit"
                                onClick={() => handleEditStart(term)}
                                aria-label={`Изменить термин ${term.ru || term.kk || term.en}`}
                              >
                                Изменить
                              </button>
                              <button
                                type="button"
                                className="btn-delete"
                                onClick={() => handleDelete(term)}
                                aria-label={`Удалить термин ${term.ru || term.kk || term.en}`}
                              >
                                Удалить
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {activeTab === 'quotes' && (
        <section className="card">
          <h2>Мәлік Ғабдуллин нақыл сөздері</h2>
          <p className="empty-state-text">Мазмұн жақында қосылады.</p>
        </section>
      )}

      {activeTab === 'ministry' && (
        <section className="card">
          <h2>Төтенше жағдайлар министрлігі</h2>
          <p className="empty-state-text">Мазмұн жақында қосылады.</p>
        </section>
      )}

      {activeTab === 'docs' && (
        <section className="card">
          <h2>Құжаттама</h2>
          <p className="empty-state-text">Мазмұн жақында қосылады.</p>
        </section>
      )}
    </>
  )
}

export default App
