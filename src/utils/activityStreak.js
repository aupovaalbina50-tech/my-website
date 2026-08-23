const DAY_MS = 24 * 60 * 60 * 1000

function dateKey(date) {
  return date.toISOString().slice(0, 10)
}

export function computeStreak(activeDays) {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  let cursor = today
  if (!activeDays.has(dateKey(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS)
  }
  let streak = 0
  while (activeDays.has(dateKey(cursor))) {
    streak += 1
    cursor = new Date(cursor.getTime() - DAY_MS)
  }
  return streak
}

export function computeWeekDots(activeDays) {
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const dayOfWeek = (today.getUTCDay() + 6) % 7 // 0 = Monday ... 6 = Sunday
  const monday = new Date(today.getTime() - dayOfWeek * DAY_MS)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getTime() + i * DAY_MS)
    return {
      active: activeDays.has(dateKey(d)),
      isFuture: d.getTime() > today.getTime(),
    }
  })
}
