import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, ALargeSmall, List } from 'lucide-react'
import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'
import CategoryGrid from './shared/CategoryGrid.jsx'
import AlphabetTerms from './shared/AlphabetTerms.jsx'
import AllTermsContent from './shared/AllTermsContent.jsx'
import { useAllTermCategories } from './account/useAllTermCategories.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'

function TermsCategoriesPage() {
  const navigate = useNavigate()
  const { lang, t } = useLanguage()
  const { rows, loading } = useAllTermCategories()
  const [view, setView] = useState('categories')

  const categoryCounts = useMemo(() => {
    const counts = {}
    rows.forEach((term) => {
      if (term.category) counts[term.category] = (counts[term.category] || 0) + 1
    })
    return counts
  }, [rows])

  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection="terms" onSectionClick={() => {}} />
        <div className="home-content">
          <div className="terms-tabs">
            <div className="tnm-view-switch" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'categories'}
                className={`tnm-view-btn${view === 'categories' ? ' active' : ''}`}
                onClick={() => setView('categories')}
              >
                <LayoutGrid size={19} aria-hidden="true" />
                {t.termsMap.viewCategories}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'alphabet'}
                className={`tnm-view-btn${view === 'alphabet' ? ' active' : ''}`}
                onClick={() => setView('alphabet')}
              >
                <ALargeSmall size={19} aria-hidden="true" />
                {t.termsMap.viewAlphabet}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'list'}
                className={`tnm-view-btn${view === 'list' ? ' active' : ''}`}
                onClick={() => setView('list')}
              >
                <List size={19} aria-hidden="true" />
                {t.termsMap.viewList}
              </button>
            </div>
          </div>

          {view === 'categories' && (
            <CategoryGrid
              t={t}
              lang={lang}
              counts={categoryCounts}
              countsReady={!loading}
              onSelect={(key) => navigate(`/category/${key}`)}
            />
          )}

          {view === 'alphabet' && <AlphabetTerms />}

          {view === 'list' && <AllTermsContent categoryKey={null} showBack={false} />}
        </div>
      </div>
      <Footer />
    </>
  )
}

export default TermsCategoriesPage
