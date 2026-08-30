import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '../../i18n/LanguageContext.jsx'
import { toSentenceCase } from '../../utils/textCase.js'
import { useAllTerms } from './useAllTerms.js'
import AllTermsContent from './AllTermsContent.jsx'

function AlphabetTerms() {
  const { lang, t } = useLanguage()
  const { terms, loading } = useAllTerms()
  const [selectedLetter, setSelectedLetter] = useState(null)

  const letterCounts = useMemo(() => {
    const counts = {}
    terms.forEach((term) => {
      const label = toSentenceCase(term[lang] || term.ru || term.kk || term.en)
      const letter = label.charAt(0).toUpperCase()
      if (!letter) return
      counts[letter] = (counts[letter] || 0) + 1
    })
    return counts
  }, [terms, lang])

  const letters = useMemo(
    () => Object.keys(letterCounts).sort((a, b) => a.localeCompare(b, 'ru')),
    [letterCounts],
  )

  if (selectedLetter) {
    return (
      <>
        <button
          type="button"
          className="quote-back-link"
          onClick={() => setSelectedLetter(null)}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t.termsList.backToAlphabet}
        </button>
        <AllTermsContent
          categoryKey={null}
          showBack={false}
          showSearch={false}
          letterFilter={selectedLetter}
          titleOverride={selectedLetter}
        />
      </>
    )
  }

  return (
    <section className="category-section">
      <h2 className="category-section-title">{t.termsList.byLetterHeading}</h2>
      {loading ? (
        <p className="empty-state-text">{t.termsMap.loading}</p>
      ) : (
        <div className="category-grid">
          {letters.map((letter) => (
            <button
              key={letter}
              type="button"
              className="category-card"
              onClick={() => setSelectedLetter(letter)}
            >
              <span className="category-card-top">
                <span className="alphabet-card-glyph" aria-hidden="true">
                  {letter}
                </span>
              </span>
              <span className="category-card-bottom">
                <span className="category-card-count">
                  {t.categorySection.count(letterCounts[letter])}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export default AlphabetTerms
