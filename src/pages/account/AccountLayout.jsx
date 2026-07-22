import { Outlet } from 'react-router-dom'
import Header from '../../components/Header.jsx'
import Footer from '../../components/Footer.jsx'
import Sidebar from '../../components/Sidebar.jsx'

function AccountLayout() {
  return (
    <>
      <Header />
      <div className="account-shell">
        <Sidebar />
        <main className="account-content">
          <Outlet />
        </main>
      </div>
      <Footer />
    </>
  )
}

export default AccountLayout
