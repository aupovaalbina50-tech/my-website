// Warning before the content of a document goes to the AI service.
//
// Documents of the users may hold personal data and information of limited
// access. Every client of the AI functions (smart-report, doc-inspector)
// awaits requireAiConsent() before its request; the dialog itself is
// <AiConsentHost/> (mounted once in App). The answer holds for the browser
// session, or on this device if the user ticks «больше не спрашивать».
// Declining stops the request with the error code 'ai_declined'.

const KEY = 'ai_consent_v1'
let sessionConsent = false
let pending = null
const hosts = new Set()

function remembered() {
  try {
    return localStorage.getItem(KEY) === 'always'
  } catch {
    return false
  }
}

export const hasAiConsent = () => sessionConsent || remembered()

export class AiDeclinedError extends Error {
  constructor() {
    super('ai_declined')
    this.code = 'ai_declined'
  }
}

/** Resolves when the user agreed (now or earlier); rejects with AiDeclinedError otherwise. */
export function requireAiConsent() {
  if (hasAiConsent() || !hosts.size) return Promise.resolve()
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const answer = {
        accept(always) {
          sessionConsent = true
          if (always) {
            try {
              localStorage.setItem(KEY, 'always')
            } catch {
              // Private mode: the answer still holds for this session.
            }
          }
          pending = null
          resolve()
        },
        decline() {
          pending = null
          reject(new AiDeclinedError())
        },
      }
      for (const show of hosts) show(answer)
    })
  }
  return pending
}

/** For the host component: called with { accept, decline } when an answer is needed. */
export function subscribeAiConsent(show) {
  hosts.add(show)
  return () => hosts.delete(show)
}

/** «Отозвать согласие»: the next AI request asks again. */
export function resetAiConsent() {
  sessionConsent = false
  try {
    localStorage.removeItem(KEY)
  } catch {
    // nothing stored
  }
}
