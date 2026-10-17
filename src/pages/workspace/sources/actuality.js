// Pure: no network, so the checks that use it run anywhere.

/** «Требуется проверка актуальности» — unless the registry holds the act as in force and says when it was checked. */
export function actualityOf(source) {
  if (!source) return 'unknown'
  if (source.status === 'outdated') return 'outdated'
  if (source.status !== 'official') return 'needs_review'
  return source.verified_at ? 'confirmed' : 'needs_review'
}
