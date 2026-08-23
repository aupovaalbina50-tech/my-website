import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'
import TermDetailContent from './shared/TermDetailContent.jsx'

function TermDetailPage() {
  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection="search" onSectionClick={() => {}} />
        <div className="home-content">
          <TermDetailContent />
        </div>
      </div>
      <Footer />
    </>
  )
}

export default TermDetailPage
