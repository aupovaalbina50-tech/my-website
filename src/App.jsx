import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth.jsx'
import BackgroundDecor from './components/BackgroundDecor.jsx'
import AIAssistant from './components/ai-assistant/AIAssistant.jsx'
import './App.css'

const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const TermsNetworkPage = lazy(() => import('./pages/TermsNetworkPage.jsx'))
const TermsListPage = lazy(() => import('./pages/TermsListPage.jsx'))
const TermDetailPage = lazy(() => import('./pages/TermDetailPage.jsx'))
const MinistryPage = lazy(() => import('./pages/MinistryPage.jsx'))
const CommitteesPage = lazy(() => import('./pages/CommitteesPage.jsx'))
const QuotesPage = lazy(() => import('./pages/quotes/QuotesPage.jsx'))
const QuoteDetailPage = lazy(() => import('./pages/quotes/QuoteDetailPage.jsx'))
const AccountLayout = lazy(() => import('./pages/account/AccountLayout.jsx'))
const AccountHomePage = lazy(() => import('./pages/account/AccountHomePage.jsx'))
const FavoriteQuotesPage = lazy(() => import('./pages/account/FavoriteQuotesPage.jsx'))
const MyDictionaryPage = lazy(() => import('./pages/account/MyDictionaryPage.jsx'))
const RecentlyViewedTermsPage = lazy(() => import('./pages/account/RecentlyViewedTermsPage.jsx'))
const PlaceholderPage = lazy(() => import('./pages/account/PlaceholderPage.jsx'))
const TestsPage = lazy(() => import('./pages/account/TestsPage.jsx'))
const StatisticsPage = lazy(() => import('./pages/account/StatisticsPage.jsx'))
const ForgotPasswordPage = lazy(() => import('./pages/account/auth/ForgotPasswordPage.jsx'))
const ResetPasswordPage = lazy(() => import('./pages/account/auth/ResetPasswordPage.jsx'))

function App() {
  const location = useLocation()

  return (
    <>
      <BackgroundDecor />
      <div className="app-content">
        <Suspense fallback={null}>
          <div className="route-fade" key={location.pathname}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/terms" element={<TermsNetworkPage />} />
              <Route path="/terms/:id" element={<TermDetailPage />} />
              <Route path="/category/:key" element={<TermsListPage />} />
              <Route path="/ministry" element={<MinistryPage />} />
              <Route path="/committees" element={<CommitteesPage />} />
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
                  path="my-dictionary"
                  element={
                    <RequireAuth>
                      <MyDictionaryPage />
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
                      <RecentlyViewedTermsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="tests"
                  element={
                    <RequireAuth>
                      <TestsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="statistics"
                  element={
                    <RequireAuth>
                      <StatisticsPage />
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
          </div>
        </Suspense>
      </div>
      <AIAssistant />
    </>
  )
}

export default App
