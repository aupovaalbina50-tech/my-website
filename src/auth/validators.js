const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁёӘәҒғҚқҢңӨөҰұҮүҺһІі\s'-]+$/
const USERNAME_PATTERN = /^[A-Za-z0-9_]{4,20}$/
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidName(value) {
  const trimmed = value.trim()
  return trimmed.length >= 2 && NAME_PATTERN.test(trimmed)
}

export function isValidUsernameFormat(value) {
  return USERNAME_PATTERN.test(value)
}

export function isValidEmailFormat(value) {
  return EMAIL_PATTERN.test(value.trim())
}

export function getPasswordStrengthScore(password) {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

export function passwordMeetsRequirements(password) {
  return getPasswordStrengthScore(password) === 5
}

export function passwordStrengthLevel(score) {
  if (score <= 2) return 'weak'
  if (score <= 4) return 'medium'
  return 'strong'
}
