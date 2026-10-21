import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth.jsx'
import BackgroundDecor from './components/BackgroundDecor.jsx'
import AiConsentHost from './components/AiConsentHost.jsx'
import AIAssistant from './components/ai-assistant/AIAssistant.jsx'
import './App.css'

const HomePage = lazy(() => import('./pages/HomePage.jsx'))
const TermsCategoriesPage = lazy(() => import('./pages/TermsCategoriesPage.jsx'))
const TermsListPage = lazy(() => import('./pages/TermsListPage.jsx'))
const TermDetailPage = lazy(() => import('./pages/TermDetailPage.jsx'))
const ConfusableTermsPage = lazy(() => import('./pages/ConfusableTermsPage.jsx'))
const AbbreviationsPage = lazy(() => import('./pages/abbreviations/AbbreviationsPage.jsx'))
const TermMapPage = lazy(() => import('./pages/TermMapPage.jsx'))
const MinistryPage = lazy(() => import('./pages/MinistryPage.jsx'))
const CommitteesPage = lazy(() => import('./pages/CommitteesPage.jsx'))
const workspace = () => import('./pages/workspace/DocumentsWorkspace.jsx')
const WorkspacePage = lazy(() => workspace().then((m) => ({ default: m.WorkspacePage })))
const WorkspaceCheckPage = lazy(() => workspace().then((m) => ({ default: m.WorkspaceCheckPage })))
const AccountWorkspacePage = lazy(() => workspace().then((m) => ({ default: m.AccountWorkspacePage })))
const AccountWorkspaceCreatePage = lazy(() => workspace().then((m) => ({ default: m.AccountWorkspaceCreatePage })))
const AccountWorkspaceCheckPage = lazy(() => workspace().then((m) => ({ default: m.AccountWorkspaceCheckPage })))
const AccountMyDocumentsPage = lazy(() => workspace().then((m) => ({ default: m.AccountMyDocumentsPage })))
const AccountCatalogPage = lazy(() => workspace().then((m) => ({ default: m.AccountCatalogPage })))
const AccountHistoryPage = lazy(() => workspace().then((m) => ({ default: m.AccountHistoryPage })))
const QuotesPage = lazy(() => import('./pages/quotes/QuotesPage.jsx'))
const QuoteDetailPage = lazy(() => import('./pages/quotes/QuoteDetailPage.jsx'))
const AccountLayout = lazy(() => import('./pages/account/AccountLayout.jsx'))
const AccountHomePage = lazy(() => import('./pages/account/AccountHomePage.jsx'))
const MissionsIntroPage = lazy(() => import('./pages/account/MissionsIntroPage.jsx'))
const MissionDetailPage = lazy(() => import('./pages/account/MissionDetailPage.jsx'))
const MissionStudyPage = lazy(() => import('./pages/account/MissionStudyPage.jsx'))
const MissionTestPage = lazy(() => import('./pages/account/MissionTestPage.jsx'))
const MissionExecutePage = lazy(() => import('./pages/account/MissionExecutePage.jsx'))
const AccountTermsPage = lazy(() => import('./pages/account/AccountTermsPage.jsx'))
const AccountTermDetailPage = lazy(() => import('./pages/account/AccountTermDetailPage.jsx'))
const AccountCategoriesPage = lazy(() => import('./pages/account/AccountCategoriesPage.jsx'))
const AccountAlphabetPage = lazy(() => import('./pages/account/AccountAlphabetPage.jsx'))
const AccountNetworkPage = lazy(() => import('./pages/account/AccountNetworkPage.jsx'))
const DocumentEditor = lazy(() => import('./pages/account/documents/DocumentEditor.jsx'))
const NewDocument = lazy(() => import('./pages/account/documents/DocumentEditor.jsx').then((m) => ({ default: m.NewDocument })))
const SmartReportEditor = lazy(() => import('./pages/account/smartReport/SmartReportEditor.jsx'))
const KnowledgeBasePage = lazy(() => import('./pages/account/knowledge/KnowledgeBasePage.jsx'))
const AccountCommitteesPage = lazy(() => import('./pages/account/AccountCommitteesPage.jsx'))
const FavoriteQuotesPage = lazy(() => import('./pages/account/FavoriteQuotesPage.jsx'))
const MyDictionaryPage = lazy(() => import('./pages/account/MyDictionaryPage.jsx'))
const RecentlyViewedTermsPage = lazy(() => import('./pages/account/RecentlyViewedTermsPage.jsx'))
const PlaceholderPage = lazy(() => import('./pages/account/PlaceholderPage.jsx'))
const TestsPage = lazy(() => import('./pages/account/TestsPage.jsx'))
const StatisticsPage = lazy(() => import('./pages/account/StatisticsPage.jsx'))
const ForgotPasswordPage = lazy(() => import('./pages/account/auth/ForgotPasswordPage.jsx'))
const ResetPasswordPage = lazy(() => import('./pages/account/auth/ResetPasswordPage.jsx'))

// Old addresses of the two document tools now open them inside «Работа с
// документами»; the query (e.g. ?tab=mine of the constructor) is kept.
function RedirectKeepingQuery({ to }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}

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
              <Route path="/terms" element={<TermsCategoriesPage />} />
              <Route path="/terms/:id" element={<TermDetailPage />} />
              <Route path="/category/:key" element={<TermsListPage />} />
              <Route path="/not-to-confuse" element={<ConfusableTermsPage />} />
              <Route path="/term-map" element={<TermMapPage />} />
              <Route path="/abbreviations" element={<AbbreviationsPage />} />
              <Route path="/ministry" element={<MinistryPage />} />
              <Route path="/committees" element={<CommitteesPage />} />
              <Route path="/documents" element={<WorkspacePage />} />
              <Route path="/documents/check" element={<WorkspaceCheckPage />} />
              <Route path="/docs" element={<Navigate to="/documents/check" replace />} />
              <Route path="/quotes" element={<QuotesPage />} />
              <Route path="/quotes/:number" element={<QuoteDetailPage />} />
              <Route path="/account/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/account/reset-password" element={<ResetPasswordPage />} />
              <Route path="/account" element={<AccountLayout />}>
                <Route index element={<AccountHomePage />} />
                <Route
                  path="missions"
                  element={
                    <RequireAuth>
                      <MissionsIntroPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="missions/mission/:missionId"
                  element={
                    <RequireAuth>
                      <MissionDetailPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="missions/mission/:missionId/study"
                  element={
                    <RequireAuth>
                      <MissionStudyPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="missions/mission/:missionId/test"
                  element={
                    <RequireAuth>
                      <MissionTestPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="missions/mission/:missionId/execute"
                  element={
                    <RequireAuth>
                      <MissionExecutePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="profile"
                  element={
                    <RequireAuth>
                      <PlaceholderPage titleKey="profile" />
                    </RequireAuth>
                  }
                />
                <Route
                  path="terms"
                  element={
                    <RequireAuth>
                      <AccountTermsPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="terms/:id"
                  element={
                    <RequireAuth>
                      <AccountTermDetailPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="categories"
                  element={
                    <RequireAuth>
                      <AccountCategoriesPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="alphabet"
                  element={
                    <RequireAuth>
                      <AccountAlphabetPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="network"
                  element={
                    <RequireAuth>
                      <AccountNetworkPage />
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
                  path="viewing-history"
                  element={
                    <RequireAuth>
                      <RecentlyViewedTermsPage />
                    </RequireAuth>
                  }
                />
                {/* «Работа со служебными документами»: dashboard, create, catalog, documents, check, history. */}
                <Route path="workspace" element={<AccountWorkspacePage />} />
                <Route
                  path="workspace/create"
                  element={
                    <RequireAuth>
                      <AccountWorkspaceCreatePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="workspace/check"
                  element={
                    <RequireAuth>
                      <AccountWorkspaceCheckPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="workspace/documents"
                  element={
                    <RequireAuth>
                      <AccountMyDocumentsPage />
                    </RequireAuth>
                  }
                />
                <Route path="workspace/catalog" element={<AccountCatalogPage />} />
                <Route
                  path="workspace/history"
                  element={
                    <RequireAuth>
                      <AccountHistoryPage />
                    </RequireAuth>
                  }
                />
                <Route path="docs" element={<Navigate to="/account/workspace/check" replace />} />
                <Route path="documents" element={<RedirectKeepingQuery to="/account/workspace/create" />} />
                {/* «Мои рапорты» now live in «Мои документы» of the constructor. */}
                <Route path="smart-report" element={<Navigate to="/account/workspace/documents" replace />} />
                <Route
                  path="documents/new/:templateId"
                  element={
                    <RequireAuth>
                      <NewDocument />
                    </RequireAuth>
                  }
                />
                <Route
                  path="documents/:id"
                  element={
                    <RequireAuth>
                      <DocumentEditor />
                    </RequireAuth>
                  }
                />
                <Route
                  path="smart-report/new"
                  element={
                    <RequireAuth>
                      <SmartReportEditor />
                    </RequireAuth>
                  }
                />
                <Route
                  path="knowledge"
                  element={
                    <RequireAuth>
                      <KnowledgeBasePage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="smart-report/:id"
                  element={
                    <RequireAuth>
                      <SmartReportEditor />
                    </RequireAuth>
                  }
                />
                <Route
                  path="committees"
                  element={
                    <RequireAuth>
                      <AccountCommitteesPage />
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
      <AiConsentHost />
      <AIAssistant />
    </>
  )
}

export default App
