import { useNavigate } from 'react-router-dom'
import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'
import TermsHub from './shared/TermsHub.jsx'

function TermsCategoriesPage() {
  const navigate = useNavigate()

  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection="terms" onSectionClick={() => {}} />
        <div className="home-content">
          <TermsHub onSelectCategory={(key) => navigate(`/category/${key}`)} />
        </div>
      </div>
      <Footer />
    </>
  )
}

export default TermsCategoriesPage
