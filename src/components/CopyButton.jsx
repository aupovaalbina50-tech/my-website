import { Copy } from 'lucide-react'
import { useToast } from './ToastContext.jsx'

export function CopyButton({ text, label, t, className = '' }) {
  const { showToast } = useToast()
  if (!text) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(t.termDetail.copied)
    } catch {
      // clipboard access denied or unavailable — silently ignore
    }
  }

  return (
    <button
      type="button"
      className={`quote-icon-btn term-copy-btn ${className}`.trim()}
      onClick={handleCopy}
      aria-label={t.termDetail.copyAria(label)}
      title={t.termDetail.copy}
    >
      <Copy size={16} aria-hidden="true" />
    </button>
  )
}

export default CopyButton
