// Figures and texts of the expertise report, derived only from the real
// results of the current check — nothing here is a fixed or sample value.

import { CATEGORIES as TERM_CATEGORIES } from '../../../i18n/translations.js'
import { categoryOf } from './pipeline.js'
import { isPairTerm, pairForResult } from './confusables.js'

/** Counts per status and the share of terms that match the base. */
export function summarize(results) {
  const counts = { misuse: 0, mismatch: 0, uncertain: 0, ambiguous: 0, ok: 0 }
  for (const r of results) counts[categoryOf(r)]++
  const total = results.length
  const issues = total - counts.ok
  return {
    total,
    counts,
    issues,
    // «Требуют исправления»: the confident errors (🔴 + 🟠).
    toFix: counts.misuse + counts.mismatch,
    compliance: total ? Math.round((counts.ok / total) * 100) : null,
  }
}

/** How many of the document's base terms belong to each subject area of the base. */
export function termProfile(results, lang) {
  const seen = new Map()
  for (const r of results) {
    const term = r.term
    if (!term || isPairTerm(term) || !term.category) continue
    seen.set(term.category, (seen.get(term.category) ?? 0) + 1)
  }
  return [...seen.entries()]
    .map(([key, count]) => ({
      key,
      label: TERM_CATEGORIES.find((c) => c.key === key)?.[lang] ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

/**
 * «Почему система так решила?» — the steps the check really went through for
 * this finding, built from what the result records (source, match type,
 * candidates, «Не путать» pair, external lookup).
 */
export function reasoningSteps(result, ti, location, lang = 'ru') {
  const w = ti.why
  const steps = [w.found(result.text, location)]
  const fromPair = result.candidates.some((c) => isPairTerm(c.term))

  // Base comparison.
  // baseMatch: the base found the phrase first and the AI only inflected the
  // replacement — that is still a base match, not a guess.
  const baseType = result.source === 'glossary' ? result.errorType : result.baseMatch
  if (result.source === 'glossary' || result.baseMatch) {
    if (baseType === 'unofficial_variant') steps.push(w.variantInBase(result.official))
    else if (baseType === 'language_mismatch') steps.push(w.languageInBase(result.official))
    else if (baseType === 'hyphenation') steps.push(w.hyphenInBase(result.official))
    else steps.push(w.exactInBase(result.official ?? result.text))
    if (result.baseMatch) steps.push(w.formByAi)
  } else {
    steps.push(w.noDirectMatch)
  }

  // Candidates.
  if (fromPair) {
    const pair = pairForResult(result)
    steps.push(w.pairUsed(pair ? `${pair.a.name[lang]} / ${pair.b.name[lang]}` : ''))
  } else if (result.candidates.length > 1) {
    steps.push(w.severalCandidates(result.candidates.map((c) => c.official)))
  } else if (result.candidates.length === 1 && result.source === 'ai' && !result.baseMatch) {
    steps.push(w.semanticCandidate(result.candidates[0].official))
  } else if (result.candidates.length === 0) {
    steps.push(w.noOfficialTerm)
  }
  if (!result.candidates.length) {
    steps.push(result.external ? w.externalFound(result.external.officialTerm, result.external.sourceTitle) : w.externalNotUsed)
  }

  // Context: only the AI pass actually reads the sentence.
  if (result.source === 'ai') steps.push(w.contextAnalyzed(Math.round(result.confidence * 100)))
  else if (result.context) steps.push(w.contextShown)

  // Recommendation.
  const category = categoryOf(result)
  const applicable = result.candidates.filter((c) => c.applicable)
  if (category === 'ambiguous') steps.push(w.recommendChoose)
  else if (category === 'uncertain') steps.push(w.recommendCheck)
  else if (applicable.length) steps.push(w.recommendReplace(applicable[0].suggestion))
  else if (result.candidates.length) steps.push(w.recommendManual(result.candidates[0].official))
  return steps
}

/** «Заключение терминологической экспертизы», from the real figures. */
export function conclusionText(summary, ti) {
  const c = ti.conclusion
  const parts = [c.checked(summary.total)]
  if (summary.total === 0) return [c.noTerms]
  parts.push(c.matching(summary.counts.ok))
  if (summary.toFix) parts.push(c.toFix(summary.toFix))
  if (summary.counts.uncertain) parts.push(c.uncertain(summary.counts.uncertain))
  if (summary.counts.ambiguous) parts.push(c.ambiguous(summary.counts.ambiguous))
  parts.push(summary.issues ? c.recommendReview : c.allGood)
  return parts
}

/** Findings that have at least one replacement verified against the base. */
export function fixableResults(results) {
  return results.filter((r) => r.status !== 'ok' && r.candidates.some((c) => c.applicable))
}
