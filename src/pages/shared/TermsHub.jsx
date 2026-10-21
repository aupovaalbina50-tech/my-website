import { useMemo, useState } from 'react'
import { ArrowLeft, LayoutGrid, ALargeSmall, List } from 'lucide-react'
import SectionIntro from '../../components/SectionIntro.jsx'
import CategoryGrid from './CategoryGrid.jsx'
import AlphabetTerms from './AlphabetTerms.jsx'
import AllTermsContent from './AllTermsContent.jsx'
import { useAllTermCategories } from '../account/useAllTermCategories.js'
import { useLanguage } from '../../i18n/LanguageContext.jsx'

// «Терминдер / Термины» — the same screen on the public site and in the
// account: title, intro whose steps switch the view (categories, alphabet,
// full list). With `onSelectCategory` a category opens elsewhere (the public
// /category/:key page); without it, its terms open right here.
function TermsHub({ termBasePath = '/terms', onSelectCategory }) {
  const { lang, t } = useLanguage()
  const { rows, loading } = useAllTermCategories()
  const [view, setView] = useState('categories')
  const [category, setCategory] = useState(null)

  const categoryCounts = useMemo(() => {
    const counts = {}
    rows.forEach((term) => {
      if (term.category) counts[term.category] = (counts[term.category] || 0) + 1
    })
    return counts
  }, [rows])

  const show = (next) => {
    setView(next)
    setCategory(null)
  }

  return (
    <>
      <section className="section-terms-intro">
        <div className="section-kicker" aria-hidden="true"></div>
        <h1 className="section-title">{t.nav.terms}</h1>
        <SectionIntro
          lead={t.termsMap.introLead}
          steps={[
            { icon: LayoutGrid, ...t.termsMap.introSteps[0], active: view === 'categories', onClick: () => show('categories') },
            { icon: ALargeSmall, ...t.termsMap.introSteps[1], active: view === 'alphabet', onClick: () => show('alphabet') },
            { icon: List, ...t.termsMap.introSteps[2], active: view === 'list', onClick: () => show('list') },
          ]}
        />
      </section>

      {view === 'categories' && !category && (
        <CategoryGrid
          t={t}
          lang={lang}
          counts={categoryCounts}
          countsReady={!loading}
          onSelect={(key) => (onSelectCategory ? onSelectCategory(key) : setCategory(key))}
        />
      )}

      {view === 'categories' && category && (
        <>
          <button type="button" className="quote-back-link" onClick={() => setCategory(null)}>
            <ArrowLeft size={16} aria-hidden="true" />
            {t.nav.terms}
          </button>
          <AllTermsContent categoryKey={category} showBack={false} termBasePath={termBasePath} />
        </>
      )}

      {view === 'alphabet' && <AlphabetTerms termBasePath={termBasePath} />}

      {view === 'list' && <AllTermsContent categoryKey={null} showBack={false} termBasePath={termBasePath} />}
    </>
  )
}

export default TermsHub
