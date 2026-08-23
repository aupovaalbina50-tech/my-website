import { Component } from 'react'

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
          <p>Бірдеңе дұрыс болмады. Бетті жаңартып көріңіз.</p>
          <p>Что-то пошло не так. Попробуйте обновить страницу.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Жаңарту / Обновить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
