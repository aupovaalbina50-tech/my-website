import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'

// The mission language is the language the learner TRANSLATES INTO on the
// Step 2 test. It is chosen at the start of each run (see useMissionTermStudy
// for what a run is) and kept in this browser per user + mission + run, so it
// survives stage changes and refreshes, and a new run asks again.
export const MISSION_LANGS = ['kk', 'ru', 'en']

export const MISSION_LANG_NAMES = { kk: 'Қазақша', ru: 'Русский', en: 'English' }

// Which language the test shows the term in, for each target language. The
// prompt is always in one fixed other language, so every question of a test
// has the same direction and the answer options are only in the target.
export const MISSION_SOURCE_LANG = { ru: 'kk', kk: 'ru', en: 'kk' }

const storageKey = (userId, missionId, runStartedAt) =>
  `mission-lang:${userId || 'guest'}:${missionId}:${runStartedAt || 'first-run'}`

export function useMissionLanguage(missionId, runStartedAt, runLoading) {
  const { user } = useAuth()
  const key = storageKey(user?.id, missionId, runStartedAt)
  const [state, setState] = useState({ key: null, lang: null })

  useEffect(() => {
    if (runLoading || !missionId) return
    let stored = null
    try {
      stored = window.localStorage.getItem(key)
    } catch {
      stored = null
    }
    setState({ key, lang: MISSION_LANGS.includes(stored) ? stored : null })
  }, [key, runLoading, missionId])

  const chooseMissionLang = useCallback(
    (lang) => {
      setState({ key, lang })
      try {
        window.localStorage.setItem(key, lang)
      } catch {
        // Storage unavailable (private mode): the choice still holds for this visit.
      }
    },
    [key],
  )

  return {
    missionLang: state.key === key ? state.lang : null,
    missionLangLoaded: !runLoading && state.key === key,
    chooseMissionLang,
  }
}

// Everything the learner reads INSIDE the Step 2 test is in the mission
// language — instruction, buttons, feedback — never the site language.
export const MISSION_QUIZ_UI = {
  kk: {
    questionLabel: (current, total) => `${String(current).padStart(2, '0')}-сұрақ / ${total}`,
    correctCount: (n) => `${n} дұрыс`,
    instruction: (fromLang) => {
      const from = { ru: 'орыс', en: 'ағылшын', kk: 'қазақ' }
      return `Терминнің қазақ тіліндегі дұрыс аудармасын таңдаңыз (${from[fromLang]} тілінен)`
    },
    answerCta: 'Жауап беру →',
    nextCta: 'Келесі сұрақ →',
    finishCta: 'Нәтижені көру →',
    correctTitle: 'Дұрыс',
    correctText: 'Керемет!',
    wrongTitle: 'Қате',
    correctAnswerLabel: (text) => `Дұрыс жауап: ${text}`,
  },
  ru: {
    questionLabel: (current, total) => `Вопрос ${String(current).padStart(2, '0')} / ${total}`,
    correctCount: (n) => `${n} правильных`,
    instruction: (fromLang) => {
      const from = { kk: 'казахского', en: 'английского', ru: 'русского' }
      return `Выберите правильный перевод термина на русский язык (с ${from[fromLang]})`
    },
    answerCta: 'Ответить →',
    nextCta: 'Следующий вопрос →',
    finishCta: 'Посмотреть результат →',
    correctTitle: 'Правильно',
    correctText: 'Отлично!',
    wrongTitle: 'Неверно',
    correctAnswerLabel: (text) => `Правильный ответ: ${text}`,
  },
  en: {
    questionLabel: (current, total) => `Question ${String(current).padStart(2, '0')} / ${total}`,
    correctCount: (n) => `${n} correct`,
    instruction: (fromLang) => {
      const from = { kk: 'Kazakh', ru: 'Russian', en: 'English' }
      return `Choose the correct English translation of the term (from ${from[fromLang]})`
    },
    answerCta: 'Answer →',
    nextCta: 'Next question →',
    finishCta: 'See results →',
    correctTitle: 'Correct',
    correctText: 'Well done!',
    wrongTitle: 'Incorrect',
    correctAnswerLabel: (text) => `Correct answer: ${text}`,
  },
}
