import Header from './Header.jsx'
import HomeSidebar from './HomeSidebar.jsx'
import Footer from './Footer.jsx'

function noop() {}

function SiteSectionLayout({ activeSection, children }) {
  return (
    <>
      <Header />
      <div className="account-shell">
        <HomeSidebar activeSection={activeSection} onSectionClick={noop} />
        <div className="home-content">{children}</div>
      </div>
      <Footer />
    </>
  )
}

export default SiteSectionLayout
