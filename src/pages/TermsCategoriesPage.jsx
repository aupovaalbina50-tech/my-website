import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'
import CategoryGrid from './shared/CategoryGrid.jsx'
import { useAllTermCategories } from './account/useAllTermCategories.js'
import { useLanguage } from '../i18n/LanguageContext.jsx'

function TermsCategoriesPage() {
  const navigate = useNavigate()
  const { lang, t } = useLanguage()
  const { rows, loading } = useAllTermCategories()

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
          <CategoryGrid
            t={t}
            lang={lang}
            counts={categoryCounts}
            countsReady={!loading}
            onSelect={(key) => navigate(`/category/${key}`)}
          />
        </div>
      </div>
      <Footer />
    </>
  )
}

export default TermsCategoriesPage
