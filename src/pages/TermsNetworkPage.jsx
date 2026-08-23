import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'
import TermsExplorerContent from './shared/TermsExplorerContent.jsx'

function TermsNetworkPage() {
  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection="terms" onSectionClick={() => {}} />
        <div className="home-content">
          <TermsExplorerContent />
        </div>
      </div>
      <Footer />
    </>
  )
}

export default TermsNetworkPage
