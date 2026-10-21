import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutGrid, ALargeSmall, List } from 'lucide-react'
import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'
import SectionIntro from '../components/SectionIntro.jsx'
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
          <section className="section-terms-intro">
            <div className="section-kicker" aria-hidden="true"></div>
            <h1 className="section-title">{t.nav.terms}</h1>
            <SectionIntro
              lead={t.termsMap.introLead}
              steps={[
                { icon: LayoutGrid, ...t.termsMap.introSteps[0], active: view === 'categories', onClick: () => setView('categories') },
                { icon: ALargeSmall, ...t.termsMap.introSteps[1], active: view === 'alphabet', onClick: () => setView('alphabet') },
                { icon: List, ...t.termsMap.introSteps[2], active: view === 'list', onClick: () => setView('list') },
              ]}
            />
          </section>
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
