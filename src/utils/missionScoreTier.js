// Minimum score to consider a mission's quiz passed. Kept as a single
// constant (rather than inlined thresholds) so the passing bar can be
// tuned later without touching the quiz flow, scoring UI, or the mission
// status logic that all read from it.
export const MISSION_PASSING_SCORE = 80

// Mirrors the 4-tier system used across the Missions test screen: below
// 60 the learner must restudy, 60-79 needs more practice but can retry
// directly, 80-89 passes, 90+ passes with distinction. Distinct from the
// site-wide utils/scoreTier.js (3-tier, used by the general vocabulary
// quiz) — missions need the extra "needs practice" band.
export function missionScoreTier(percent) {
  if (percent >= 90) return 'excellent'
  if (percent >= MISSION_PASSING_SCORE) return 'passed'
  if (percent >= 60) return 'needs_practice'
  return 'failed'
}

export function isMissionScorePassing(percent) {
  return percent >= MISSION_PASSING_SCORE
}
