import { Component } from 'react'

const MESSAGES = {
  kk: { text: 'Бірдеңе дұрыс болмады. Бетті жаңартып көріңіз.', button: 'Жаңарту' },
  ru: { text: 'Что-то пошло не так. Попробуйте обновить страницу.', button: 'Обновить' },
}

function readStoredLang() {
  if (typeof window === 'undefined') return 'kk'
  const saved = window.localStorage.getItem('site_lang')
  return saved === 'ru' || saved === 'kk' ? saved : 'kk'
}

class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error', error, info)
  }

  render() {
    if (this.state.hasError) {
      const m = MESSAGES[readStoredLang()]
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <p>{m.text}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {m.button}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
