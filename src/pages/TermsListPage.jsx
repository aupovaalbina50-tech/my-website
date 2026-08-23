import { useParams } from 'react-router-dom'
import Header from '../components/Header.jsx'
import HomeSidebar from '../components/HomeSidebar.jsx'
import Footer from '../components/Footer.jsx'
import AllTermsContent from './shared/AllTermsContent.jsx'

function TermsListPage() {
  const { key } = useParams()

  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection={key ? '' : 'terms'} onSectionClick={() => {}} />
        <div className="home-content">
          <AllTermsContent categoryKey={key} />
        </div>
      </div>
      <Footer />
    </>
  )
}

export default TermsListPage
