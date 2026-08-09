export function PlayButton({ src, label, t }) {
  if (!src) return null
  return (
    <button
      type="button"
      className="btn-play"
      onClick={() => new Audio(src).play()}
      aria-label={t.table.playAria(label)}
      title={t.table.playTitle}
    >
      🔊
    </button>
  )
}

export function speakText(text, lang) {
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

export function AiSpeakButton({ text, lang, t }) {
  if (!text) return null
  return (
    <button
      type="button"
      className="btn-ai-play"
      onClick={() => speakText(text, lang)}
      aria-label={t.table.aiAria(text)}
      title={t.table.aiTitle}
    >
      🤖
    </button>
  )
}
