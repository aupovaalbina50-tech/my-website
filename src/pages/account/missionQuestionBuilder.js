// Shared translation-question builder for the Missions section — used by
// both the Step 2 quiz (useMissionQuiz, 15 questions) and the Step 3
// operation's per-stage term checks (useMissionOperation, a handful of
// questions). Every question is drawn strictly from the terms passed in
// (the mission's own studied terms), never a wider term pool.
export const QUESTION_TYPES = ['ru-kk', 'kk-ru', 'ru-en', 'en-ru', 'kk-en', 'en-kk']
export const OPTIONS_PER_QUESTION = 4

export function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function isValidPair(term, type) {
  const [fromLang, toLang] = type.split('-')
  const prompt = term[fromLang]?.trim()
  const answer = term[toLang]?.trim()
  return !!prompt && !!answer && prompt.toLowerCase() !== answer.toLowerCase()
}

// Picks up to `targetCount` (term, direction) seeds, balancing the 6
// translation directions and using every term at least once before any
// term repeats, wherever the data allows it.
export function pickQuestionSeeds(terms, targetCount) {
  const byTerm = new Map()
  terms.forEach((term) => {
    const validTypes = QUESTION_TYPES.filter((type) => isValidPair(term, type))
    if (validTypes.length > 0) byTerm.set(term.id, validTypes)
  })

  const usableTerms = shuffle(terms.filter((term) => byTerm.has(term.id)))
  const typeUsage = Object.fromEntries(QUESTION_TYPES.map((type) => [type, 0]))
  const picked = []

  usableTerms.forEach((term) => {
    const candidates = shuffle(byTerm.get(term.id)).sort((a, b) => typeUsage[a] - typeUsage[b])
    const chosen = candidates[0]
    typeUsage[chosen] += 1
    picked.push({ term, type: chosen })
  })

  const target = Math.min(targetCount, usableTerms.length > 0 ? terms.length : 0)
  const allPairs = []
  terms.forEach((term) => {
    ;(byTerm.get(term.id) || []).forEach((type) => allPairs.push({ term, type }))
  })

  while (picked.length < target) {
    const used = new Set(picked.map((p) => `${p.term.id}:${p.type}`))
    const remaining = shuffle(allPairs.filter((p) => !used.has(`${p.term.id}:${p.type}`)))
    if (remaining.length === 0) break
    remaining.sort((a, b) => typeUsage[a.type] - typeUsage[b.type])
    const next = remaining[0]
    typeUsage[next.type] += 1
    picked.push(next)
  }

  return shuffle(picked).slice(0, Math.min(targetCount, picked.length))
}

export function buildQuestion({ term, type }, pool, index) {
  const [fromLang, toLang] = type.split('-')
  const correctText = term[toLang]
  const distractorPool = pool.filter(
    (t) =>
      t.id !== term.id &&
      t[toLang]?.trim() &&
      t[toLang].trim().toLowerCase() !== correctText.trim().toLowerCase(),
  )
  const distractors = shuffle(distractorPool).slice(0, OPTIONS_PER_QUESTION - 1)
  const options = shuffle([
    { id: term.id, text: term[toLang] },
    ...distractors.map((t) => ({ id: t.id, text: t[toLang] })),
  ])

  return {
    key: `${term.id}-${type}-${index}`,
    type,
    fromLang,
    toLang,
    term,
    prompt: term[fromLang],
    correctId: term.id,
    options,
  }
}

export function buildQuestions(terms, count) {
  const seeds = pickQuestionSeeds(terms, count)
  return seeds.map((seed, i) => buildQuestion(seed, terms, i))
}
