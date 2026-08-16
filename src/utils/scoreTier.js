export function scoreTier(percent) {
  if (percent >= 80) return 'good'
  if (percent >= 50) return 'mid'
  return 'low'
}
