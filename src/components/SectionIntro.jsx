import { ArrowRight } from 'lucide-react'

// Intro under a section title: one short sentence and up to three steps
// («what is here / how to use it»). A step with `target` (a CSS selector)
// scrolls to that part of the page; with `focus`, it also puts the cursor
// into that field.
function goTo(target, focus) {
  const el = document.querySelector(target)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (focus) document.querySelector(focus)?.focus({ preventScroll: true })
}

function SectionIntro({ lead, steps = [] }) {
  return (
    <div className="section-intro">
      <p className="section-intro-lead">{lead}</p>
      {steps.length > 0 && (
        <ol className="section-intro-steps">
          {steps.map(({ icon: Icon, title, text, target, focus }, index) => {
            const body = (
              <>
                <span className="section-intro-step-top">
                  <span className="section-intro-step-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span className="section-intro-step-number" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </span>
                <strong className="section-intro-step-title">{title}</strong>
                <span className="section-intro-step-text">{text}</span>
                {target && <ArrowRight size={16} className="section-intro-step-arrow" aria-hidden="true" />}
              </>
            )
            return (
              <li key={title}>
                {target ? (
                  <button type="button" className="section-intro-step is-action" onClick={() => goTo(target, focus)}>
                    {body}
                  </button>
                ) : (
                  <div className="section-intro-step">{body}</div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export default SectionIntro
