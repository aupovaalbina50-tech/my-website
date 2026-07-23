import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import QuotesPage from './pages/quotes/QuotesPage.jsx'
import QuoteDetailPage from './pages/quotes/QuoteDetailPage.jsx'
import AccountLayout from './pages/account/AccountLayout.jsx'
import AccountHomePage from './pages/account/AccountHomePage.jsx'
import FavoriteQuotesPage from './pages/account/FavoriteQuotesPage.jsx'
import RecentlyViewedQuotesPage from './pages/account/RecentlyViewedQuotesPage.jsx'
import PlaceholderPage from './pages/account/PlaceholderPage.jsx'
import ForgotPasswordPage from './pages/account/auth/ForgotPasswordPage.jsx'
import ResetPasswordPage from './pages/account/auth/ResetPasswordPage.jsx'
import RequireAuth from './auth/RequireAuth.jsx'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/quotes" element={<QuotesPage />} />
      <Route path="/quotes/:number" element={<QuoteDetailPage />} />
      <Route path="/account/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/account/reset-password" element={<ResetPasswordPage />} />
      <Route path="/account" element={<AccountLayout />}>
        <Route index element={<AccountHomePage />} />
        <Route
          path="profile"
          element={
            <RequireAuth>
              <PlaceholderPage titleKey="profile" />
            </RequireAuth>
          }
        />
        <Route
          path="favorites"
          element={
            <RequireAuth>
              <FavoriteQuotesPage />
            </RequireAuth>
          }
        />
        <Route
          path="search-history"
          element={
            <RequireAuth>
              <PlaceholderPage titleKey="searchHistory" />
            </RequireAuth>
          }
        />
        <Route
          path="viewing-history"
          element={
            <RequireAuth>
              <RecentlyViewedQuotesPage />
            </RequireAuth>
          }
        />
        <Route
          path="tests"
          element={
            <RequireAuth>
              <PlaceholderPage titleKey="tests" />
            </RequireAuth>
          }
        />
        <Route
          path="statistics"
          element={
            <RequireAuth>
              <PlaceholderPage titleKey="statistics" />
            </RequireAuth>
          }
        />
        <Route
          path="achievements"
          element={
            <RequireAuth>
              <PlaceholderPage titleKey="achievements" />
            </RequireAuth>
          }
        />
        <Route
          path="settings"
          element={
            <RequireAuth>
              <PlaceholderPage titleKey="settings" />
            </RequireAuth>
          }
        />
        {/* Each sidebar section above owns a route + component today rendering a
            placeholder behind RequireAuth; future work replaces PlaceholderPage
            with the real feature without touching the sidebar or routing. */}
      </Route>
    </Routes>
  )
}

export default App
